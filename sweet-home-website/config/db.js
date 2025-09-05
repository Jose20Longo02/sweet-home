
require('dotenv').config();
const { Pool } = require('pg');
// …

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
});

module.exports.connectDB = () => {
  pool.connect()
    .then(() => console.log('PostgreSQL connected'))
    .catch(err => console.error('DB Connection Error:', err));
};

module.exports.query = (text, params) => pool.query(text, params);

// Export pool for other modules (e.g., session store)
module.exports.pool = pool;