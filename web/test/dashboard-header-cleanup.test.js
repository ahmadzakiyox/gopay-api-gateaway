import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dashboardPath = fileURLToPath(new URL('../src/StudioTransactionDashboard.jsx', import.meta.url));
const source = readFileSync(dashboardPath, 'utf8');

test('dashboard omits the requested heading copy and refresh control', () => {
  assert.doesNotMatch(source, /WORKSPACE \/ DASHBOARD|<h1>Ringkasan pembayaran<\/h1>|Pantau performa pembayaran dan aktivitas transaksi\./);
  assert.doesNotMatch(source, /studio-icon-button|aria-label="Perbarui data"|<RefreshCw/);
});
