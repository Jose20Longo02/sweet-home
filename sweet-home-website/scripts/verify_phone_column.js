const { Client } = require('pg');

(async () => {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('DATABASE_URL env var is required.');
    process.exit(1);
  }
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const r = await client.query("select column_name, data_type from information_schema.columns where table_name='users' and column_name='phone'");
    if (r.rows.length) {
      console.log('users.phone exists:', r.rows[0]);
    } else {
      console.error('users.phone does NOT exist');
      process.exit(2);
    }
  } catch (e) {
    console.error('Verification failed:', e.message || e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();


