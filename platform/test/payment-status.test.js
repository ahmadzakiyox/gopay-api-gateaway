const test = require('node:test');
const assert = require('node:assert/strict');
const { getPaymentForUser } = require('../paymentStatus');

function fakePool(rows, answers = []) {
  const calls = [];
  return {
    calls,
    async execute(sql, params) {
      calls.push({ sql, params });
      const answer = answers.length ? answers.shift() : [rows];
      return answer;
    }
  };
}

test('reads a pending payment from storage without contacting the provider', async () => {
  const row = { id: 'trx', status: 'pending', expires_at: new Date(Date.now() + 60000) };
  const pool = fakePool([row]);
  assert.equal(await getPaymentForUser(pool, 7, 'trx'), row);
  assert.equal(pool.calls.length, 1);
  assert.match(pool.calls[0].sql, /SELECT \* FROM payments WHERE user_id=\? AND id=\?/);
});

test('returns paid payment immediately from stored state', async () => {
  const row = { id: 'trx', status: 'paid' };
  const pool = fakePool([row]);
  assert.equal(await getPaymentForUser(pool, 7, 'trx'), row);
  assert.equal(pool.calls.length, 1);
});

test('marks an overdue pending payment expired and returns fresh state', async () => {
  const expired = { id: 'trx', status: 'pending', expires_at: new Date(0) };
  const fresh = { ...expired, status: 'expired' };
  const pool = fakePool([], [ [[expired]], [{ affectedRows: 1 }], [[fresh]] ]);
  assert.equal(await getPaymentForUser(pool, 7, 'trx', Date.now()), fresh);
  assert.equal(pool.calls.length, 3);
  assert.match(pool.calls[1].sql, /UPDATE payments SET status='expired'/);
});

test('returns null when payment does not belong to the user or does not exist', async () => {
  const pool = fakePool([]);
  assert.equal(await getPaymentForUser(pool, 7, 'missing'), null);
  assert.equal(pool.calls.length, 1);
});
