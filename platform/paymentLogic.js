const MAX_PAYABLE_AMOUNT = 999999999;
const SETTLED_STATUSES = new Set(['SETTLEMENT', 'CAPTURE']);

function allocateUniqueAmount(baseAmount, reservedAmounts, minSurcharge = 35, maxSurcharge = 99) {
  if (!Number.isSafeInteger(baseAmount) || baseAmount <= 0) throw new TypeError('Nominal dasar harus integer positif');
  if (!Number.isInteger(minSurcharge) || !Number.isInteger(maxSurcharge) || minSurcharge < 0 || maxSurcharge < minSurcharge) throw new TypeError('Rentang nominal unik tidak valid');
  const reserved = reservedAmounts instanceof Set ? reservedAmounts : new Set(reservedAmounts || []);
  for (let surcharge = minSurcharge; surcharge <= maxSurcharge; surcharge += 1) {
    const payableAmount = baseAmount + surcharge;
    if (payableAmount <= MAX_PAYABLE_AMOUNT && !reserved.has(payableAmount)) return { surcharge, payableAmount };
  }
  const error = new Error('Semua nominal unik sedang digunakan');
  error.code = 'NO_UNIQUE_AMOUNT_AVAILABLE';
  throw error;
}

function parseProviderAmount(value, minorUnits = false) {
  if (value && typeof value === 'object' && 'value' in value) value = value.value;
  let amount;
  if (typeof value === 'number') amount = Number.isSafeInteger(value) && value >= 0 ? value : null;
  else if (typeof value === 'string' && /^\d+(?:\.\d{1,2})?$/.test(value.trim())) amount = Number(value.trim());
  else return null;
  if (!Number.isSafeInteger(amount) || amount < 0) return null;
  if (!minorUnits) return amount;
  if (!Number.isInteger(amount / 100)) return null;
  return amount / 100;
}

function normalizeTransaction(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const status = String(raw.transaction_status || raw.status || '').toUpperCase();
  const paymentType = String(raw.payment_type || raw.transaction_source || '').toUpperCase();
  const transactionId = raw.id || raw.transaction_id || raw.wallstreet_transaction_id;
  const amount = parseProviderAmount(raw.gross_amount ?? raw.real_gross_amount ?? raw.amount?.value ?? raw.amount, true);
  const transactionTime = raw.transaction_time || raw.settlement_time || raw.created_at;
  if (!SETTLED_STATUSES.has(status) || paymentType !== 'QRIS' || !transactionId || amount === null || !transactionTime || !Number.isFinite(Date.parse(transactionTime))) return null;
  return {
    transactionId: String(transactionId), amount, paymentType, status,
    transactionTime: new Date(transactionTime).toISOString(),
    issuer: raw.qris_provider_aspi_issuer || null,
    orderId: raw.order_id || raw.wallstreet_transaction_id || null
  };
}

function transactionMatchesPayment(tx, payment, clockSkewMs = 60_000, settlementGraceMs = 120_000) {
  if (!tx || tx.amount !== Number(payment.payable_amount) || tx.paymentType !== 'QRIS' || !SETTLED_STATUSES.has(tx.status)) return false;
  const txTime = Date.parse(tx.transactionTime);
  const createdAt = Date.parse(payment.created_at);
  const expiresAt = Date.parse(payment.expires_at);
  return Number.isFinite(txTime) && Number.isFinite(createdAt) && Number.isFinite(expiresAt) && txTime >= createdAt - clockSkewMs && txTime <= expiresAt + settlementGraceMs;
}

function toMysqlDateTime(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new TypeError('Waktu transaksi GoPay tidak valid');
  return new Date(timestamp).toISOString().slice(0, 23).replace('T', ' ');
}

module.exports = { MAX_PAYABLE_AMOUNT, allocateUniqueAmount, normalizeTransaction, transactionMatchesPayment, toMysqlDateTime };
