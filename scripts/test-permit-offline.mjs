import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
test('fresh offline installation contains every transitive permit-wallet module',()=>{
  const sw=readFileSync('src/sw.js','utf8'),seen=new Set();
  function visit(path){if(seen.has(path))return;seen.add(path);const source=readFileSync('src'+path,'utf8');
    for(const m of source.matchAll(/(?:from\s*|import\(\s*)['"](\.[^'"]+\.m?js)['"]/g))visit(posix.normalize(posix.join(posix.dirname(path),m[1])));
  }
  visit('/assets/permits/app.mjs');visit('/assets/permits/phone-check.mjs');
  const missing=[...seen].filter(p=>!sw.includes(`'${p}'`)&&!sw.includes(`"${p}"`));
  assert.deepEqual(missing,[],`Offline shell missing ${missing.join(', ')}`);
  assert.match(sw,/url\.origin!==location\.origin/);assert.match(sw,/url\.pathname==='\/config\.js'/);
});
