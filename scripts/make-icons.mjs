/**
 * Generates the PWA icons without any image dependency:
 * a minimal PNG encoder (zlib + CRC32) plus a tiny supersampled rasterizer
 * for a black rounded square with a white check mark.
 *
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const PUBLIC_DIR = resolve(OUT_DIR, '..');

/* ------------------------------- PNG encoder ------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolor + alpha
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* -------------------------------- rendering ------------------------------- */

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function insideRoundedSquare(x, y, size, radius) {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const r = radius;
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  return Math.hypot(x - cx, y - cy) <= r;
}

/** Palette matches the dark theme: page background + accent blue. */
const BG = [0x14, 0x14, 0x18];
const INK = [0x67, 0x9e, 0xfe];

/** Premultiplied-average supersampling of "dark square + accent check". */
function renderCheckIcon(size, maskable) {
  const samples = 4;
  const radius = maskable ? 0 : size * 0.22;
  const scale = maskable ? 0.68 : 1;
  const place = (value) => (0.5 + (value - 0.5) * scale) * size;
  const stroke = size * 0.085 * scale;

  const a = [place(0.27), place(0.53)];
  const b = [place(0.44), place(0.71)];
  const c = [place(0.75), place(0.33)];

  const buffer = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          const isCheck =
            distanceToSegment(px, py, a[0], a[1], b[0], b[1]) <= stroke / 2 ||
            distanceToSegment(px, py, b[0], b[1], c[0], c[1]) <= stroke / 2;
          const isSquare = maskable || insideRoundedSquare(px, py, size, radius);

          if (isCheck && isSquare) {
            sumR += INK[0];
            sumG += INK[1];
            sumB += INK[2];
            sumA += 255;
          } else if (isSquare) {
            sumR += BG[0];
            sumG += BG[1];
            sumB += BG[2];
            sumA += 255;
          }
        }
      }

      const total = samples * samples;
      const alpha = sumA / total;
      const index = (y * size + x) * 4;
      if (alpha <= 0) continue;
      // Unpremultiply so the PNG stores straight (non-premultiplied) colors.
      buffer[index] = Math.round(sumR / total / (alpha / 255));
      buffer[index + 1] = Math.round(sumG / total / (alpha / 255));
      buffer[index + 2] = Math.round(sumB / total / (alpha / 255));
      buffer[index + 3] = Math.round(alpha);
    }
  }

  return encodePng(size, size, buffer);
}

/** 1200x630 social preview: flat dark canvas with the accent check, no text needed. */
function renderOgImage(width, height) {
  const samples = 3;
  const box = Math.round(height * 0.66);
  const left = (width - box) / 2;
  const top = (height - box) / 2;
  const place = (u, v) => [left + u * box, top + v * box];
  const a = place(0.24, 0.53);
  const b = place(0.44, 0.73);
  const c = place(0.77, 0.3);
  const stroke = box * 0.11;

  // Fast path: everything outside the check's bounding box is flat background.
  const minX = Math.floor(left + 0.2 * box - stroke);
  const maxX = Math.ceil(left + 0.8 * box + stroke);
  const minY = Math.floor(top + 0.25 * box - stroke);
  const maxY = Math.ceil(top + 0.78 * box + stroke);

  const buffer = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      let coverage = 0;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        let hits = 0;
        for (let sy = 0; sy < samples; sy += 1) {
          for (let sx = 0; sx < samples; sx += 1) {
            const px = x + (sx + 0.5) / samples;
            const py = y + (sy + 0.5) / samples;
            const onCheck =
              distanceToSegment(px, py, a[0], a[1], b[0], b[1]) <= stroke / 2 ||
              distanceToSegment(px, py, b[0], b[1], c[0], c[1]) <= stroke / 2;
            if (onCheck) hits += 1;
          }
        }
        coverage = hits / (samples * samples);
      }
      // Opaque background with the check blended on top.
      buffer[index] = Math.round(BG[0] + (INK[0] - BG[0]) * coverage);
      buffer[index + 1] = Math.round(BG[1] + (INK[1] - BG[1]) * coverage);
      buffer[index + 2] = Math.round(BG[2] + (INK[2] - BG[2]) * coverage);
      buffer[index + 3] = 255;
    }
  }

  return encodePng(width, height, buffer);
}

/* ---------------------------------- main ---------------------------------- */

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: 'icon-180.png', size: 180, maskable: false },
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'maskable-512.png', size: 512, maskable: true },
];

for (const target of targets) {
  const png = renderCheckIcon(target.size, target.maskable);
  writeFileSync(resolve(OUT_DIR, target.file), png);
  console.log(`${target.file} — ${target.size}x${target.size}, ${png.length} bytes`);
}

// Social preview (Open Graph / Twitter card).
const og = renderOgImage(1200, 630);
writeFileSync(resolve(PUBLIC_DIR, 'og.png'), og);
console.log(`og.png — 1200x630, ${og.length} bytes`);
