const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });

  const [cols] = await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='payments' AND COLUMN_NAME='webhook_url'"
  );

  if (!cols.length) {
    await pool.query("ALTER TABLE payments ADD COLUMN webhook_url VARCHAR(1024) NULL AFTER qris_payload");
    await pool.query("ALTER TABLE payments ADD COLUMN webhook_status ENUM('pending','delivered','failed','skipped') NOT NULL DEFAULT 'pending' AFTER paid_at");
    await pool.query("ALTER TABLE payments ADD COLUMN webhook_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER webhook_status");
    await pool.query("ALTER TABLE payments ADD COLUMN webhook_last_response TEXT NULL AFTER webhook_attempts");
    await pool.query("ALTER TABLE payments ADD COLUMN webhook_delivered_at DATETIME(3) NULL AFTER webhook_last_response");
    console.log('Columns added to payments table');
  } else {
    console.log('payments webhook columns already exist');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_configs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL UNIQUE,
      webhook_url VARCHAR(1024) NOT NULL,
      secret VARCHAR(128) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_webhook_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);
  console.log('webhook_configs table ready');

  await pool.end();
  console.log('Migration completed successfully');
}

run().catch((err) => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
