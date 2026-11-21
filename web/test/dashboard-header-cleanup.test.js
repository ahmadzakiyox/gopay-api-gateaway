import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dashboardPath = fileURLToPath(new URL('../src/StudioTransactionDashboard.jsx', import.meta.url));
const source = readFileSync(dashboardPath, 'utf8');

test('dashboard omits the requested heading copy and refresh control', () => {
  assert.doesNotMatch(source, /WORKSPACE \/ DASHBOARD|<h1>Ringkasan pembayaran<\/h1>|Pantau performa pembayaran dan aktivitas transaksi\./);
  assert.doesNotMatch(source, /studio-icon-button|aria-label="Perbarui data"|<RefreshCw|studio-updated|studio-page-header/);
});
test('dashboard analytics layout assertion is covered separately', () => {
  assert.match(source, /studio-panel analytics-panel/);
  assert.doesNotMatch(source, /studio-metrics|analytics-metrics/);
  assert.match(source, /<Chart series=\{analytics\.series\}\/\>/);
});
