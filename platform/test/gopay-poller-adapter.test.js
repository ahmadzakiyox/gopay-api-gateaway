const assert = require('node:assert/strict');
const test = require('node:test');
const axios = require('axios');
const { listTransactions } = require('../gopayAdapter');

test('lists merchant transactions with QRIS-only filters', async (t) => {
  let request;
  t.mock.method(axios, 'get', async (url, config) => {
    request = { url, config };
    return { data: { data: { transactions: [{ id: 'provider-id' }] } } };
  });
  const result = await listTransactions({ access_token: 'access', refresh_token: 'refresh', device_id: 'device' }, {
    merchantId: 'merchant', startTime: '2026-01-01T00:00:00.000Z', endTime: '2026-01-01T00:01:00.000Z'
  });
  assert.equal(result.transactions.length, 1);
  assert.equal(request.config.params.payment_types, 'QRIS');
  assert.equal(request.config.params.statuses, 'SETTLEMENT,CAPTURE');
  assert.equal(request.config.params.merchant_ids, 'merchant');
  assert.equal(request.config.params.start_time, '2026-01-01T00:00:00.000Z');
});

test('refreshes once after upstream 401 and returns rotated session internally', async (t) => {
  let gets = 0;
  let refreshBody;
  t.mock.method(axios, 'get', async () => {
    gets += 1;
    if (gets === 1) throw Object.assign(new Error('unauthorized'), { response: { status: 401 } });
    return { data: { transactions: [{ id: 'settled-id' }] } };
  });
  t.mock.method(axios, 'post', async (_url, body) => {
    refreshBody = body;
    return { data: { data: { access_token: 'rotated-access', refresh_token: 'rotated-refresh', expires_in: 3600 } } };
  });
  const result = await listTransactions({ access_token: 'old-access', refresh_token: 'old-refresh', device_id: 'device' }, {
    merchantId: 'merchant', startTime: '2026-01-01T00:00:00.000Z', endTime: '2026-01-01T00:01:00.000Z'
  });
  assert.equal(gets, 2);
  assert.equal(refreshBody.data.refresh_token, 'old-refresh');
  assert.equal(result.session.access_token, 'rotated-access');
  assert.equal(result.session.refresh_token, 'rotated-refresh');
  assert.equal(result.transactions[0].id, 'settled-id');
});

test('paginates the merchant feed to a bounded maximum', async (t) => {
  const offsets = [];
  t.mock.method(axios, 'get', async (_url, config) => {
    offsets.push(config.params.from);
    return { data: { transactions: Array.from({ length: 100 }, (_, i) => ({ id: `${config.params.from + i}` })) } };
  });
  const result = await listTransactions({ access_token: 'access', refresh_token: 'refresh', device_id: 'device' }, {
    merchantId: 'merchant', startTime: '2026-01-01T00:00:00.000Z', endTime: '2026-01-01T00:01:00.000Z'
  });
  assert.deepEqual(offsets, [0,100,200,300,400,500,600,700,800,900]);
  assert.equal(result.transactions.length, 1000);
});
