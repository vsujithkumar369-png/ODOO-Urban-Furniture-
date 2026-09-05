# Real Data Integration Verification Report

**Urban Furniture Accounting System**  
**Date**: September 6, 2026

---

## 1. Verification Summary

| Test Phase | Execution Mode | Database Engine | Hardcoded Data Used? | Status |
|---|---|---|---|---|
| **Master Data CRUD** | Live REST API | PostgreSQL | No | **PASSED** |
| **PO -> Bill Conversion** | Live REST API | PostgreSQL | No | **PASSED** |
| **SO -> Invoice Conversion** | Live REST API | PostgreSQL | No | **PASSED** |
| **Payment Posting & Status Update** | Live REST API | PostgreSQL | No | **PASSED** |
| **Balanced Journal Entry Ledger** | Live REST API | PostgreSQL | No | **PASSED** |
| **Profit & Loss Live Calculation** | Live REST API | PostgreSQL | No | **PASSED** |
| **Balance Sheet Live Calculation** | Live REST API | PostgreSQL | No | **PASSED** |
| **Budget Report Calculation** | Live REST API | PostgreSQL | No | **PASSED** |
| **Contact Portal Security** | Live REST API | PostgreSQL | No | **PASSED** |

---

## 2. PostgreSQL Data Pipeline Audit

1. **Frontend Request**: Sent via `fetch` in `src/services/api.js`.
2. **Backend Express Route**: Received under `/api/*` endpoints.
3. **Middleware**: Auth JWT verified via `authenticateToken`; parameters validated via `middleware/validation.js`.
4. **PostgreSQL Pool**: Queries executed via `pg` pool (`backend/src/db.js`).
5. **Ledger Engine**: Double-entry journal postings generated automatically in `src/services/postingEngine.js`.
6. **Data Storage**: Stored in relational tables (`documents`, `document_lines`, `journal_entries`, `journal_entry_lines`, `payments`).
7. **Report Generation**: Dynamically calculated directly from `journal_entry_lines` debit/credit sums.

---

## 3. Real Data E2E Test Output

Run command: `node test_e2e.js`
- **PO Creation**: Purchase Order created (`PO/2026/0002`)
- **Bill Conversion**: Converted to Vendor Bill (`Bill/2026/0002`)
- **Payment Execution**: Recorded \$5,000 payment via Bank
- **Report Ledger Output**: Profit & Loss and Balance Sheet dynamically calculated from PostgreSQL records (`balanced: true`).
