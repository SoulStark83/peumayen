#!/usr/bin/env node
/**
 * Importa movimientos del extracto de CaixaBank (.xls) a la tabla `items`.
 *
 * Uso:
 *   node scripts/import-caixa.mjs <fichero.xls>            # dry-run, no toca DB
 *   node scripts/import-caixa.mjs <fichero.xls> --commit   # inserta
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *
 * Convenciones:
 *   - type=transaction, scope=couple, source=caixa-hist
 *   - kind: 'expense' | 'income' | 'transfer' (derivado de reglas o del signo)
 *   - Dedup por (source + value_date + amount + merchant_raw) → idempotente
 *   - title = merchant bonito. description = concepto original.
 */
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { classify, prettyMerchant } from "./category-rules.mjs";

// --- .env.local loader ---
function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!(k in process.env)) process.env[k] = v.replace(/^"(.*)"$/, "$1");
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SOURCE = "caixa-hist";
const SCOPE = "couple";

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const commit = args.includes("--commit");

if (!filePath) {
  console.error("Uso: node scripts/import-caixa.mjs <fichero.xls> [--commit]");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- Parse XLS ---
// CaixaBank exporta fechas como números seriales Excel (ej. 46132 = 19/04/2026)
const wb = XLSX.read(readFileSync(filePath), { type: "buffer", cellDates: false });
const sh = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sh, { header: 1, raw: true, defval: null });

// Fila 0: título de cuenta, Fila 1: "Importes en euros", Fila 2: headers
// Datos desde fila 3
const dataRows = rows.slice(3).filter((r) => r[0] != null && r[2] != null && r[4] != null);

function excelSerialToISO(serial) {
  // Excel serial: días desde 1900-01-00 (con bug del año bisiesto 1900)
  const date = XLSX.SSF.parse_date_code(serial);
  const y = String(date.y).padStart(4, "0");
  const m = String(date.m).padStart(2, "0");
  const d = String(date.d).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// --- Detectar hogar + un usuario admin ---
const { data: households, error: hhErr } = await admin.from("households").select("id, name");
if (hhErr || !households?.length) { console.error("Error hogares:", hhErr?.message); process.exit(1); }
if (households.length > 1) { console.error("Más de un hogar, aborto."); process.exit(1); }
const household = households[0];

const { data: adminMember } = await admin
  .from("household_members")
  .select("id, user_id, display_name")
  .eq("household_id", household.id)
  .eq("role", "admin")
  .order("created_at", { ascending: true })
  .limit(1)
  .single();

console.log(`Hogar: ${household.name}`);
console.log(`Created_by: ${adminMember.display_name} (${adminMember.id})`);
console.log(`Fichero: ${filePath}`);
console.log(`Modo: ${commit ? "COMMIT (insertará en DB)" : "dry-run (no toca DB)"}\n`);
console.log(`Filas leídas: ${dataRows.length}\n`);

// --- Cargar existentes del mismo source para dedup ---
const { data: existing, error: exErr } = await admin
  .from("items")
  .select("data, due_at")
  .eq("household_id", household.id)
  .eq("type", "transaction")
  .contains("data", { source: SOURCE });
if (exErr) { console.error("leyendo existentes:", exErr.message); process.exit(1); }

const existingKeys = new Set(
  (existing ?? []).map((i) => {
    const d = i.data ?? {};
    return `${d.value_date ?? i.due_at?.slice(0, 10)}|${d.amount}|${d.merchant_raw ?? ""}`;
  }),
);
console.log(`Ya existen ${existingKeys.size} movimientos de source=${SOURCE} en DB.\n`);

// --- Construir payloads + estadísticas ---
const toInsert = [];
const statsByCat = new Map();
const unclassified = [];
let skippedDup = 0;

for (const r of dataRows) {
  // Columnas: Fecha | Fecha valor | Movimiento | Más datos | Importe | Saldo
  const [fechaOp, fechaValor, movimiento, masDatos, importeRaw, saldoRaw] = r;

  const due_at = excelSerialToISO(fechaOp);
  const value_date = excelSerialToISO(fechaValor ?? fechaOp);
  const amount = Number(importeRaw);
  const balance_after = saldoRaw != null ? Number(saldoRaw) : null;

  // Concepto = "Movimiento" + opcionalmente "Más datos"
  const concepto = masDatos
    ? `${movimiento} ${masDatos}`.trim()
    : String(movimiento).trim();

  const { category, subcategory, kind } = classify(concepto, amount);
  const merchant = prettyMerchant(movimiento);
  const key = `${value_date}|${amount}|${movimiento}`;

  const statKey = `${category}/${subcategory}`;
  const entry = statsByCat.get(statKey) ?? { count: 0, total: 0 };
  entry.count++;
  entry.total += amount;
  statsByCat.set(statKey, entry);

  if (category === "otros" && subcategory === "sin_clasificar" && unclassified.length < 40) {
    unclassified.push({ concept: concepto, amount });
  }

  if (existingKeys.has(key)) {
    skippedDup++;
    continue;
  }

  toInsert.push({
    household_id: household.id,
    type: "transaction",
    scope: SCOPE,
    title: merchant,
    description: concepto,
    due_at: `${due_at}T12:00:00+00:00`,
    created_by: adminMember.id,
    data: {
      amount,
      kind,
      category,
      subcategory,
      source: SOURCE,
      merchant,
      merchant_raw: movimiento,
      value_date,
      balance_after,
    },
  });
}

// --- Informe ---
console.log("=== Categorización ===");
const sorted = [...statsByCat.entries()].sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total));
let total = 0;
for (const [k] of sorted) total += statsByCat.get(k).count;
for (const [k, v] of sorted) {
  const pct = ((v.count / total) * 100).toFixed(1);
  console.log(`  ${k.padEnd(35)}  ${String(v.count).padStart(4)}  ${v.total.toFixed(2).padStart(12)} €  ${pct.padStart(5)}%`);
}

const uncCount = statsByCat.get("otros/sin_clasificar")?.count ?? 0;
console.log(`\nTotal: ${dataRows.length}  |  Categorizadas: ${dataRows.length - uncCount} (${((1 - uncCount / dataRows.length) * 100).toFixed(1)}%)  |  Sin clasificar: ${uncCount}`);

if (unclassified.length) {
  console.log(`\n=== Muestras sin clasificar (primeras ${unclassified.length}) ===`);
  for (const u of unclassified) {
    console.log(`  ${u.amount.toFixed(2).padStart(10)} €  ${u.concept.slice(0, 90)}`);
  }
}

console.log(`\nA insertar: ${toInsert.length}  |  Duplicados omitidos: ${skippedDup}`);

if (!commit) {
  console.log("\n[dry-run] No se ha tocado la base de datos. Ejecuta con --commit para insertar.");
  process.exit(0);
}

// --- Insertar en lotes ---
console.log(`\nInsertando ${toInsert.length} en lotes de 500...`);
const BATCH = 500;
let inserted = 0;
for (let i = 0; i < toInsert.length; i += BATCH) {
  const chunk = toInsert.slice(i, i + BATCH);
  const { error } = await admin.from("items").insert(chunk);
  if (error) { console.error(`batch ${i}:`, error.message); process.exit(1); }
  inserted += chunk.length;
  process.stdout.write(`  ${inserted}/${toInsert.length}\r`);
}
console.log(`\n✅ ${inserted} movimientos insertados.`);
