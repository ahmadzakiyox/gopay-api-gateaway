require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE, multipleStatements: true
  });
  await pool.query(fs.readFileSync(require('path').join(__dirname, 'schema.sql'), 'utf8'));
  await pool.end();
  console.log('MySQL schema applied');
})().catch((error) => { console.error(error.message); process.exit(1); });
