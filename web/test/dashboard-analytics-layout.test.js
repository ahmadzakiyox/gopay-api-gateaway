import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../src/StudioTransactionDashboard.jsx', import.meta.url)), 'utf8');

test('date filters, summary metrics, and chart share one analytics panel', () => {
  const panelStart = source.indexOf('className="studio-panel analytics-panel"');
  const activityStart = source.indexOf('id="transaction-log"');
  assert.notEqual(panelStart, -1, 'analytics panel exists');
  assert.ok(activityStart > panelStart, 'activity section follows analytics panel');
  const analyticsPanel = source.slice(panelStart, activityStart);
  assert.match(analyticsPanel, /analytics-toolbar/);
  assert.match(analyticsPanel, /studio-custom-range/);
  assert.match(analyticsPanel, /studio-metrics analytics-metrics/);
  assert.match(analyticsPanel, /<Chart series=\{analytics\.series\}\/\>/);
  assert.doesNotMatch(source, /<section className="studio-metrics"/);
});
