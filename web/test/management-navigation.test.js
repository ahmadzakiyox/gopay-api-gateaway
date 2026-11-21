import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const mainPath = fileURLToPath(new URL('../src/main.jsx', import.meta.url));
const source = readFileSync(mainPath, 'utf8');

test('GoPay Management imports the navigation component it renders', () => {
  assert.match(source, /import\s*\{[^}]*\bWorkspaceNav\b[^}]*\}\s*from\s*['"]\.\/TransactionDashboard['"]/);
  assert.match(source, /<WorkspaceNav\s+management\s+onLogout=\{logout\}\s*\/>/);
});
