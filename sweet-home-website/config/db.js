
require('dotenv').config();
const { Pool } = require('pg');
// …
const isProd = process.env.NODE_ENV === 'production';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres requires TLS. Use verified TLS locally off, and relax CA verification in prod.
  ssl: isProd ? { rejectUnauthorized: false } : false
});

module.exports.connectDB = () => {
  pool.connect()
    .then(() => console.log('PostgreSQL connected'))
    .catch(err => console.error('DB Connection Error:', err));
};

module.exports.query = (text, params) => pool.query(text, params);

// Export pool for other modules (e.g., session store)
module.exports.pool = pool;