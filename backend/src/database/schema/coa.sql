CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'capital', 'income', 'expense', 'ASSET', 'LIABILITY', 'CAPITAL', 'INCOME', 'EXPENSE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
