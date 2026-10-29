import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
await fs.mkdir(path.join(publicDir, 'icons'), { recursive: true });
await fs.mkdir(path.join(publicDir, 'images'), { recursive: true });
const seal = await sharp(path.join(root, 'src/assets/monogram-da-engraved.png')).trim().png().toBuffer();

// Render the existing cover design, retaining the original monogram artwork.
function coverSvg(width, height) {
  const middle = width / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="left"><stop stop-color="#253d2e"/><stop offset=".82" stop-color="#324c3b"/><stop offset="1" stop-color="#263f30"/></linearGradient>
      <linearGradient id="right"><stop stop-color="#3d5340"/><stop offset=".7" stop-color="#415743"/><stop offset="1" stop-color="#344d3b"/></linearGradient>
      <radialGradient id="light"><stop stop-color="#c5caa6" stop-opacity=".12"/><stop offset="1" stop-color="#c5caa6" stop-opacity="0"/></radialGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" stitchTiles="stitch" seed="12"/><feColorMatrix type="saturate" values="0"/></filter>
    </defs>
    <path fill="url(#left)" d="M0 0h${middle}v${height}H0z"/><path fill="url(#right)" d="M${middle} 0h${middle}v${height}H${middle}z"/>
    <rect width="${width}" height="${height}" fill="url(#light)"/>
    <rect width="${width}" height="${height}" filter="url(#grain)" opacity=".10"/>
    <path d="M${middle} 0v${height}" stroke="#101b13" stroke-width="${width > 600 ? 3 : 2}"/>
  </svg>`);
}
async function cover(width, height, sealHeight) {
  const image = await sharp(seal).resize({ height: sealHeight }).toBuffer();
  return sharp(coverSvg(width, height)).composite([{ input: image, gravity: 'centre' }]);
}
// Render from the original seal at 2x resolution; preserve fine engraved lines.
await (await cover(2400, 1260, 940)).jpeg({ quality: 98, chromaSubsampling: '4:4:4', mozjpeg: true }).toFile(path.join(publicDir, 'images/wedding-share-v2.jpg'));
// Square source: crop-safe on round home-screen icons, emblem fills small favicons.
const iconMaster = await (await cover(512, 512, 446)).png().toBuffer();
for (const [size, filename] of [[32, 'favicon-32x32.png'], [180, 'apple-touch-icon.png'], [192, 'icons/icon-192.png'], [512, 'icons/icon-512.png']]) {
  await sharp(iconMaster).resize(size, size).png().toFile(path.join(publicDir, filename));
}
// ICO with uncompressed 32-bit DIB entries for broad browser/Windows support.
const sizes = [16, 32, 48, 64];
const entries = [];
for (const size of sizes) {
  const pixels = await sharp(iconMaster).resize(size, size).ensureAlpha().raw().toBuffer();
  const maskStride = Math.ceil(size / 32) * 4;
  const dib = Buffer.alloc(40 + size * size * 4 + maskStride * size);
  dib.writeUInt32LE(40, 0); dib.writeInt32LE(size, 4); dib.writeInt32LE(size * 2, 8);
  dib.writeUInt16LE(1, 12); dib.writeUInt16LE(32, 14); dib.writeUInt32LE(size * size * 4, 20);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const src = (y * size + x) * 4;
    const dst = 40 + ((size - 1 - y) * size + x) * 4;
    dib[dst] = pixels[src + 2]; dib[dst + 1] = pixels[src + 1]; dib[dst + 2] = pixels[src]; dib[dst + 3] = pixels[src + 3];
  }
  entries.push(dib);
}
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const at = 6 + i * 16;
  header[at] = size; header[at + 1] = size;
  header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(entries[i].length, at + 8); header.writeUInt32LE(offset, at + 12);
  offset += entries[i].length;
});
await fs.writeFile(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, ...entries]));
console.log('Generated cover share image 2400x1260 (quality 98, 4:4:4), ICO 16/32/48/64, Apple and web icons.');
