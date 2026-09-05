CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'GOODS' CHECK (type IN ('GOODS', 'SERVICE', 'COMBO', 'goods', 'service', 'combo')),
    sales_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (sales_price >= 0),
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cost >= 0),
    category VARCHAR(100) DEFAULT 'General',
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
