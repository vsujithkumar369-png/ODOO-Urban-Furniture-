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
        email VARCHAR(255),
        mobile VARCHAR(50),
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(20),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'goods',
        sales_price NUMERIC(12, 2) DEFAULT 0.00,
        cost NUMERIC(12, 2) DEFAULT 0.00,
        category VARCHAR(100),
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
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'expense',
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

    // Check if seeded
    const usersCountRes = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersCountRes.rows[0].count) === 0) {
      console.log('🌱 Seeding PostgreSQL database with initial accounting data...');
      
      // Seed users
      await client.query(`
        INSERT INTO users (id, name, login_id, email, password, role, contact_id) VALUES
        (1, 'Priya Shah', 'priya123', 'priya@ex.com', 'Str0ng!Pass', 'admin', NULL),
        (2, 'Admin User', 'admin', 'admin@urbanfurniture.com', 'admin', 'admin', NULL),
        (3, 'Accountant', 'accountant', 'accountant@urbanfurniture.com', 'accountant', 'admin', NULL),
        (4, 'Rahul Sharma', 'rahul@ex.com', 'rahul@ex.com', 'portal123', 'contact', 1)
        ON CONFLICT DO NOTHING;
      `);

      // Seed COA
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
      `);

      // Seed Journals
      await client.query(`
        INSERT INTO journals (id, name, type, default_account_id, default_account_name) VALUES
        (1, 'Sales', 'sales', 1, 'Sale Income A/c'),
        (2, 'Purchase', 'purchase', 2, 'Purchase Expense A/c'),
        (3, 'Bank', 'bank', 5, 'Bank A/c'),
        (4, 'Cash', 'cash', 6, 'Cash A/c')
        ON CONFLICT DO NOTHING;
      `);

      // Seed Analytics
      await client.query(`
        INSERT INTO analytic_accounts (id, name, type) VALUES
        (1, 'Project 1', 'income'),
        (2, 'Furniture', 'expense'),
        (3, 'Interior Design', 'income')
        ON CONFLICT DO NOTHING;
      `);

      // Seed Contacts
      await client.query(`
        INSERT INTO contacts (id, name, type, email, mobile, city, state, pincode) VALUES
        (1, 'Rahul Sharma', 'both', 'rahul@ex.com', '+91 9090090909', 'Ahmedabad', 'Gujarat', '382007'),
        (2, 'Apex Furnishings Ltd', 'vendor', 'vendor@apex.com', '+91 9876543210', 'Mumbai', 'Maharashtra', '400001'),
        (3, 'Modern Living Spaces', 'customer', 'client@modernliving.com', '+91 9123456780', 'Bangalore', 'Karnataka', '560001')
        ON CONFLICT DO NOTHING;
      `);

      // Seed Products
      await client.query(`
        INSERT INTO products (id, name, type, sales_price, cost, category) VALUES
        (1, 'Office Ergonomic Chair', 'goods', 25000.00, 15000.00, 'Furniture'),
        (2, 'Executive Wooden Desk', 'goods', 45000.00, 28000.00, 'Furniture'),
        (3, 'Interior Consultation Service', 'service', 10000.00, 2000.00, 'Services')
        ON CONFLICT DO NOTHING;
      `);

      // Seed Budgets
      await client.query(`
        INSERT INTO budgets (id, name, start_date, end_date, analytic_account_id, analytic_account_name, type, responsible, committed_amount, status) VALUES
        (1, 'Furniture Expense Q1', '2026-01-01', '2026-03-31', 2, 'Furniture', 'expense', 'Priya Shah', 200000.00, 'confirmed')
        ON CONFLICT DO NOTHING;
      `);

      // Seed Documents
      await client.query(`
        INSERT INTO documents (id, doc_type, number, contact_id, contact_name, doc_date, due_date, reference, status, total, amount_paid, amount_due) VALUES
        (1, 'PO', 'PO/2026/0001', 2, 'Apex Furnishings Ltd', '2026-01-10', '2026-02-10', 'PO-RAW-001', 'confirmed', 30000.00, 0.00, 30000.00),
        (2, 'VENDOR_BILL', 'Bill/2026/0001', 1, 'Rahul Sharma', '2026-01-15', '2026-02-15', 'ABC-26-001', 'confirmed', 6000.00, 0.00, 6000.00),
        (3, 'CUSTOMER_INVOICE', 'INV/2026/0001', 1, 'Rahul Sharma', '2026-01-20', '2026-02-20', 'SO-DIR-001', 'confirmed', 25000.00, 0.00, 25000.00)
        ON CONFLICT DO NOTHING;
      `);

      await client.query(`
        INSERT INTO document_lines (id, document_id, product_id, product_name, analytic_account_id, analytic_account_name, qty, unit_price, line_total) VALUES
        (1, 1, 1, 'Office Ergonomic Chair', 2, 'Furniture', 2, 15000.00, 30000.00),
        (2, 2, 1, 'Office Ergonomic Chair', 1, 'Project 1', 3, 2000.00, 6000.00),
        (3, 3, 1, 'Office Ergonomic Chair', 1, 'Project 1', 1, 25000.00, 25000.00)
        ON CONFLICT DO NOTHING;
      `);

      // Seed Journal Entries
      await client.query(`
        INSERT INTO journal_entries (id, journal_id, journal_name, document_id, entry_date, reference, status) VALUES
        (1, 2, 'Purchase', 2, '2026-01-15', 'Bill/2026/0001', 'posted'),
        (2, 1, 'Sales', 3, '2026-01-20', 'INV/2026/0001', 'posted')
        ON CONFLICT DO NOTHING;
      `);

      await client.query(`
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, contact_id, debit, credit) VALUES
        (1, 2, 'Purchase Expense A/c', NULL, 6000.00, 0.00),
        (1, 4, 'Creditors A/c', 1, 0.00, 6000.00),
        (2, 3, 'Debtors A/c', 1, 25000.00, 0.00),
        (2, 1, 'Sale Income A/c', NULL, 0.00, 25000.00);
      `);

      // Reset sequences
      await client.query(`
        SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
        SELECT setval('contacts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM contacts));
        SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));
        SELECT setval('accounts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM accounts));
        SELECT setval('journals_id_seq', (SELECT COALESCE(MAX(id), 1) FROM journals));
        SELECT setval('analytic_accounts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM analytic_accounts));
        SELECT setval('budgets_id_seq', (SELECT COALESCE(MAX(id), 1) FROM budgets));
        SELECT setval('documents_id_seq', (SELECT COALESCE(MAX(id), 1) FROM documents));
        SELECT setval('document_lines_id_seq', (SELECT COALESCE(MAX(id), 1) FROM document_lines));
        SELECT setval('journal_entries_id_seq', (SELECT COALESCE(MAX(id), 1) FROM journal_entries));
      `);
      console.log('✅ PostgreSQL seeded successfully.');
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
