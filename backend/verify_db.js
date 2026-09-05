const { pool } = require('./src/db');

async function verifyFinalDB() {
  console.log('--- FINAL DATABASE ROW & RELATIONSHIP VERIFICATION ---');
  
  const contactsCount = await pool.query('SELECT COUNT(*) FROM contacts');
  const usersCount = await pool.query('SELECT COUNT(*) FROM users');
  const portalUsersCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'contact'");
  const dupEmails = await pool.query('SELECT email, COUNT(*) FROM contacts WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1');
  const dupUserLinks = await pool.query('SELECT contact_id, COUNT(*) FROM users WHERE contact_id IS NOT NULL GROUP BY contact_id HAVING COUNT(*) > 1');

  console.log('Total Contact rows:', contactsCount.rows[0].count);
  console.log('Total User rows:', usersCount.rows[0].count);
  console.log('Total Portal User (role=contact) rows:', portalUsersCount.rows[0].count);
  console.log('Duplicate emails count in contacts (must be 0):', dupEmails.rows.length);
  console.log('Duplicate Contact<->User links (must be 0):', dupUserLinks.rows.length);

  process.exit(0);
}

verifyFinalDB().catch(err => { console.error(err); process.exit(1); });
