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

test('QRIS card accepts an image upload and decodes the payload instead of a text field', () => {
  assert.match(source, /function QrisCard\(/);
  assert.match(source, /type="file"/);
  assert.match(source, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(source, /readQrisFromImage/);
  assert.doesNotMatch(source, /htmlFor="qris"/);
  assert.doesNotMatch(source, /gpy-textarea/);
});

test('QRIS save still calls the existing /api/qris endpoint with staticQris', () => {
  assert.match(source, /request\('\/api\/qris',\s*\{\s*method:\s*'PUT',\s*body:\s*JSON\.stringify\(\{\s*staticQris:/);
});

test('simulation card polls the same payment endpoints and shows a countdown', () => {
  assert.match(source, /request\('\/api\/v1\/payments'/);
  assert.match(source, /request\(`\/api\/payments\/\$\{payment\.trxId\}`\)/);
  assert.match(source, /gpy-sim-progress/);
});
