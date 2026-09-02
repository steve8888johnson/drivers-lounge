import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const roots = ['src', 'scripts'];
const extensions = new Set(['.js', '.mjs']);
const files = [];
const htmlFiles = [];

async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile() && extensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) files.push(path);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(path);
  }
}

for (const root of roots) await collect(root);

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${file}\n${result.stderr.trim()}`);
}

let inlineScripts = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  let index = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const [, attributes, source] = match;
    if (/\bsrc\s*=/i.test(attributes) || !source.trim()) continue;
    const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
    index += 1;
    inlineScripts += 1;
    const args = type === 'module' ? ['--input-type=module', '--check'] : ['--check'];
    const result = spawnSync(process.execPath, args, { input: source, encoding: 'utf8' });
    if (result.status !== 0) failures.push(`${file} inline script ${index}\n${result.stderr.trim()}`);
  }
}

if (failures.length) {
  console.error(`JavaScript syntax check FAILED (${failures.length} file${failures.length === 1 ? '' : 's'}):\n`);
  console.error(failures.join('\n\n'));
  process.exit(1);
}

console.log(`✓ JavaScript syntax check passed: ${files.length} files and ${inlineScripts} inline scripts parsed.`);
