const crypto = require('crypto');

function required(name) {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') throw new Error(`${name} is required`);
  return value || '';
}

const keyHex = required('DATA_ENCRYPTION_KEY');
const key = keyHex && /^[0-9a-f]{64}$/i.test(keyHex) ? Buffer.from(keyHex, 'hex') : null;

function encrypt(value) {
  if (!key) throw new Error('DATA_ENCRYPTION_KEY must be a 32-byte hex key');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

function decrypt(payload) {
  if (!key) throw new Error('DATA_ENCRYPTION_KEY must be a 32-byte hex key');
  const [ivText, tagText, dataText] = payload.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataText, 'base64url')), decipher.final()]).toString('utf8');
}

function randomApiKey() {
  return `gpg_${crypto.randomBytes(32).toString('base64url')}`;
}

module.exports = { encrypt, decrypt, randomApiKey };
