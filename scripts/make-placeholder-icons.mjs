// Genera iconos PNG placeholder sin dependencias externas.
// Producen un cuadrado oliva-oscuro con la letra P; sustituir por assets
// reales ejecutando `npm run pwa:icons` cuando haya logo.

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, "..", "public", "icons");

const BG = [10, 10, 10];
const FG = [255, 255, 255];

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, c]);
}

// Rasterizador mínimo de la letra "P" como marcador visual.
// No busca tipografía bonita, solo que algo distinga el icono.
function drawP(size) {
  const pixels = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3] = BG[0];
    pixels[i * 3 + 1] = BG[1];
    pixels[i * 3 + 2] = BG[2];
  }

  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.42;
  const stroke = size * 0.12;
  const x0 = cx - s * 0.4;
  const y0 = cy - s;
  const bowlR = s * 0.5;
  const bowlCx = x0 + bowlR - stroke / 2;
  const bowlCy = y0 + bowlR;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const stem = x >= x0 && x <= x0 + stroke && y >= y0 && y <= y0 + 2 * s;
      const dx = x - bowlCx;
      const dy = y - bowlCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const bowl = dist <= bowlR && dist >= bowlR - stroke;
      if (stem || bowl) {
        const i = (y * size + x) * 3;
        pixels[i] = FG[0];
        pixels[i + 1] = FG[1];
        pixels[i + 2] = FG[2];
      }
    }
  }
  return pixels;
}

function makePng(size) {
  const pixels = drawP(size);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = 1 + size * 3;
  const raw = Buffer.alloc(size * rowBytes);
  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0;
    raw.set(pixels.subarray(y * size * 3, (y + 1) * size * 3), y * rowBytes + 1);
  }
  const idat = deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(ICONS_DIR, { recursive: true });

const targets = [
  { size: 192, name: "icon-192.png" },
  { size: 384, name: "icon-384.png" },
  { size: 512, name: "icon-512.png" },
  { size: 512, name: "maskable-512.png" },
  { size: 180, name: "apple-touch-icon.png" },
];

for (const { size, name } of targets) {
  writeFileSync(join(ICONS_DIR, name), makePng(size));
  process.stdout.write(`wrote ${name} (${size}x${size})\n`);
}
