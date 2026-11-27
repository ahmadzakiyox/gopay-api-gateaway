import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../src/studio-dashboard.css', import.meta.url)), 'utf8');

test('mobile status metrics use a consistent vertical label/value layout', () => {
  assert.match(css, /\.analytics-metrics \.studio-metric:nth-child\(3\)\{[^}]*display:flex;flex-direction:column;align-items:flex-start;justify-content:center\}/);
  assert.match(css, /\.analytics-metrics \.studio-metric:nth-child\(4\)\{[^}]*display:flex;flex-direction:column;align-items:flex-start;justify-content:center\}/);
});
