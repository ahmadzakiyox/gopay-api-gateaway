const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function applyMigrations(pool) {
  // 1. Ensure all base tables exist from schema.sql
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schemaSql);

  // 2. Ensure non-breaking column evolutions exist if tables were created previously
  // Ensure payments table has webhook columns
  const [paymentCols] = await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='payments' AND COLUMN_NAME='webhook_url'"
  );
  if (!paymentCols.length) {
    await pool.query("ALTER TABLE payments ADD COLUMN webhook_url VARCHAR(1024) NULL AFTER qris_payload");
    await pool.query("ALTER TABLE payments ADD COLUMN webhook_status ENUM('pending','delivered','failed','skipped') NOT NULL DEFAULT 'pending' AFTER paid_at");
    await pool.query("ALTER TABLE payments ADD COLUMN webhook_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER webhook_status");
    await pool.query("ALTER TABLE payments ADD COLUMN webhook_last_response TEXT NULL AFTER webhook_attempts");
    await pool.query("ALTER TABLE payments ADD COLUMN webhook_delivered_at DATETIME(3) NULL AFTER webhook_last_response");
  }

  // Ensure api_keys table has service_type column
  const [apiKeyCols] = await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='api_keys' AND COLUMN_NAME='service_type'"
  );
  if (!apiKeyCols.length) {
    await pool.query("ALTER TABLE api_keys ADD COLUMN service_type ENUM('website', 'bot') NOT NULL DEFAULT 'website' AFTER user_id");
  }

  // Ensure users table has active_provider column
  const [userCols] = await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='active_provider'"
  );
  if (!userCols.length) {
    await pool.query("ALTER TABLE users ADD COLUMN active_provider ENUM('gopay','shopeepay') NOT NULL DEFAULT 'gopay' AFTER photo_url");
  }

  // Ensure payments table has provider column
  const [payProviderCols] = await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='payments' AND COLUMN_NAME='provider'"
  );
  if (!payProviderCols.length) {
    await pool.query("ALTER TABLE payments ADD COLUMN provider ENUM('gopay','shopeepay') NOT NULL DEFAULT 'gopay' AFTER qris_payload");
  }
}

module.exports = { applyMigrations };

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  (async () => {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      multipleStatements: true
    });
    await applyMigrations(pool);
    await pool.end();
    console.log('Database migration & schema synced successfully');
  })().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}
