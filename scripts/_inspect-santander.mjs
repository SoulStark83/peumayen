import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

const path = process.argv[2];
if (!path) { console.error("uso: node scripts/_inspect-santander.mjs <fichero>"); process.exit(1); }

const buf = readFileSync(path);
const wb = XLSX.read(buf, { type: "buffer", cellDates: true });

console.log("Hojas:", wb.SheetNames);
for (const name of wb.SheetNames) {
  const sh = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sh, { header: 1, raw: true, defval: null });
  console.log(`\n=== Hoja: "${name}" (${rows.length} filas) ===`);
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    console.log(i, JSON.stringify(rows[i]));
  }
  if (rows.length > 25) console.log(`... (${rows.length - 25} filas más)`);
}
