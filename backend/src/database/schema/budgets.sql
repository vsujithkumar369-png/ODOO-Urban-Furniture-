CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50) NOT NULL,
    analytic_account_id INT NOT NULL REFERENCES analytic_accounts(id) ON DELETE CASCADE,
    analytic_account_name VARCHAR(255),
    type VARCHAR(50) DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'INCOME', 'EXPENSE')),
    responsible VARCHAR(255),
    committed_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (committed_amount >= 0),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'revised', 'cancelled', 'DRAFT', 'CONFIRMED', 'REVISED', 'CANCELLED')),
    revision_of_id INT REFERENCES budgets(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
