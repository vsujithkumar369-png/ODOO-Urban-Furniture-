# Urban Furniture Accounting — API Contract
### Base URL: `/api` · Format: JSON · Auth: Bearer JWT

---

## 0. Conventions (read this first)

**Auth header** (every request except `/auth/*`):
```
Authorization: Bearer <token>
```

**Standard success shape:**
```json
{ "data": { ... } }          // single object
{ "data": [ ... ] }          // list
```

**Standard error shape** (always this shape, any 4xx/5xx):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Email already exists" } }
```

**Common error codes:** `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (400), `UNBALANCED_ENTRY` (400), `SERVER_ERROR` (500)

**IDs:** all `id` fields are integers, auto-increment.

**Dates:** ISO 8601 strings, `"2026-01-31"` for dates, `"2026-01-31T10:00:00Z"` for timestamps.

**Money:** numbers (not strings), 2 decimal places, e.g. `25000.00`.

**Roles:** `admin` (includes accountant permissions), `contact` (portal user). Every endpoint below states which roles can call it.

---

## 1. Auth

### `POST /auth/signup`
Roles: public. Always creates a `contact`... wait — per spec, signup creates an **invoicing user** (`admin` role in our collapsed model). Contact-role users are created automatically when a Contact master record is made (see §2.1), not via this endpoint.

Request:
```json
{ "name": "Priya Shah", "login_id": "priya123", "email": "priya@ex.com", "password": "Str0ng!Pass" }
```
Response `201`:
```json
{ "data": { "id": 4, "name": "Priya Shah", "login_id": "priya123", "email": "priya@ex.com", "role": "admin" } }
```
Errors: `VALIDATION_ERROR` if `login_id` or `email` already taken.

### `POST /auth/login`
Roles: public.

Request:
```json
{ "login_id": "priya123", "password": "Str0ng!Pass" }
```
Response `200`:
```json
{ "data": { "token": "eyJhbGciOi...", "user": { "id": 4, "name": "Priya Shah", "role": "admin", "contact_id": null } } }
```
Errors: `UNAUTHORIZED` — `"Invalid Login Id or Password"` (use this exact message, it's in the spec).

> Frontend note: `user.role` decides what nav/screens render. `user.contact_id` is non-null only for `contact`-role users — use it to scope the portal view.

---

## 2. Master Data

All master-data resources follow the same shape: `GET list`, `GET :id`, `POST`, `PUT :id`. Roles: `admin` only, unless noted.

### 2.1 Contacts

```
GET    /contacts              ?type=customer|vendor|both  (optional filter)
GET    /contacts/:id
POST   /contacts
PUT    /contacts/:id
```

Object shape:
```json
{
  "id": 1,
  "name": "Rahul Sharma",
  "type": "vendor",
  "email": "rahul@ex.com",
  "mobile": "+91 9090090909",
  "city": "Ahmedabad",
  "state": "Gujarat",
  "pincode": "382007",
  "image_url": null
}
```
POST/PUT body: same shape minus `id`.

> Side effect: on `POST /contacts`, the backend auto-creates a linked `contact`-role user (login_id = email, a generated temp password) so that contact can access the portal. Frontend doesn't need to do anything extra here — just show a "portal access created" note in the confirmation.

### 2.2 Products
```
GET    /products
GET    /products/:id
POST   /products
PUT    /products/:id
```
```json
{
  "id": 1,
  "name": "Office Chair",
  "type": "goods",
  "sales_price": 25000.00,
  "cost": 15000.00,
  "category": "Furniture"
}
```
`type` enum: `goods | service | combo`

### 2.3 Chart of Accounts
```
GET    /coa
POST   /coa
PUT    /coa/:id
```
```json
{ "id": 1, "name": "Sale Income A/c", "type": "income" }
```
`type` enum: `asset | liability | capital | income | expense`
> These come pre-seeded (Cash, Bank, Debtors, Creditors, Sale Income, Purchase Expense, Capital). Frontend should treat POST here as rare/admin-only, not part of the main flow.

### 2.4 Journals
```
GET    /journals
POST   /journals
PUT    /journals/:id
```
```json
{ "id": 1, "name": "Sales", "type": "sales", "default_account_id": 5, "default_account_name": "Sale Income A/c" }
```
`type` enum: `sales | purchase | bank | cash`

### 2.5 Analytic Accounts
```
GET    /analytics
POST   /analytics
PUT    /analytics/:id
```
```json
{ "id": 1, "name": "Project 1", "type": "income" }
```
`type` enum: `income | expense`

### 2.6 Budgets
```
GET    /budgets
GET    /budgets/:id
POST   /budgets
PUT    /budgets/:id
POST   /budgets/:id/confirm
POST   /budgets/:id/revise
```
```json
{
  "id": 1,
  "name": "Furniture Expense Jan",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "analytic_account_id": 1,
  "analytic_account_name": "Furniture",
  "type": "expense",
  "responsible": "Priya Shah",
  "committed_amount": 200000.00,
  "achieved_amount": 10000.00,
  "achieved_percent": 5.0,
  "amount_to_achieve": 190000.00,
  "status": "confirmed",
  "revision_of_id": null
}
```
> `achieved_amount`, `achieved_percent`, `amount_to_achieve` are **computed by the backend**, read-only — don't send these on POST/PUT. They only populate once `status = confirmed`.

`GET /budgets/:id/achieved-documents` → list of the actual invoices/bills counted toward `achieved_amount` (for the "click achieved amount to see contributing docs" behavior in the mockup):
```json
{ "data": [ { "document_id": 12, "number": "INV/2026/0001", "amount": 21000.00, "doc_type": "CUSTOMER_INVOICE" } ] }
```

---

## 3. Documents (PO / Vendor Bill / SO / Customer Invoice)

One resource, filtered by `doc_type`. This is the unified table from the architecture doc — **build one form/list component on the frontend keyed off `doc_type`**, don't build four.

```
GET    /documents?doc_type=PO|VENDOR_BILL|SO|CUSTOMER_INVOICE&contact_id=&status=
GET    /documents/:id
POST   /documents
PUT    /documents/:id
POST   /documents/:id/confirm
POST   /documents/:id/convert     (PO -> VENDOR_BILL, SO -> CUSTOMER_INVOICE)
```

Roles: `admin` for all `doc_type`s. `contact` role: `GET` only, forced filter `contact_id = <their own>` and `doc_type=CUSTOMER_INVOICE` (server ignores any other filter a contact user sends).

Object shape (same for all 4 types — irrelevant fields are just `null`):
```json
{
  "id": 12,
  "doc_type": "VENDOR_BILL",
  "number": "Bill/2026/0001",
  "contact_id": 1,
  "contact_name": "Rahul Sharma",
  "source_document_id": 8,
  "source_document_number": "P00001",
  "doc_date": "2026-09-01",
  "due_date": "2026-09-30",
  "reference": "ABC-26-001",
  "status": "confirmed",
  "total": 6000.00,
  "amount_paid": 0.00,
  "amount_due": 6000.00,
  "lines": [
    {
      "id": 30,
      "product_id": 2,
      "product_name": "Office Chair",
      "analytic_account_id": 1,
      "analytic_account_name": "Project 1",
      "qty": 3,
      "unit_price": 2000.00,
      "line_total": 6000.00
    }
  ]
}
```

POST body (create a fresh document — `status` always starts `draft`, `number` is server-generated, don't send it):
```json
{
  "doc_type": "PO",
  "contact_id": 1,
  "doc_date": "2026-09-01",
  "due_date": "2026-09-30",
  "reference": "ABC-26-001",
  "lines": [
    { "product_id": 2, "analytic_account_id": 1, "qty": 3, "unit_price": 2000.00 }
  ]
}
```
Response `201`: full object as above, with server-computed `number`, `total`, `line_total`s.

### `POST /documents/:id/confirm`
Moves `draft → confirmed`. For `VENDOR_BILL` / `CUSTOMER_INVOICE`, this **triggers the Posting Engine** — a balanced Journal Entry is created automatically. No request body.
Response `200`: the updated document, plus the created entry reference:
```json
{ "data": { "id": 12, "status": "confirmed", "journal_entry_id": 45 } }
```
Errors: `UNBALANCED_ENTRY` should never actually surface if the engine is correct — but it's there in case you want a safety check.

### `POST /documents/:id/convert`
Only valid on a confirmed `PO` or `SO`. No body. Creates a new `VENDOR_BILL`/`CUSTOMER_INVOICE` document pre-filled from the source (contact, lines, quantities, prices), with `source_document_id` set.
Response `201`: the newly created Bill/Invoice object (same shape as above).

---

## 4. Payments

```
POST   /payments
GET    /payments?document_id=
```
Roles: `admin` for any document. `contact` role: only on their own `CUSTOMER_INVOICE`.

POST body:
```json
{ "document_id": 12, "direction": "send", "amount": 6000.00, "pay_date": "2026-09-05", "method": "bank", "note": "" }
```
`direction`: `"send"` (paying a Vendor Bill) or `"receive"` (receiving on a Customer Invoice) — backend derives the correct debit/credit side from this + the document's `doc_type`.

Response `201`:
```json
{ "data": { "id": 20, "document_id": 12, "amount": 6000.00, "journal_entry_id": 46 }, "document_status": "paid" }
```
> `document_status` tells the frontend to flip the document's badge (e.g. Invoice "Pay Now" → "Paid") without a second fetch.

Validation: `amount` cannot exceed the document's current `amount_due`. Error: `VALIDATION_ERROR`, `"Amount exceeds amount due"`.

---

## 5. Journals & Journal Entries (read-mostly)

```
GET    /journal-entries?journal_id=&document_id=
GET    /journal-entries/:id
```
Roles: `admin` only.

```json
{
  "id": 45,
  "journal_id": 2,
  "journal_name": "Purchase",
  "document_id": 12,
  "entry_date": "2026-09-01",
  "reference": "Bill/2026/0001",
  "status": "posted",
  "lines": [
    { "account_id": 6, "account_name": "Purchase Expense A/c", "contact_id": null, "debit": 6000.00, "credit": 0 },
    { "account_id": 4, "account_name": "Creditors A/c", "contact_id": 1, "debit": 0, "credit": 6000.00 }
  ]
}
```
> Every entry's `lines` always sum to equal debit and credit totals — the frontend can render a simple sanity-check total row without needing backend help.

---

## 6. Reports

All three are `GET`, `admin` only, no request body.

### `GET /reports/profit-loss?year=2026`
```json
{
  "data": {
    "year": 2026,
    "income": { "sales": 10000.00, "total": 10000.00 },
    "expenses": { "purchase": 7000.00, "other": 0.00, "total": 7000.00 },
    "net_income": 3000.00
  }
}
```

### `GET /reports/balance-sheet?year=2026`
```json
{
  "data": {
    "year": 2026,
    "assets": { "bank": 4000.00, "cash": 0.00, "debtors": 21000.00, "other": 0.00, "total": 25000.00 },
    "liabilities": { "creditors": 6000.00, "other": 0.00, "total": 6000.00 },
    "capital": { "capital_account": 16000.00, "net_income": 3000.00, "total": 19000.00 },
    "balanced": true
  }
}
```
> `balanced` = `assets.total === liabilities.total + capital.total`. Frontend should show a visible red flag if this is ever `false` — it means a backend bug, not a data issue.

### `GET /reports/budget-report`
```json
{
  "data": [
    {
      "id": 1,
      "name": "Furniture Expense Jan",
      "start_date": "2026-01-01",
      "end_date": "2026-01-31",
      "status": "confirmed",
      "committed_amount": 200000.00,
      "achieved_amount": 10000.00,
      "achieved_percent": 5.0
    }
  ]
}
```

---

## 7. HTTP status code cheat sheet (for the frontend's error handling)

| Code | Meaning | Frontend behavior |
|---|---|---|
| 200 | OK | render data |
| 201 | Created | render + navigate to new record |
| 400 | Validation / business rule error | show `error.message` inline near the offending field |
| 401 | Not logged in / bad token | redirect to login |
| 403 | Logged in but wrong role | show "not authorized" toast, don't redirect |
| 404 | Not found | show empty state |
| 500 | Server error | generic "something went wrong" toast |

---

## 8. What's intentionally NOT in this contract (MVP cuts)

Matches the scope cuts in the architecture doc — don't build frontend screens expecting these unless we add them later: Kanban views, email-send on invoices (Print/PDF only), granular Admin-vs-Accountant permission differences (both map to `admin` role for now).
