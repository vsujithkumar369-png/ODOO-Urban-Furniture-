const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Executing modular schema files in dependency-safe order...');

    const schemaFilesOrder = [
      'users.sql',
      'contacts.sql',
      'products.sql',
      'coa.sql',
      'journals.sql',
      'analytics.sql',
      'budgets.sql',
      'documents.sql',
      'journal_entries.sql',
      'payments.sql'
    ];

    const schemaDir = path.join(__dirname, 'schema');

    for (const file of schemaFilesOrder) {
      const filePath = path.join(schemaDir, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
      }
    }

    // Seed default Chart of Accounts if table empty
    const coaCount = await client.query('SELECT COUNT(*) FROM accounts');
    if (parseInt(coaCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO accounts (id, name, type) VALUES
        (1, 'Sale Income A/c', 'income'),
        (2, 'Purchase Expense A/c', 'expense'),
        (3, 'Debtors A/c', 'asset'),
        (4, 'Creditors A/c', 'liability'),
        (5, 'Bank A/c', 'asset'),
        (6, 'Cash A/c', 'asset'),
        (7, 'Capital A/c', 'capital')
        ON CONFLICT DO NOTHING;
        SELECT setval('accounts_id_seq', 7);
      `);
    }

    // Seed default Journals if table empty
    const journalsCount = await client.query('SELECT COUNT(*) FROM journals');
    if (parseInt(journalsCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO journals (id, name, type, default_account_id, default_account_name) VALUES
        (1, 'Sales', 'sales', 1, 'Sale Income A/c'),
        (2, 'Purchase', 'purchase', 2, 'Purchase Expense A/c'),
        (3, 'Bank', 'bank', 5, 'Bank A/c'),
        (4, 'Cash', 'cash', 6, 'Cash A/c')
        ON CONFLICT DO NOTHING;
        SELECT setval('journals_id_seq', 4);
      `);
    }

    // Seed default Admin & Accountant users if not existing
    const demoAccounts = [
      { name: 'System Admin', login_id: 'admin_user', email: 'admin@urbanfurniture.com', pwd: 'Admin@123', role: 'admin', contact_id: null },
      { name: 'Staff Accountant', login_id: 'acc_user', email: 'accountant@urbanfurniture.com', pwd: 'Accountant@123', role: 'accountant', contact_id: null }
    ];

    for (const d of demoAccounts) {
      const uRes = await client.query('SELECT id FROM users WHERE login_id = $1 OR email = $2', [d.login_id, d.email]);
      if (uRes.rows.length === 0) {
        await client.query(
          `INSERT INTO users (name, login_id, email, password, role, contact_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [d.name, d.login_id, d.email, d.pwd, d.role, d.contact_id]
        );
      }
    }

    console.log('✅ PostgreSQL database init complete.');

  } finally {
    client.release();
  }
}

module.exports = { initDatabase };
