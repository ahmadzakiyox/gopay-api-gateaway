const crypto = require('crypto');
const axios = require('axios');
const net = require('net');

/**
 * Validates that a webhook URL is safe from SSRF:
 * - Must be valid HTTPS URL (or HTTP if allowInsecureHttp is explicitly true, e.g. for development/test)
 * - Hostname cannot be localhost, loopback, or private/internal IP ranges
 */
function validateWebhookUrl(urlStr, { allowInsecureHttp = false } = {}) {
  if (!urlStr || typeof urlStr !== 'string') {
    return { valid: false, error: 'Webhook URL wajib diisi' };
  }

  let parsed;
  try {
    parsed = new URL(urlStr.trim());
  } catch {
    return { valid: false, error: 'Format Webhook URL tidak valid' };
  }

  const allowedProtocols = allowInsecureHttp ? ['https:', 'http:'] : ['https:'];
  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      valid: false,
      error: allowInsecureHttp
        ? 'Webhook URL harus menggunakan protokol HTTPS atau HTTP'
        : 'Webhook URL wajib menggunakan protokol HTTPS yang aman (https://)'
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject local and internal hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { valid: false, error: 'Webhook URL tidak boleh mengarah ke localhost atau jaringan internal' };
  }

  // Check for IP address literals
  const ipType = net.isIP(hostname);
  if (ipType !== 0) {
    if (isPrivateOrLocalIp(hostname, ipType)) {
      return { valid: false, error: 'Webhook URL tidak boleh mengarah ke IP privat atau loopback' };
    }
  }

  return { valid: true, url: parsed.toString() };
}

function isPrivateOrLocalIp(ip, ipType) {
  if (ipType === 4) {
    const parts = ip.split('.').map(Number);
    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local, cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    return false;
  }
  if (ipType === 6) {
    const lower = ip.toLowerCase();
    // ::1 (loopback)
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
    // fc00::/7 (unique local)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // fe80::/10 (link-local)
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    return false;
  }
  return false;
}

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
  validateWebhookUrl,
  buildWebhookPayload,
  signWebhookPayload,
  sendWebhook
};
