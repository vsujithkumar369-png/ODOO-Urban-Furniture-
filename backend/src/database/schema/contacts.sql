CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'customer' CHECK (type IN ('customer', 'vendor', 'both', 'CUSTOMER', 'VENDOR', 'BOTH')),
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_contact') THEN
    ALTER TABLE users 
      ADD CONSTRAINT fk_users_contact 
      FOREIGN KEY (contact_id) 
      REFERENCES contacts(id) 
      ON DELETE SET NULL;
  END IF;
END $$;
