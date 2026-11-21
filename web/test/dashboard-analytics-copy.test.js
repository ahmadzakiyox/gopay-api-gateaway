import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../src/StudioTransactionDashboard.jsx', import.meta.url)), 'utf8');

test('analytics chart uses the requested concise labels', () => {
  assert.doesNotMatch(source, /Nominal transaksi sukses|Pergerakan pembayaran berdasarkan waktu diterima|Pembayaran sukses|Pilih hari pada grafik/);
  assert.match(source, /<StatusDonut summary=\{analytics\.summary\}\/\>/);
  assert.match(source, /aria-label=\{total\?`Komposisi/);
  assert.match(source, /aria-label="Grafik nominal transaksi harian"/);
  assert.match(source, /aria-label=\{`\$\{x\.day\}, \$\{money\(x\.amount\)\}, \$\{x\.count\} transaksi`\}/);
});
