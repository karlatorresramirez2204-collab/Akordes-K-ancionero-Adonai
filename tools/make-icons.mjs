import fs from 'node:fs';
import zlib from 'node:zlib';

const outDir = new URL('../public/icons/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function makePng(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4; pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; pixels[i + 3] = color[3];
  };
  const fillRect = (x0, y0, x1, y1, color, radius = 0) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const dx = Math.max(x0 + radius - x, 0, x - (x1 - radius - 1));
      const dy = Math.max(y0 + radius - y, 0, y - (y1 - radius - 1));
      if (!radius || dx * dx + dy * dy <= radius * radius) set(x, y, color);
    }
  };
  const circle = (cx, cy, r, color) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, color); };
  const bg = [9, 9, 11, 255], gold = [245, 179, 36, 255], light = [255, 229, 132, 255], dark = [29, 24, 12, 255];
  fillRect(0, 0, size, size, bg);
  fillRect(size * .08, size * .08, size * .92, size * .92, dark, size * .16);
  const s = size / 512;
  fillRect(160 * s, 116 * s, 194 * s, 350 * s, gold, 12 * s); fillRect(154 * s, 108 * s, 202 * s, 144 * s, gold, 18 * s); circle(128 * s, 354 * s, 50 * s, gold);
  fillRect(308 * s, 78 * s, 342 * s, 312 * s, light, 12 * s); fillRect(302 * s, 70 * s, 350 * s, 146 * s, light, 18 * s); circle(276 * s, 316 * s, 50 * s, light);
  fillRect(122 * s, 388 * s, 394 * s, 414 * s, gold, 7 * s);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [192, 512]) fs.writeFileSync(new URL(`icon-${size}.png`, outDir), makePng(size));
