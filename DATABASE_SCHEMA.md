# Database Schema & Entity Relationships

**Urban Furniture Accounting System**

---

## Core Tables Overview

### 1. `users`
Stores authenticated users and system credentials with role-based access levels (`admin`, `accountant`, `contact`).
- **Primary Key**: `id`
- **Foreign Key**: `contact_id` → `contacts.id`

### 2. `contacts`
Master entity for Customers and Vendors.
- **Primary Key**: `id`
- **Unique Constraint**: `email`

### 3. `products`
Master catalog for Goods, Services, and Combo items.
- **Primary Key**: `id`
- **Unique Constraint**: `name`

### 4. `accounts` (Chart of Accounts)
Accounting classifications (Asset, Liability, Capital, Income, Expense).
- **Primary Key**: `id`

### 5. `journals`
Transaction log definition (Sales, Purchase, Bank, Cash).
- **Primary Key**: `id`
- **Foreign Key**: `default_account_id` → `accounts.id`

### 6. `analytic_accounts`
Cost center / profit center accounts for budget tracking.
- **Primary Key**: `id`
- **Unique Constraint**: `name`

### 7. `budgets`
Financial budget caps tied to analytic accounts.
- **Primary Key**: `id`
- **Foreign Keys**: 
  - `analytic_account_id` → `analytic_accounts.id`
  - `revision_of_id` → `budgets.id`

### 8. `documents` & `document_lines`
Header and line items for Purchase Orders, Vendor Bills, Sales Orders, and Customer Invoices.
- **Primary Key**: `documents.id`, `document_lines.id`
- **Foreign Keys**:
  - `documents.contact_id` → `contacts.id`
  - `documents.source_document_id` → `documents.id`
  - `document_lines.document_id` → `documents.id`
  - `document_lines.product_id` → `products.id`
  - `document_lines.analytic_account_id` → `analytic_accounts.id`

### 9. `journal_entries` & `journal_entry_lines`
Double-entry ledger postings (`Debit = Credit`).
- **Primary Key**: `journal_entries.id`, `journal_entry_lines.id`
- **Foreign Keys**:
  - `journal_entries.journal_id` → `journals.id`
  - `journal_entries.document_id` → `documents.id`
  - `journal_entry_lines.journal_entry_id` → `journal_entries.id`
  - `journal_entry_lines.account_id` → `accounts.id`

### 10. `payments`
Recorded payments against documents.
- **Primary Key**: `id`
- **Foreign Keys**:
  - `payments.document_id` → `documents.id`
  - `payments.journal_entry_id` → `journal_entries.id`
