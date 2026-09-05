CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    direction VARCHAR(50) DEFAULT 'send' CHECK (direction IN ('send', 'receive', 'SEND', 'RECEIVE')),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount > 0),
    pay_date VARCHAR(50) NOT NULL,
    method VARCHAR(50) DEFAULT 'bank' CHECK (method IN ('cash', 'bank', 'CASH', 'BANK')),
    note TEXT,
    journal_entry_id INT REFERENCES journal_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_doc ON payments(document_id);
