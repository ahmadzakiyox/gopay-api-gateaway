const crypto = require('crypto');
const axios = require('axios');

function buildWebhookPayload(payment) {
  return {
    event: 'payment.paid',
    timestamp: new Date().toISOString(),
    data: {
      trxId: payment.id,
      orderId: payment.order_id,
      baseAmount: Number(payment.base_amount),
      surcharge: Number(payment.surcharge),
      payableAmount: Number(payment.payable_amount),
      status: 'paid',
      paymentType: payment.provider_payment_type || 'qris',
      providerTransactionId: payment.provider_transaction_id || null,
      settlementTime: payment.provider_transaction_time ? new Date(payment.provider_transaction_time).toISOString() : null,
      paidAt: payment.paid_at ? new Date(payment.paid_at).toISOString() : null,
      createdAt: payment.created_at ? new Date(payment.created_at).toISOString() : null
    }
  };
}

function signWebhookPayload(payloadString, secret) {
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

async function sendWebhook({ url, secret, payload, timeoutMs = 10000, eventName = 'payment.paid' }) {
  const payloadString = JSON.stringify(payload);
  const signature = signWebhookPayload(payloadString, secret);
  const nowIso = new Date().toISOString();
  const startTime = Date.now();

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AlternatePay-Webhook/1.0',
        'X-Callback-Signature': signature,
        'X-Callback-Timestamp': nowIso,
        'X-Callback-Event': eventName
      },
      timeout: timeoutMs,
      validateStatus: () => true
    });

    const elapsed = Date.now() - startTime;
    const isSuccess = response.status >= 200 && response.status < 300;
    return {
      success: isSuccess,
      statusCode: response.status,
      statusText: response.statusText,
      responseTimeMs: elapsed,
      responseBody: typeof response.data === 'string' ? response.data.slice(0, 500) : JSON.stringify(response.data || {}).slice(0, 500),
      signature
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      error: error.code === 'ECONNABORTED'
        ? `Timeout: Server tujuan tidak merespons dalam ${timeoutMs / 1000} detik`
        : (error.message || 'Gagal mengirim request webhook'),
      statusCode: error.response?.status || 0,
      responseTimeMs: elapsed,
      signature
    };
  }
}

module.exports = {
  buildWebhookPayload,
  signWebhookPayload,
  sendWebhook
};
