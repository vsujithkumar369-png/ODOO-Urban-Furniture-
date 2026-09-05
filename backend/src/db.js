// backend/src/db.js
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:thiru@localhost:5432/urban_furniture_db';

const pool = new Pool({
  connectionString
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err);
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Initializing PostgreSQL schema in urban_furniture_db...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        login_id VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        contact_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'customer',
        email VARCHAR(255) UNIQUE,
        mobile VARCHAR(50),
        street VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        pincode VARCHAR(20),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'GOODS',
        sales_price NUMERIC(12, 2) DEFAULT 0.00,
        cost NUMERIC(12, 2) DEFAULT 0.00,
        category VARCHAR(100) DEFAULT 'General',
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        default_account_id INT,
        default_account_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS analytic_accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(50) DEFAULT 'EXPENSE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_date VARCHAR(50) NOT NULL,
        end_date VARCHAR(50) NOT NULL,
        analytic_account_id INT NOT NULL,
        analytic_account_name VARCHAR(255),
        type VARCHAR(50) DEFAULT 'expense',
        responsible VARCHAR(255),
        committed_amount NUMERIC(12, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'draft',
        revision_of_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        doc_type VARCHAR(50) NOT NULL,
        number VARCHAR(100) UNIQUE NOT NULL,
        contact_id INT NOT NULL,
        contact_name VARCHAR(255),
        source_document_id INT,
        source_document_number VARCHAR(100),
        doc_date VARCHAR(50) NOT NULL,
        due_date VARCHAR(50) NOT NULL,
        reference VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        total NUMERIC(12, 2) DEFAULT 0.00,
        amount_paid NUMERIC(12, 2) DEFAULT 0.00,
        amount_due NUMERIC(12, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS document_lines (
        id SERIAL PRIMARY KEY,
        document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        product_id INT,
        product_name VARCHAR(255),
        analytic_account_id INT,
        analytic_account_name VARCHAR(255),
        qty NUMERIC(10, 2) DEFAULT 1.00,
        unit_price NUMERIC(12, 2) DEFAULT 0.00,
        line_total NUMERIC(12, 2) DEFAULT 0.00
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        document_id INT NOT NULL,
        direction VARCHAR(50) DEFAULT 'send',
        amount NUMERIC(12, 2) DEFAULT 0.00,
        pay_date VARCHAR(50) NOT NULL,
        method VARCHAR(50) DEFAULT 'bank',
        note TEXT,
        journal_entry_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        journal_id INT NOT NULL,
        journal_name VARCHAR(255),
        document_id INT,
        entry_date VARCHAR(50) NOT NULL,
        reference VARCHAR(255),
        status VARCHAR(50) DEFAULT 'posted',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id SERIAL PRIMARY KEY,
        journal_entry_id INT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
        account_id INT NOT NULL,
        account_name VARCHAR(255),
        contact_id INT,
        debit NUMERIC(12, 2) DEFAULT 0.00,
        credit NUMERIC(12, 2) DEFAULT 0.00
      );
    `);

    // Schema migrations for existing tables (non-destructive)
    await client.query(`
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS street VARCHAR(255);
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'contacts_email_key'
        ) THEN
          ALTER TABLE contacts ADD CONSTRAINT contacts_email_key UNIQUE (email);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'products_name_key'
        ) THEN
          ALTER TABLE products ADD CONSTRAINT products_name_key UNIQUE (name);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'analytic_accounts_name_key'
        ) THEN
          ALTER TABLE analytic_accounts ADD CONSTRAINT analytic_accounts_name_key UNIQUE (name);
        END IF;
      END $$;
    `);
    // Ensure standard Chart of Accounts exist if table empty
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

    // Ensure standard core Journals exist if table empty
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


    // Ensure default core roles & demo portal accounts exist
    const demoAccounts = [
      { name: 'System Admin', login_id: 'admin1', email: 'admin@urbanfurniture.com', pwd: 'admin123', role: 'admin', contact_id: null },
      { name: 'Staff Accountant', login_id: 'acc001', email: 'accountant@urbanfurniture.com', pwd: 'acc123', role: 'accountant', contact_id: null },
      { name: 'Demo Customer', login_id: 'cust01', email: 'cust01@urbanfurniture.com', pwd: 'portal123', role: 'contact', contact_id: 1 },
      { name: 'Demo Vendor', login_id: 'vend01', email: 'vend01@urbanfurniture.com', pwd: 'portal123', role: 'contact', contact_id: 9 },
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

    console.log('✅ PostgreSQL database ready.');
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDatabase
};
