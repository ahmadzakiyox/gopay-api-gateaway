function calculateCRC16(payload) {
  let crc = 0xffff;
  for (const char of payload) {
    crc ^= char.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function parseTags(payload) {
  const tags = [];
  let index = 0;
  while (index < payload.length) {
    if (index + 4 > payload.length) throw new Error('QRIS TLV terpotong');
    const tag = payload.slice(index, index + 2);
    const length = Number.parseInt(payload.slice(index + 2, index + 4), 10);
    if (!Number.isInteger(length) || length < 0 || index + 4 + length > payload.length) throw new Error('Panjang QRIS tidak valid');
    tags.push({ tag, value: payload.slice(index + 4, index + 4 + length) });
    index += 4 + length;
  }
  return tags;
}

function generateDynamicQRIS(staticQris, amount) {
  if (!/^\d+$/.test(String(amount)) || Number(amount) <= 0 || Number(amount) > 999999999) throw new Error('Nominal harus berupa angka 1 sampai 999999999');
  let payload = String(staticQris).trim();
  if (!payload) throw new Error('QRIS kosong');
  const crcIndex = payload.indexOf('6304');
  if (crcIndex >= 0) payload = payload.slice(0, crcIndex);
  const tags = parseTags(payload);
  const output = [];
  let amountAdded = false;
  for (const item of tags) {
    if (item.tag === '01') output.push({ tag: '01', value: '12' });
    else if (item.tag === '54') { output.push({ tag: '54', value: String(Number(amount)) }); amountAdded = true; }
    else if (item.tag === '58' && !amountAdded) { output.push({ tag: '54', value: String(Number(amount)) }, item); amountAdded = true; }
    else output.push(item);
  }
  if (!amountAdded) output.push({ tag: '54', value: String(Number(amount)) });
  const body = output.map(({ tag, value }) => `${tag}${String(value.length).padStart(2, '0')}${value}`).join('');
  return `${body}6304${calculateCRC16(`${body}6304`)}`;
}

function validateQris(value) {
  const payload = String(value || '').trim();
  if (payload.length < 20 || !/^[0-9A-Za-z .:/_-]+$/.test(payload)) throw new Error('QRIS harus berupa string EMVCo yang valid');
  parseTags(payload.includes('6304') ? payload.slice(0, payload.indexOf('6304')) : payload);
  return payload;
}

module.exports = { calculateCRC16, generateDynamicQRIS, validateQris };
