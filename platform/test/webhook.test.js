const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { buildWebhookPayload, signWebhookPayload, sendWebhook } = require('../webhook');

test('buildWebhookPayload formats payment details accurately', () => {
  const payment = {
    id: 'trx-12345',
    order_id: 'order-999',
    base_amount: '10000',
    surcharge: '45',
    payable_amount: '10045',
    provider_payment_type: 'QRIS',
    provider_transaction_id: 'gopay-tx-888',
    provider_transaction_time: '2026-11-25T10:00:00Z',
    paid_at: '2026-11-25T10:00:05Z',
    created_at: '2026-11-25T09:58:00Z'
  };

  const payload = buildWebhookPayload(payment);
  assert.equal(payload.event, 'payment.paid');
  assert.equal(payload.data.trxId, 'trx-12345');
  assert.equal(payload.data.orderId, 'order-999');
  assert.equal(payload.data.baseAmount, 10000);
  assert.equal(payload.data.surcharge, 45);
  assert.equal(payload.data.payableAmount, 10045);
  assert.equal(payload.data.status, 'paid');
  assert.equal(payload.data.paymentType, 'QRIS');
  assert.equal(payload.data.providerTransactionId, 'gopay-tx-888');
});

test('signWebhookPayload produces valid HMAC-SHA256 signature', () => {
  const secret = 'super-secret-key';
  const body = JSON.stringify({ hello: 'world' });
  const sig = signWebhookPayload(body, secret);

  assert.ok(typeof sig === 'string');
  assert.equal(sig.length, 64);

  // Verification
  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(sig, expected);
});

test('sendWebhook delivers payload with headers to server', async () => {
  let receivedHeaderSig = '';
  let receivedEvent = '';
  let receivedBody = null;

  const server = http.createServer((req, res) => {
    receivedHeaderSig = req.headers['x-callback-signature'];
    receivedEvent = req.headers['x-callback-event'];
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      receivedBody = JSON.parse(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/webhook-callback`;

  try {
    const payload = { event: 'payment.paid', test: 123 };
    const secret = 'test-secret';
    const result = await sendWebhook({ url, secret, payload, timeoutMs: 3000 });

    assert.equal(result.success, true);
    assert.equal(result.statusCode, 200);
    assert.ok(receivedHeaderSig);
    assert.equal(receivedEvent, 'payment.paid');
    assert.deepEqual(receivedBody, payload);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
