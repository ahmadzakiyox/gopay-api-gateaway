import test from 'node:test';
import assert from 'node:assert/strict';
import { getStatusDistribution } from '../src/transactionStatusSummary.js';

test('transaction status distribution calculates percentages from counts', () => {
  const result = getStatusDistribution({ paid: 7, pending: 2, expired: 1 });
  assert.equal(result.total, 10);
  assert.deepEqual(result.items.map(({ key, count, percentage }) => ({ key, count, percentage })), [
    { key: 'paid', count: 7, percentage: 70 },
    { key: 'pending', count: 2, percentage: 20 },
    { key: 'expired', count: 1, percentage: 10 },
  ]);
});

test('rounded percentages are nonnegative and sum to exactly 100', () => {
  const result = getStatusDistribution({ paid: 7, pending: 1, expired: 0 });
  assert.ok(result.items.every(item => item.percentage >= 0));
  assert.equal(result.items.reduce((sum, item) => sum + item.percentage, 0), 100);
});
test('transaction status distribution keeps all states and zero percentages for an empty period', () => {
  const result = getStatusDistribution({ paid: 0, pending: 0, expired: 0 });
  assert.equal(result.total, 0);
  assert.deepEqual(result.items.map(({ key, count, percentage }) => ({ key, count, percentage })), [
    { key: 'paid', count: 0, percentage: 0 },
    { key: 'pending', count: 0, percentage: 0 },
    { key: 'expired', count: 0, percentage: 0 },
  ]);
});
