const { pool } = require('./src/db');
async function clean() {
  await pool.query("DELETE FROM users WHERE contact_id IN (SELECT id FROM contacts WHERE id NOT IN (SELECT MIN(id) FROM contacts GROUP BY email) AND email IS NOT NULL)");
  await pool.query("DELETE FROM contacts WHERE id NOT IN (SELECT MIN(id) FROM contacts GROUP BY email) AND email IS NOT NULL");
  console.log('Cleaned duplicate contacts');
  process.exit(0);
}
clean().catch(err => { console.error(err); process.exit(1); });
