const test = require('node:test');
const assert = require('node:assert/strict');
const { allocateUniqueAmount, normalizeTransaction, transactionMatchesPayment } = require('../paymentLogic');

test('allocates the first unused surcharge above the base amount', () => {
  assert.deepEqual(allocateUniqueAmount(10000, new Set([10035]), 35, 99), {
    surcharge: 36,
    payableAmount: 10036
  });
});

test('reuses a surcharge when its payable amount is no longer reserved', () => {
  assert.deepEqual(allocateUniqueAmount(10000, new Set([10036]), 35, 99), {
    surcharge: 35,
    payableAmount: 10035
  });
});

test('avoids collisions across different base amounts', () => {
  assert.deepEqual(allocateUniqueAmount(10001, new Set([10036]), 35, 99), {
    surcharge: 36,
    payableAmount: 10037
  });
});

test('fails closed when every surcharge is reserved', () => {
  assert.throws(() => allocateUniqueAmount(10000, new Set([10035, 10036]), 35, 36), {
    code: 'NO_UNIQUE_AMOUNT_AVAILABLE'
  });
});

test('accepts only settled QRIS with stable provider transaction ID', () => {
  assert.deepEqual(normalizeTransaction({ id: 'provider-tx', status: 'SETTLEMENT', payment_type: 'QRIS', gross_amount: 1003500, settlement_time: '2026-01-01T00:01:00Z' }), {
    transactionId: 'provider-tx',
    amount: 10035,
    paymentType: 'QRIS',
    status: 'SETTLEMENT',
    transactionTime: '2026-01-01T00:01:00.000Z',
    issuer: null,
    orderId: null
  });
  assert.equal(normalizeTransaction({ id: 'pending', status: 'PENDING', payment_type: 'QRIS', gross_amount: 10035, transaction_time: '2026-01-01T00:01:00Z' }), null);
  assert.equal(normalizeTransaction({ id: 'card', status: 'SETTLEMENT', payment_type: 'CREDIT_CARD', gross_amount: 10035, transaction_time: '2026-01-01T00:01:00Z' }), null);
  assert.equal(normalizeTransaction({ status: 'SETTLEMENT', payment_type: 'QRIS', gross_amount: 10035, transaction_time: '2026-01-01T00:01:00Z' }), null);
});

test('matches exact amount and payment-window timestamps only', () => {
  const payment = { base_amount: 10000, surcharge: 35, payable_amount: 10035, created_at: '2026-01-01T00:00:00Z', expires_at: '2026-01-01T00:15:00Z' };
  const tx = { transactionId: 'provider-tx', amount: 10035, paymentType: 'QRIS', status: 'SETTLEMENT', transactionTime: '2026-01-01T00:10:00Z' };
  assert.equal(transactionMatchesPayment(tx, payment), true);
  assert.equal(transactionMatchesPayment({ ...tx, amount: 10036 }, payment), false);
  assert.equal(transactionMatchesPayment({ ...tx, transactionTime: '2025-12-31T23:58:59Z' }, payment), false);
  assert.equal(transactionMatchesPayment({ ...tx, transactionTime: '2026-01-01T00:17:01Z' }, payment), false);
});
