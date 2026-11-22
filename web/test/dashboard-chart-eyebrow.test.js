import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../src/StudioTransactionDashboard.jsx', import.meta.url)), 'utf8');
const css = readFileSync(fileURLToPath(new URL('../src/studio-dashboard.css', import.meta.url)), 'utf8');

test('chart has a GRAFIK eyebrow above the dark ANALYTICS heading', () => {
  assert.match(source, /<div className="studio-chart-heading">\s*<div className="studio-chart-title">\s*<span className="studio-section-label">GRAFIK<\/span>\s*<h2>ANALYTICS<\/h2>/);
  assert.match(css, /\.studio-chart-title\s*\{[^}]*display\s*:\s*flex[^}]*flex-direction\s*:\s*column/);
  assert.match(css, /\.studio-chart-title\s*\.studio-section-label\s*\{[^}]*font-size\s*:\s*10px[^}]*letter-spacing\s*:\s*\.11em/);
});
