import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const mainPath = fileURLToPath(new URL('../src/main.jsx', import.meta.url));
const source = readFileSync(mainPath, 'utf8');

test('GoPay Management imports the navigation component it renders', () => {
  assert.match(source, /import\s*\{[^}]*\bHeader\b[^}]*\}\s*from\s*['"]\.\/components\/Header['"]/);
  assert.match(source, /<Header\s+management\s+onLogout=\{logout\}/);
});
