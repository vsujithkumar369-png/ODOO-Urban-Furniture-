// backend/src/store.js
// Clean in-memory store without artificial dummy records

const store = {
  users: [],

  coa: [
    { id: 1, name: "Sale Income A/c", type: "income" },
    { id: 2, name: "Purchase Expense A/c", type: "expense" },
    { id: 3, name: "Debtors A/c", type: "asset" },
    { id: 4, name: "Creditors A/c", type: "liability" },
    { id: 5, name: "Bank A/c", type: "asset" },
    { id: 6, name: "Cash A/c", type: "asset" },
    { id: 7, name: "Capital A/c", type: "capital" }
  ],

  journals: [
    { id: 1, name: "Sales", type: "sales", default_account_id: 1, default_account_name: "Sale Income A/c" },
    { id: 2, name: "Purchase", type: "purchase", default_account_id: 2, default_account_name: "Purchase Expense A/c" },
    { id: 3, name: "Bank", type: "bank", default_account_id: 5, default_account_name: "Bank A/c" },
    { id: 4, name: "Cash", type: "cash", default_account_id: 6, default_account_name: "Cash A/c" }
  ],

  analytics: [],
  contacts: [],
  products: [],
  budgets: [],
  documents: [],
  payments: [],
  journalEntries: [],

  counters: {
    user: 1,
    contact: 1,
    product: 1,
    coa: 8,
    journal: 5,
    analytic: 1,
    budget: 1,
    document: 1,
    docLine: 1,
    payment: 1,
    journalEntry: 1
  }
};

module.exports = store;
