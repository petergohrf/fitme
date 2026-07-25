// One-time script to generate placeholder PNG icons for the Chrome extension.
// Run with: node extension/assets/make-icons.js
// Uses only built-in Node.js modules (no npm required).

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 lookup table (standard PNG requirement)
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const lenB = Buffer.alloc(4);
  lenB.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeB, data]);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenB, typeB, data, crcB]);
}

// Creates a solid-color RGB PNG of given size
function createSolidPNG(size, r, g, b) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR: width, height, bit-depth=8, color-type=2 (RGB), compression=0, filter=0, interlace=0
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(2, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  // Raw image data: one filter byte (None=0) per row, then RGB pixels
  const rawRows = [];
  for (let y = 0; y < size; y++) {
    rawRows.push(0x00);
    for (let x = 0; x < size; x++) {
      rawRows.push(r, g, b);
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawRows));

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// FitMe brand colour: indigo #4f46e5 = rgb(79, 70, 229)
const R = 0x4f, G = 0x46, B = 0xe5;

const outDir = __dirname;
for (const size of [16, 48, 128]) {
  const filename = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(filename, createSolidPNG(size, R, G, B));
  console.log(`Created ${filename} (${size}x${size})`);
}
