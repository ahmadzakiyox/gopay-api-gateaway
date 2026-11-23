import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dashboardPath = fileURLToPath(new URL('../src/StudioTransactionDashboard.jsx', import.meta.url));
const source = readFileSync(dashboardPath, 'utf8');

test('Studio dashboard uses an explicitly imported app navigation component', () => {
  assert.match(source, /import\s*\{\s*Header\s*\}\s*from\s*['"]\.\/components\/Header['"]/);
  assert.match(source, /<Header\s+onLogout=\{logout\}/);
  assert.doesNotMatch(source, /<Navigation(?:\s|\/|>)/);
});
