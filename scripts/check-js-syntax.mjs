import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const roots = ['src', 'scripts'];
const extensions = new Set(['.js', '.mjs']);
const files = [];

async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile() && extensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) files.push(path);
  }
}

for (const root of roots) await collect(root);

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${file}\n${result.stderr.trim()}`);
}

if (failures.length) {
  console.error(`JavaScript syntax check FAILED (${failures.length} file${failures.length === 1 ? '' : 's'}):\n`);
  console.error(failures.join('\n\n'));
  process.exit(1);
}

console.log(`✓ JavaScript syntax check passed: ${files.length} files parsed.`);
