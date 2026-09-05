CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    doc_type VARCHAR(50) NOT NULL CHECK (doc_type IN ('PO', 'VENDOR_BILL', 'BILL', 'SO', 'CUSTOMER_INVOICE', 'INVOICE')),
    number VARCHAR(100) UNIQUE NOT NULL,
    contact_id INT NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    contact_name VARCHAR(255),
    source_document_id INT REFERENCES documents(id) ON DELETE SET NULL,
    source_document_number VARCHAR(100),
    doc_date VARCHAR(50) NOT NULL,
    due_date VARCHAR(50) NOT NULL,
    reference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'cancelled', 'DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED')),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_due >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_lines (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255),
    analytic_account_id INT REFERENCES analytic_accounts(id) ON DELETE SET NULL,
    analytic_account_name VARCHAR(255),
    qty NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (qty > 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_documents_contact ON documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_document_lines_doc ON document_lines(document_id);
