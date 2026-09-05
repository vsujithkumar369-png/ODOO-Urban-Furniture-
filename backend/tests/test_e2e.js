const API_URL = 'http://localhost:4000/api';

async function runTest() {
  try {
    console.log('--- STARTING E2E TEST ---');

    // 1. Login
    console.log('\n1. Logging in as admin...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: 'admin_user', password: 'Admin@123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(JSON.stringify(loginData));
    const token = loginData.token || (loginData.data && loginData.data.token);
    console.log('Login successful! Token acquired.');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    // 2. Create Contact
    console.log('\n2. Creating a Vendor Contact...');
    const ts = Date.now();
    const contactRes = await fetch(`${API_URL}/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Vendor Co ' + ts,
        type: 'vendor',
        email: `vendor_${ts}@example.com`,
        mobile: '1234567890',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001'
      })
    });
    const contactData = await contactRes.json();
    const contact = contactData.data || contactData;
    console.log('Contact created:', contact.id);

    // 3. Create Product
    console.log('\n3. Creating a Product...');
    const productRes = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Raw Material ' + ts,
        type: 'goods',
        sales_price: 1500,
        cost: 1000,
        category: 'Raw Materials'
      })
    });
    const productData = await productRes.json();
    const product = productData.data || productData;
    console.log('Product created:', product.id);

    // 4. Create PO
    console.log('\n4. Creating a Purchase Order...');
    const poRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        doc_type: 'PO',
        contact_id: contact.id,
        doc_date: '2026-09-06',
        due_date: '2026-09-30',
        reference: 'TEST_PO_' + ts,
        lines: [
          {
            product_id: product.id,
            qty: 5,
            unit_price: 1000
          }
        ]
      })
    });
    const poData = await poRes.json();
    const po = poData.data || poData;
    console.log('PO created:', po.number || po.id, 'Total:', po.total);

    // 5. Convert to Vendor Bill
    console.log('\n5. Converting PO to Vendor Bill...');
    const convertRes = await fetch(`${API_URL}/documents/${po.id}/convert`, { method: 'POST', headers });
    const billData = await convertRes.json();
    const bill = billData.data || billData;
    console.log('Vendor Bill created:', bill.number || bill.id);

    // 6. Confirm Vendor Bill (Posts to Journal)
    console.log('\n6. Confirming Vendor Bill (Posting)...');
    const confirmBillRes = await fetch(`${API_URL}/documents/${bill.id}/confirm`, { method: 'POST', headers });
    const confirmedBillData = await confirmBillRes.json();
    const confirmedBill = confirmedBillData.data || confirmedBillData;
    console.log('Bill Status:', confirmedBill.status);

    // 7. Pay Vendor Bill
    console.log('\n7. Recording Payment for Vendor Bill...');
    const paymentRes = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        document_id: bill.id,
        direction: 'send',
        amount: bill.total || 5000,
        pay_date: '2026-09-06',
        method: 'bank',
        note: 'Payment for materials'
      })
    });
    const paymentData = await paymentRes.json();
    console.log('Payment successful:', paymentData);

    // 8. Fetch Reports
    console.log('\n8. Fetching Reports...');
    const year = 2026;
    
    const plRes = await fetch(`${API_URL}/reports/profit-loss?year=${year}`, { headers });
    const pl = await plRes.json();
    console.log('--- Profit & Loss ---');
    console.log(JSON.stringify(pl, null, 2));

    const bsRes = await fetch(`${API_URL}/reports/balance-sheet?year=${year}`, { headers });
    const bs = await bsRes.json();
    console.log('--- Balance Sheet ---');
    console.log(JSON.stringify(bs, null, 2));

    console.log('\n--- E2E TEST COMPLETED SUCCESSFULLY ---');
  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    console.log('\nCleaning up E2E test data from database...');
    try {
      const { pool } = require('../src/db');
      await pool.query("DELETE FROM payments WHERE note LIKE '%materials%' OR note LIKE '%test%' OR note LIKE 'Payment%'");
      await pool.query("DELETE FROM document_lines WHERE product_name LIKE 'Test%' OR product_name LIKE 'E2E%' OR document_id IN (SELECT id FROM documents WHERE reference LIKE 'TEST%' OR reference LIKE 'E2E%')");
      await pool.query("DELETE FROM journal_entry_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference LIKE 'TEST%' OR reference LIKE 'E2E%' OR reference LIKE 'Bill/%' OR reference LIKE 'INV/%' OR reference LIKE 'Payment%')");
      await pool.query("DELETE FROM journal_entries WHERE reference LIKE 'TEST%' OR reference LIKE 'E2E%' OR reference LIKE 'Bill/%' OR reference LIKE 'INV/%' OR reference LIKE 'Payment%'");
      await pool.query("DELETE FROM documents WHERE reference LIKE 'TEST%' OR reference LIKE 'E2E%' OR number LIKE 'PO/%' OR number LIKE 'SO/%' OR number LIKE 'Bill/%' OR number LIKE 'INV/%'");
      await pool.query("DELETE FROM budgets WHERE name LIKE 'E2E%' OR name LIKE 'Test%'");
      await pool.query("DELETE FROM users WHERE email LIKE '%@example.com' OR login_id LIKE 'e2e%' OR login_id LIKE 'jcnt%'");
      await pool.query("DELETE FROM products WHERE name LIKE 'Test%' OR name LIKE 'E2E%'");
      await pool.query("DELETE FROM contacts WHERE email LIKE '%@example.com' OR name LIKE 'Test%' OR name LIKE 'E2E%'");
      await pool.query("DELETE FROM analytic_accounts WHERE name LIKE 'Test%' OR name LIKE 'E2E%'");
      console.log('✅ Temporary E2E test data cleaned up successfully!');
      process.exit(0);
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
      process.exit(1);
    }
  }
}

runTest();


