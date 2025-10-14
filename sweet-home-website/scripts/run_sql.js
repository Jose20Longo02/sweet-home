// Run: DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require" node scripts/run_sql.js mitigations/add_phone_to_users.sql
const fs = require('fs');
const { Client } = require('pg');

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/run_sql.js <path-to-sql>');
    process.exit(1);
  }
  const sql = fs.readFileSync(file, 'utf8');
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('DATABASE_URL env var is required.');
    process.exit(1);
  }
  const client = new Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SQL executed successfully for', file);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Failed to run SQL:', e.message || e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();


