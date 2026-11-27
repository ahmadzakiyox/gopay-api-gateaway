const crypto = require('crypto');

function md5Hex(input) {
  return crypto.createHash('md5').update(String(input)).digest('hex');
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

/**
 * Format Shopee password for the wire: SHA-256 over lowercase MD5 hex digest
 */
function hashShopeePassword(password) {
  return sha256Hex(md5Hex(password));
}

/**
 * Parses Shopee's Indonesian grouped integer format into whole rupiah (integer).
 * Examples: "30.000" -> 30000, "1.250.000" -> 1250000, "30000" -> 30000.
 */
function parseShopeeAmount(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;

  const plainDigits = /^\d+$/;
  const indonesianGroup = /^\d{1,3}(?:\.\d{3})+$/;

  if (!plainDigits.test(s) && !indonesianGroup.test(s)) {
    return null;
  }

  const normalized = s.replace(/\./g, '');
  const num = parseInt(normalized, 10);
  if (isNaN(num) || num < 0 || !Number.isSafeInteger(num)) {
    return null;
  }
  return num;
}

/**
 * Normalizes an Indonesian mobile phone number to E.164 without '+' (e.g. 628123456789)
 */
function parseIndonesianPhone(phoneNumber) {
  const digits = String(phoneNumber || '').replace(/\D/g, '');
  let normalized = digits;
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  } else if (!normalized.startsWith('62')) {
    normalized = '62' + normalized;
  }
  if (!/^628\d{7,13}$/.test(normalized)) {
    throw new Error('Nomor HP Shopee tidak valid (harus nomor Indonesia berawalan 08 / 628)');
  }
  return normalized;
}

/**
 * Formats E.164 phone into passport client display format: "(+62) 897 7110 640"
 */
function formatPhoneForVerification(e164) {
  const sub = String(e164).replace(/^62/, '');
  const groups = [];
  if (sub.length >= 3) {
    groups.push(sub.slice(0, 3));
  }
  if (sub.length > 3) {
    const rest = sub.slice(3);
    if (rest.length > 4) {
      groups.push(rest.slice(0, 4));
      groups.push(rest.slice(4));
    } else {
      groups.push(rest);
    }
  }
  return `(+62) ${groups.join(' ')}`;
}

/**
 * Decodes the payload portion of a JWT string without verification.
 */
function decodeJwtPayload(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string') return null;
  const parts = tokenStr.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const jsonStr = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

module.exports = {
  md5Hex,
  sha256Hex,
  hashShopeePassword,
  parseShopeeAmount,
  parseIndonesianPhone,
  formatPhoneForVerification,
  decodeJwtPayload
};
