// backend/src/store.js
// In-memory data store initialized with realistic seeded data for Urban Furniture

const store = {
  users: [
    { id: 1, name: "Priya Shah", login_id: "priya123", email: "priya@ex.com", password: "Str0ng!Pass", role: "admin", contact_id: null },
    { id: 2, name: "Admin User", login_id: "admin", email: "admin@urbanfurniture.com", password: "admin", role: "admin", contact_id: null },
    { id: 3, name: "Accountant", login_id: "accountant", email: "accountant@urbanfurniture.com", password: "accountant", role: "admin", contact_id: null },
    { id: 4, name: "Rahul Sharma", login_id: "rahul@ex.com", email: "rahul@ex.com", password: "portal123", role: "contact", contact_id: 1 }
  ],

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

  analytics: [
    { id: 1, name: "Project 1", type: "income" },
    { id: 2, name: "Furniture", type: "expense" },
    { id: 3, name: "Interior Design", type: "income" }
  ],

  contacts: [
    {
      id: 1,
      name: "Rahul Sharma",
      type: "both",
      email: "rahul@ex.com",
      mobile: "+91 9090090909",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "382007",
      image_url: null
    },
    {
      id: 2,
      name: "Apex Furnishings Ltd",
      type: "vendor",
      email: "vendor@apex.com",
      mobile: "+91 9876543210",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      image_url: null
    },
    {
      id: 3,
      name: "Modern Living Spaces",
      type: "customer",
      email: "client@modernliving.com",
      mobile: "+91 9123456780",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      image_url: null
    }
  ],

  products: [
    {
      id: 1,
      name: "Office Ergonomic Chair",
      type: "goods",
      sales_price: 25000.00,
      cost: 15000.00,
      category: "Furniture"
    },
    {
      id: 2,
      name: "Executive Wooden Desk",
      type: "goods",
      sales_price: 45000.00,
      cost: 28000.00,
      category: "Furniture"
    },
    {
      id: 3,
      name: "Interior Consultation Service",
      type: "service",
      sales_price: 10000.00,
      cost: 2000.00,
      category: "Services"
    }
  ],

  budgets: [
    {
      id: 1,
      name: "Furniture Expense Q1",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
      analytic_account_id: 2,
      analytic_account_name: "Furniture",
      type: "expense",
      responsible: "Priya Shah",
      committed_amount: 200000.00,
      achieved_amount: 15000.00,
      achieved_percent: 7.5,
      amount_to_achieve: 185000.00,
      status: "confirmed",
      revision_of_id: null
    }
  ],

  documents: [
    {
      id: 1,
      doc_type: "PO",
      number: "PO/2026/0001",
      contact_id: 2,
      contact_name: "Apex Furnishings Ltd",
      source_document_id: null,
      source_document_number: null,
      doc_date: "2026-01-10",
      due_date: "2026-02-10",
      reference: "PO-RAW-001",
      status: "confirmed",
      total: 30000.00,
      amount_paid: 0.00,
      amount_due: 30000.00,
      lines: [
        {
          id: 1,
          product_id: 1,
          product_name: "Office Ergonomic Chair",
          analytic_account_id: 2,
          analytic_account_name: "Furniture",
          qty: 2,
          unit_price: 15000.00,
          line_total: 30000.00
        }
      ]
    },
    {
      id: 2,
      doc_type: "VENDOR_BILL",
      number: "Bill/2026/0001",
      contact_id: 1,
      contact_name: "Rahul Sharma",
      source_document_id: null,
      source_document_number: null,
      doc_date: "2026-01-15",
      due_date: "2026-02-15",
      reference: "ABC-26-001",
      status: "confirmed",
      total: 6000.00,
      amount_paid: 0.00,
      amount_due: 6000.00,
      lines: [
        {
          id: 2,
          product_id: 1,
          product_name: "Office Ergonomic Chair",
          analytic_account_id: 1,
          analytic_account_name: "Project 1",
          qty: 3,
          unit_price: 2000.00,
          line_total: 6000.00
        }
      ]
    },
    {
      id: 3,
      doc_type: "CUSTOMER_INVOICE",
      number: "INV/2026/0001",
      contact_id: 1,
      contact_name: "Rahul Sharma",
      source_document_id: null,
      source_document_number: null,
      doc_date: "2026-01-20",
      due_date: "2026-02-20",
      reference: "SO-DIR-001",
      status: "confirmed",
      total: 25000.00,
      amount_paid: 0.00,
      amount_due: 25000.00,
      lines: [
        {
          id: 3,
          product_id: 1,
          product_name: "Office Ergonomic Chair",
          analytic_account_id: 1,
          analytic_account_name: "Project 1",
          qty: 1,
          unit_price: 25000.00,
          line_total: 25000.00
        }
      ]
    }
  ],

  payments: [],

  journalEntries: [
    {
      id: 1,
      journal_id: 2,
      journal_name: "Purchase",
      document_id: 2,
      entry_date: "2026-01-15",
      reference: "Bill/2026/0001",
      status: "posted",
      lines: [
        { account_id: 2, account_name: "Purchase Expense A/c", contact_id: null, debit: 6000.00, credit: 0.00 },
        { account_id: 4, account_name: "Creditors A/c", contact_id: 1, debit: 0.00, credit: 6000.00 }
      ]
    },
    {
      id: 2,
      journal_id: 1,
      journal_name: "Sales",
      document_id: 3,
      entry_date: "2026-01-20",
      reference: "INV/2026/0001",
      status: "posted",
      lines: [
        { account_id: 3, account_name: "Debtors A/c", contact_id: 1, debit: 25000.00, credit: 0.00 },
        { account_id: 1, account_name: "Sale Income A/c", contact_id: null, debit: 0.00, credit: 25000.00 }
      ]
    }
  ],

  counters: {
    user: 5,
    contact: 4,
    product: 4,
    coa: 8,
    journal: 5,
    analytic: 4,
    budget: 2,
    document: 4,
    docLine: 4,
    payment: 1,
    journalEntry: 3
  }
};

module.exports = store;
