async function getPaymentForUser(pool, userId, trxId, now = Date.now()) {
  const [rows] = await pool.execute('SELECT * FROM payments WHERE user_id=? AND id=? LIMIT 1', [userId, trxId]);
  if (!rows[0]) return null;
  if (rows[0].status !== 'pending' || new Date(rows[0].expires_at).getTime() > now) return rows[0];
  await pool.execute("UPDATE payments SET status='expired' WHERE id=? AND user_id=? AND status='pending' AND expires_at<=NOW(3)", [trxId, userId]);
  const [fresh] = await pool.execute('SELECT * FROM payments WHERE user_id=? AND id=? LIMIT 1', [userId, trxId]);
  return fresh[0] || null;
}

module.exports = { getPaymentForUser };
