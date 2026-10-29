import fs from 'node:fs';
import path from 'node:path';

// Glob imports can emit original JPGs alongside the optimized variants.
// Only remove generated wedding originals that no built text asset references.
const output = fs.realpathSync(new URL('../dist', import.meta.url));
const assets = path.join(output, '_astro');
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt', '.webmanifest', '.map']);
const references = [];
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Unexpected symlink in build output');
    if (entry.isDirectory()) scan(file);
    else if (textExtensions.has(path.extname(file))) references.push(fs.readFileSync(file, 'utf8'));
  }
}
scan(output);
let count = 0, bytes = 0;
for (const name of fs.readdirSync(assets)) {
  if (!/^DSC01\d+\.[\w-]+\.jpg$/i.test(name) || references.some(text => text.includes(name))) continue;
  const file = fs.realpathSync(path.join(assets, name));
  if (path.dirname(file) !== assets) throw new Error('Generated asset escaped the build directory');
  bytes += fs.statSync(file).size;
  fs.unlinkSync(file);
  count++;
}
console.log(`Omitted ${count} unused generated JPG originals (${(bytes / 1024 / 1024).toFixed(1)} MiB); source photos preserved.`);
