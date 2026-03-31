/**
 * Simple script to generate PWA icons using Node.js built-in modules
 * Creates PNG icons with a simple "M" logo using base64-encoded pixel data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a simple PNG with "M" letter
// PNG signature
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// Helper to create IHDR chunk
function createIHDR(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // color type (RGB)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace
  return createChunk('IHDR', ihdr);
}

// Calculate CRC32 for PNG chunks
function crc32(data) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Create a PNG chunk
function createChunk(type, data) {
  const chunk = Buffer.concat([
    Buffer.alloc(4),
    Buffer.from(type, 'ascii'),
    data
  ]);
  chunk.writeUInt32BE(data.length, 0);

  const crc = crc32(chunk.slice(4));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([chunk, crcBuffer]);
}

// Simple DEFLATE-like compression (uncompressed blocks)
function compress(data) {
  const MAX_BLOCK_SIZE = 65535;
  const blocks = [];

  for (let i = 0; i < data.length; i += MAX_BLOCK_SIZE) {
    const isLast = i + MAX_BLOCK_SIZE >= data.length;
    const blockSize = Math.min(MAX_BLOCK_SIZE, data.length - i);
    const block = data.slice(i, i + blockSize);

    const header = Buffer.alloc(5);
    header.writeUInt8(isLast ? 0x01 : 0x00, 0); // BFINAL
    header.writeUInt16LE(blockSize, 1); // LEN
    header.writeUInt16LE(~blockSize & 0xFFFF, 3); // NLEN

    blocks.push(header, block);
  }

  return Buffer.concat([
    Buffer.from([0x78, 0x9C]), // zlib header
    ...blocks,
    Buffer.alloc(4) // adler32 placeholder (zeros acceptable for our use case)
  ]);
}

// Create IDAT chunk from raw pixel data
function createIDAT(pixels, width, height) {
  // Add filter byte (0) at start of each row
  const rowSize = width * 3 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 3;
      const dstIdx = y * rowSize + 1 + x * 3;
      rawData[dstIdx] = pixels[srcIdx];     // R
      rawData[dstIdx + 1] = pixels[srcIdx + 1]; // G
      rawData[dstIdx + 2] = pixels[srcIdx + 2]; // B
    }
  }

  const compressed = compress(rawData);
  return createChunk('IDAT', compressed);
}

// Create IEND chunk
function createIEND() {
  return createChunk('IEND', Buffer.alloc(0));
}

// Generate pixel data for "M" icon
function generateMIcon(size) {
  const pixels = Buffer.alloc(size * size * 3);
  const centerX = size / 2;
  const centerY = size / 2;
  const mWidth = size * 0.6;
  const mHeight = size * 0.5;
  const strokeWidth = size * 0.12;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 3;
      const dx = x - centerX;
      const dy = y - centerY;

      // Background: white
      let r = 255, g = 255, b = 255;

      // Draw "M" letter using simple line equations
      // M consists of 4 strokes: left vertical, left diagonal, right diagonal, right vertical
      const relY = dy + mHeight / 2;
      const mTop = centerY - mHeight / 2;
      const mBottom = centerY + mHeight / 2;

      // Left vertical stroke
      if (x >= centerX - mWidth / 2 && x <= centerX - mWidth / 2 + strokeWidth &&
          y >= mTop && y <= mBottom) {
        r = 0; g = 0; b = 0; // Black
      }
      // Right vertical stroke
      else if (x >= centerX + mWidth / 2 - strokeWidth && x <= centerX + mWidth / 2 &&
               y >= mTop && y <= mBottom) {
        r = 0; g = 0; b = 0; // Black
      }
      // Left diagonal (up to middle)
      else if (x > centerX - mWidth / 2 + strokeWidth && x < centerX) {
        const expectedY = mBottom - (x - (centerX - mWidth / 2)) * (mHeight / (mWidth / 2));
        if (Math.abs(y - expectedY) < strokeWidth / 2 && y >= centerY - mHeight / 4) {
          r = 0; g = 0; b = 0; // Black
        }
      }
      // Right diagonal (up to middle)
      else if (x >= centerX && x < centerX + mWidth / 2 - strokeWidth) {
        const expectedY = mTop + (x - centerX) * (mHeight / (mWidth / 2));
        if (Math.abs(y - expectedY) < strokeWidth / 2 && y <= centerY - mHeight / 4) {
          r = 0; g = 0; b = 0; // Black
        }
      }

      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
    }
  }

  return pixels;
}

// Create PNG file
function createPNG(size, outputPath) {
  const pixels = generateMIcon(size);
  const png = Buffer.concat([
    PNG_SIGNATURE,
    createIHDR(size, size),
    createIDAT(pixels, size, size),
    createIEND()
  ]);

  fs.writeFileSync(outputPath, png);
  console.log(`Created: ${outputPath} (${size}x${size})`);
}

// Main
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

createPNG(192, path.join(publicDir, 'icon-192.png'));
createPNG(512, path.join(publicDir, 'icon-512.png'));

console.log('PWA icons generated successfully!');
