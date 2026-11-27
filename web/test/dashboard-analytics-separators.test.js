import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../src/studio-dashboard.css', import.meta.url)), 'utf8');

test('mobile analytics statuses have separators on both sides of Pending', () => {
  assert.match(css, /\.analytics-metrics \.studio-metric:nth-child\(3\),\.analytics-metrics \.studio-metric:nth-child\(4\)\{border-left:1px solid var\(--studio-border\);border-right:0\}/);
});
