-- Development Data Cleanup Script
-- Safe script to clean up temporary development/testing records while preserving core system configuration

BEGIN;

-- Delete development transactions
DELETE FROM payments WHERE note LIKE 'Payment%' OR note LIKE '%test%' OR note LIKE '%materials%';
DELETE FROM document_lines WHERE document_id IN (SELECT id FROM documents WHERE reference LIKE '%TEST%' OR reference LIKE '%E2E%');
DELETE FROM journal_entry_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference LIKE '%TEST%' OR reference LIKE '%E2E%' OR reference LIKE 'BILL/%' OR reference LIKE 'INV/%');
DELETE FROM journal_entries WHERE reference LIKE '%TEST%' OR reference LIKE '%E2E%' OR reference LIKE 'BILL/%' OR reference LIKE 'INV/%';
DELETE FROM documents WHERE reference LIKE '%TEST%' OR reference LIKE '%E2E%' OR number LIKE 'PO/%' OR number LIKE 'SO/%' OR number LIKE 'Bill/%' OR number LIKE 'INV/%';
DELETE FROM budgets WHERE name LIKE '%Test%' OR name LIKE '%E2E%';

-- Clean non-system temporary contacts & products
DELETE FROM users WHERE email LIKE '%@example.com' OR login_id LIKE 'e2e%';
DELETE FROM products WHERE name LIKE 'Test %' OR name LIKE 'E2E %';
DELETE FROM contacts WHERE email LIKE '%@example.com' OR name LIKE 'Test %' OR name LIKE 'E2E %';
DELETE FROM analytic_accounts WHERE name LIKE 'Test %' OR name LIKE 'E2E %';

COMMIT;
