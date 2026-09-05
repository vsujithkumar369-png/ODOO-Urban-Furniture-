CREATE TABLE IF NOT EXISTS journals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('sales', 'purchase', 'bank', 'cash', 'SALES', 'PURCHASE', 'BANK', 'CASH')),
    default_account_id INT REFERENCES accounts(id) ON DELETE RESTRICT,
    default_account_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
