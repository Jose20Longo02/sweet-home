
require('dotenv').config();
const { Pool } = require('pg');
// …
const connString = process.env.DATABASE_URL || '';
const isLocal = /localhost|127\.0\.0\.1/.test(connString);
const pool = new Pool({
  connectionString: connString,
  // Force TLS for hosted DBs (Render, etc); keep off only for local dev
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

module.exports.connectDB = () => {
  pool.connect()
    .then(() => console.log('PostgreSQL connected'))
    .catch(err => console.error('DB Connection Error:', err));
};

module.exports.query = (text, params) => pool.query(text, params);

// Export pool for other modules (e.g., session store)
module.exports.pool = pool;