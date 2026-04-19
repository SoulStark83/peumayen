#!/usr/bin/env node
/**
 * Reclasifica los movimientos ya importados de `source: santander-hist`
 * aplicando las reglas actuales de category-rules.mjs.
 *
 * Uso:
 *   node scripts/reclassify-santander.mjs            # dry-run (muestra cambios)
 *   node scripts/reclassify-santander.mjs --commit   # aplica UPDATEs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { classify } from "./category-rules.mjs";

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
const SOURCE = "santander-hist";
const commit = process.argv.includes("--commit");

if (!SUPABASE_URL || !SERVICE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Paginación manual (Supabase limita a 1000 por query por defecto)
const items = [];
const PAGE = 1000;
for (let from = 0; ; from += PAGE) {
  const { data, error } = await admin
    .from("items")
    .select("id, description, data")
    .eq("type", "transaction")
    .contains("data", { source: SOURCE })
    .order("id", { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) { console.error("leyendo items:", error.message); process.exit(1); }
  if (!data?.length) break;
  items.push(...data);
  if (data.length < PAGE) break;
}

console.log(`Leídos ${items.length} movimientos de source=${SOURCE}.\n`);

const changes = [];
for (const it of items) {
  const concepto = it.description ?? it.data?.merchant_raw ?? "";
  const amount = Number(it.data?.amount ?? 0);
  const next = classify(concepto, amount);
  const cur = {
    category: it.data?.category,
    subcategory: it.data?.subcategory,
    kind: it.data?.kind,
  };
  if (
    cur.category !== next.category ||
    cur.subcategory !== next.subcategory ||
    cur.kind !== next.kind
  ) {
    changes.push({ id: it.id, concepto, amount, cur, next, data: it.data });
  }
}

console.log(`Cambios detectados: ${changes.length}\n`);

// Resumen por tipo de cambio
const summary = new Map();
for (const c of changes) {
  const k = `${c.cur.category}/${c.cur.subcategory}/${c.cur.kind}  →  ${c.next.category}/${c.next.subcategory}/${c.next.kind}`;
  const entry = summary.get(k) ?? { count: 0, total: 0 };
  entry.count++;
  entry.total += c.amount;
  summary.set(k, entry);
}
const sorted = [...summary.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [k, v] of sorted) {
  console.log(`  ${String(v.count).padStart(4)}  ${v.total.toFixed(2).padStart(12)} €   ${k}`);
}

// Muestras
console.log(`\n=== Muestras (primeras 20) ===`);
for (const c of changes.slice(0, 20)) {
  console.log(`  [${c.cur.kind}→${c.next.kind}] ${c.amount.toFixed(2).padStart(10)} €  ${c.concepto.slice(0, 70)}`);
}

if (!commit) {
  console.log("\n[dry-run] No se ha tocado la base de datos. Ejecuta con --commit para aplicar.");
  process.exit(0);
}

// Aplicar UPDATEs uno a uno (no hay bulk update de jsonb)
console.log(`\nAplicando ${changes.length} updates...`);
let done = 0;
for (const c of changes) {
  const newData = { ...c.data, category: c.next.category, subcategory: c.next.subcategory, kind: c.next.kind };
  const { error: uErr } = await admin.from("items").update({ data: newData }).eq("id", c.id);
  if (uErr) { console.error(`update ${c.id}:`, uErr.message); process.exit(1); }
  done++;
  if (done % 50 === 0) process.stdout.write(`  ${done}/${changes.length}\r`);
}
console.log(`\n✅ ${done} movimientos reclasificados.`);
