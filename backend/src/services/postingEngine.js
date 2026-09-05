// backend/src/services/postingEngine.js
const { pool } = require('../config/db');

async function postDocumentEntry(document) {
  const isInvoice = document.doc_type === 'CUSTOMER_INVOICE';
  const isBill = document.doc_type === 'VENDOR_BILL';

  if (!isInvoice && !isBill) return null;

  const total = parseFloat(document.total) || 0;
  const entryDate = document.doc_date || new Date().toISOString().split('T')[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let journalId = isInvoice ? 1 : 2;
    let journalName = isInvoice ? 'Sales' : 'Purchase';

    const entryRes = await client.query(
      `INSERT INTO journal_entries (journal_id, journal_name, document_id, entry_date, reference, status)
       VALUES ($1, $2, $3, $4, $5, 'posted') RETURNING id`,
      [journalId, journalName, document.id, entryDate, document.number]
    );
    const entryId = entryRes.rows[0].id;

    if (isInvoice) {
      // Debit: Debtors A/c (account_id: 3)
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, contact_id, debit, credit)
         VALUES ($1, 3, 'Debtors A/c', $2, $3, 0)`,
        [entryId, document.contact_id, total]
      );
      // Credit: Sale Income A/c (account_id: 1)
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, contact_id, debit, credit)
         VALUES ($1, 1, 'Sale Income A/c', NULL, 0, $2)`,
        [entryId, total]
      );
    } else if (isBill) {
      // Debit: Purchase Expense A/c (account_id: 2)
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, contact_id, debit, credit)
         VALUES ($1, 2, 'Purchase Expense A/c', NULL, $2, 0)`,
        [entryId, total]
      );
      // Credit: Creditors A/c (account_id: 4)
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, contact_id, debit, credit)
         VALUES ($1, 4, 'Creditors A/c', $2, 0, $3)`,
        [entryId, document.contact_id, total]
      );
    }

    await client.query('COMMIT');
    return { id: entryId };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error posting document entry:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function postPaymentEntry(payment, document) {
  const isBank = payment.method === 'bank';
  const paymentAccountId = isBank ? 5 : 6;
  const paymentAccountName = isBank ? 'Bank A/c' : 'Cash A/c';
  const journalId = isBank ? 3 : 4;
  const journalName = isBank ? 'Bank' : 'Cash';
  const amount = parseFloat(payment.amount) || 0;
  const payDate = payment.pay_date || new Date().toISOString().split('T')[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ref = `Payment for ${document ? document.number : 'Doc #' + payment.document_id}`;
    const entryRes = await client.query(
      `INSERT INTO journal_entries (journal_id, journal_name, document_id, entry_date, reference, status)
       VALUES ($1, $2, $3, $4, $5, 'posted') RETURNING id`,
      [journalId, journalName, payment.document_id, payDate, ref]
    );
    const entryId = entryRes.rows[0].id;

    if (payment.direction === 'send') {
      // Paying vendor: Debit Creditors, Credit Bank/Cash
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, contact_id, debit, credit)
         VALUES ($1, 4, 'Creditors A/c', $2, $3, 0)`,
        [entryId, document ? document.contact_id : null, amount]
      );
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, contact_id, debit, credit)
         VALUES ($1, $2, $3, NULL, 0, $4)`,
        [entryId, paymentAccountId, paymentAccountName, amount]
      );
    } else {
      // Receiving from customer: Debit Bank/Cash, Credit Debtors
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, contact_id, debit, credit)
         VALUES ($1, $2, $3, NULL, $4, 0)`,
        [entryId, paymentAccountId, paymentAccountName, amount]
      );
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, contact_id, debit, credit)
         VALUES ($1, 3, 'Debtors A/c', $2, 0, $3)`,
        [entryId, document ? document.contact_id : null, amount]
      );
    }

    await client.query('COMMIT');
    return { id: entryId };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error posting payment entry:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  postDocumentEntry,
  postPaymentEntry
};
