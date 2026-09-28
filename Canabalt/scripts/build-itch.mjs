import { mkdir, readdir, readFile, writeFile, rm, copyFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { RONIN_ANIMATIONS } from '../src/game/ronin.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist/itch');
const archive = join(root, 'dist/rooftop-itch.zip');

// Explicit release inputs keep private files, tests and unused artwork out.
const files = new Map([
  ['index.html', 'index.html'],
  ['favicon.svg', 'favicon.svg'],
  ['CREDITS.md', 'CREDITS.md'],
  ['src/demo.js', 'src/demo.js'],
]);
for (const entry of await readdir(join(root, 'src/game'), { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.js')) files.set(`src/game/${entry.name}`, `src/game/${entry.name}`);
}
async function addTree(directory) {
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await addTree(path);
    else files.set(path, path);
  }
}
await addTree('src/game/assets/kenney');
await addTree('src/game/assets/icons');
for (const { file } of Object.values(RONIN_ANIMATIONS)) {
  const path = `src/game/assets/ronin/${file}`;
  files.set(path, path);
}
files.set('src/game/assets/ronin/SOURCES.md', 'src/game/assets/ronin/SOURCES.md');

// Standard ZIP, using Node's built-in DEFLATE; no npm packages or system zip required.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const entries = [];
const directory = [];
let offset = 0;
await mkdir(join(root, 'dist'), { recursive: true });
await rm(archive, { force: true });
await rm(output, { recursive: true, force: true });
for (const [target, source] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
  const destination = join(output, target);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(root, source), destination);
  const bytes = await readFile(destination);
  const packed = deflateRawSync(bytes, { level: 9 });
  const name = Buffer.from(target);
  const checksum = crc32(bytes);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6); // UTF-8 names
  header.writeUInt16LE(8, 8); // DEFLATE
  header.writeUInt16LE(0x21, 12); // Deterministic DOS date: 1980-01-01
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(packed.length, 18);
  header.writeUInt32LE(bytes.length, 22);
  header.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  header.copy(central, 6, 4, 30);
  central.writeUInt32LE(offset, 42);
  directory.push(central, name);
  entries.push(header, name, packed);
  offset += header.length + name.length + packed.length;
}
const central = Buffer.concat(directory);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.size, 8);
end.writeUInt16LE(files.size, 10);
end.writeUInt32LE(central.length, 12);
end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...entries, central, end]);
await writeFile(archive, zip);
console.log(`Created ${relative(root, archive)} (${(zip.length / 1024).toFixed(1)} KB, ${files.size} files).`);
console.log('Upload this ZIP to itch.io as an HTML game. Instructions: docs/ITCH_IO.md');
