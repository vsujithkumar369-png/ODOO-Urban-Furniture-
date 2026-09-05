// backend/src/services/postingEngine.js
const store = require('../store');

function postDocumentEntry(document) {
  const isInvoice = document.doc_type === 'CUSTOMER_INVOICE';
  const isBill = document.doc_type === 'VENDOR_BILL';

  if (!isInvoice && !isBill) return null;

  const total = document.total || 0;
  let entry = null;

  if (isInvoice) {
    entry = {
      id: store.counters.journalEntry++,
      journal_id: 1,
      journal_name: 'Sales',
      document_id: document.id,
      entry_date: document.doc_date || new Date().toISOString().split('T')[0],
      reference: document.number,
      status: 'posted',
      lines: [
        {
          account_id: 3,
          account_name: 'Debtors A/c',
          contact_id: document.contact_id,
          debit: total,
          credit: 0
        },
        {
          account_id: 1,
          account_name: 'Sale Income A/c',
          contact_id: null,
          debit: 0,
          credit: total
        }
      ]
    };
  } else if (isBill) {
    entry = {
      id: store.counters.journalEntry++,
      journal_id: 2,
      journal_name: 'Purchase',
      document_id: document.id,
      entry_date: document.doc_date || new Date().toISOString().split('T')[0],
      reference: document.number,
      status: 'posted',
      lines: [
        {
          account_id: 2,
          account_name: 'Purchase Expense A/c',
          contact_id: null,
          debit: total,
          credit: 0
        },
        {
          account_id: 4,
          account_name: 'Creditors A/c',
          contact_id: document.contact_id,
          debit: 0,
          credit: total
        }
      ]
    };
  }

  if (entry) {
    store.journalEntries.push(entry);
  }

  return entry;
}

function postPaymentEntry(payment, document) {
  const isBank = payment.method === 'bank';
  const paymentAccountId = isBank ? 5 : 6;
  const paymentAccountName = isBank ? 'Bank A/c' : 'Cash A/c';
  const journalId = isBank ? 3 : 4;
  const journalName = isBank ? 'Bank' : 'Cash';
  const amount = payment.amount || 0;

  let lines = [];
  if (payment.direction === 'send') {
    // Paying vendor: Debit Creditors, Credit Bank/Cash
    lines = [
      {
        account_id: 4,
        account_name: 'Creditors A/c',
        contact_id: document ? document.contact_id : null,
        debit: amount,
        credit: 0
      },
      {
        account_id: paymentAccountId,
        account_name: paymentAccountName,
        contact_id: null,
        debit: 0,
        credit: amount
      }
    ];
  } else {
    // Receiving from customer: Debit Bank/Cash, Credit Debtors
    lines = [
      {
        account_id: paymentAccountId,
        account_name: paymentAccountName,
        contact_id: null,
        debit: amount,
        credit: 0
      },
      {
        account_id: 3,
        account_name: 'Debtors A/c',
        contact_id: document ? document.contact_id : null,
        debit: 0,
        credit: amount
      }
    ];
  }

  const entry = {
    id: store.counters.journalEntry++,
    journal_id: journalId,
    journal_name: journalName,
    document_id: payment.document_id,
    entry_date: payment.pay_date || new Date().toISOString().split('T')[0],
    reference: `Payment for ${document ? document.number : 'Doc #' + payment.document_id}`,
    status: 'posted',
    lines
  };

  store.journalEntries.push(entry);
  return entry;
}

module.exports = {
  postDocumentEntry,
  postPaymentEntry
};
