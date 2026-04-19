import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

const path = process.argv[2];
if (!path) { console.error("uso: node scripts/_analyze-santander.mjs <fichero>"); process.exit(1); }

const wb = XLSX.read(readFileSync(path), { type: "buffer", cellDates: true });
const sh = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sh, { header: 1, raw: true, defval: null });

// Headers at row 7, data starts at 8
const data = rows.slice(8).filter((r) => r[0] && r[2]);

// Normalize concept → try to extract the merchant
function normalizeMerchant(concept) {
  let s = String(concept).toLowerCase();
  // Remove card info
  s = s.replace(/tarj(eta)?\.?\s*:?\s*\*?\d+/g, "");
  s = s.replace(/tarjeta\s+\d+/g, "");
  s = s.replace(/comision\s+[\d.,]+/g, "");
  // Remove trailing location (, Madrid Es, , Alcorcon Es...)
  s = s.replace(/,\s*[a-záéíóúñ\s]+\s+es\b/g, "");
  s = s.replace(/,\s*luxembourg/g, "");
  s = s.replace(/,\s*mostoles/g, "");
  // Remove prefix verbs
  s = s.replace(/^(pago movil en|compra(\s+internet)?\s+en|compra|transferencia\s+(inmediata\s+)?(de|a favor de)|recibo|bizum\s+(enviado a|recibido de))\s+/g, "");
  // Collapse spaces, trim punctuation
  s = s.replace(/[\s,.]+$/g, "").replace(/\s+/g, " ").trim();
  return s;
}

// Group by prefix (first 3-4 tokens of concept)
const merchantCount = new Map();
const totalsByMerchant = new Map();
for (const r of data) {
  const [, , concept, amount] = r;
  const merchant = normalizeMerchant(concept).split(" ").slice(0, 3).join(" ");
  merchantCount.set(merchant, (merchantCount.get(merchant) ?? 0) + 1);
  totalsByMerchant.set(merchant, (totalsByMerchant.get(merchant) ?? 0) + Number(amount));
}

const sorted = [...merchantCount.entries()]
  .map(([m, c]) => ({ merchant: m, count: c, total: totalsByMerchant.get(m) }))
  .sort((a, b) => b.count - a.count);

console.log(`Total filas: ${data.length}`);
console.log(`Comercios únicos (normalizados, 3 primeras palabras): ${sorted.length}\n`);
console.log("TOP 80 por frecuencia:");
console.log("freq\ttotal\tmerchant");
for (const r of sorted.slice(0, 80)) {
  console.log(`${r.count}\t${r.total.toFixed(2)}\t${r.merchant}`);
}
console.log("\n--- Los que mueven más dinero (top 40 por |suma|) ---");
const byTotal = [...sorted].sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
for (const r of byTotal.slice(0, 40)) {
  console.log(`${r.count}\t${r.total.toFixed(2)}\t${r.merchant}`);
}
