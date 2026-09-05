CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    journal_id INT NOT NULL REFERENCES journals(id) ON DELETE RESTRICT,
    journal_name VARCHAR(255),
    document_id INT REFERENCES documents(id) ON DELETE SET NULL,
    entry_date VARCHAR(50) NOT NULL,
    reference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'DRAFT', 'POSTED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    account_name VARCHAR(255),
    contact_id INT REFERENCES contacts(id) ON DELETE SET NULL,
    debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (debit >= 0),
    credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (credit >= 0)
);

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
