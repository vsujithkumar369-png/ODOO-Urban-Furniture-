const API_URL = 'http://localhost:4000/api';

async function runTest() {
  try {
    console.log('--- STARTING E2E TEST ---');

    // 1. Login
    console.log('\\n1. Logging in as admin...');
    const loginRes = await fetch(\`\${API_URL}/auth/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: 'admin', password: 'Admin@123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(JSON.stringify(loginData));
    const token = loginData.token;
    console.log('Login successful! Token acquired.');
    const headers = { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` };

    // 2. Create Contact
    console.log('\\n2. Creating a Vendor Contact...');
    const contactRes = await fetch(\`\${API_URL}/contacts\`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Vendor Co.',
        type: 'vendor',
        email: 'vendor@example.com',
        mobile: '1234567890',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001'
      })
    });
    const contact = await contactRes.json();
    console.log('Contact created:', contact.id);

    // 3. Create Product
    console.log('\\n3. Creating a Product...');
    const productRes = await fetch(\`\${API_URL}/products\`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Raw Material',
        type: 'goods',
        sales_price: 1500,
        cost: 1000,
        category: 'Raw Materials'
      })
    });
    const product = await productRes.json();
    console.log('Product created:', product.id);

    // 4. Create PO
    console.log('\\n4. Creating a Purchase Order...');
    const poRes = await fetch(\`\${API_URL}/documents\`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        doc_type: 'PO',
        contact_id: contact.id,
        doc_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
        reference: 'TEST_PO_01',
        lines: [
          {
            product_id: product.id,
            qty: 5,
            unit_price: 1000
          }
        ]
      })
    });
    const po = await poRes.json();
    console.log('PO created:', po.number, 'Total:', po.total);

    // 5. Confirm PO
    console.log('\\n5. Confirming PO...');
    const confirmPoRes = await fetch(\`\${API_URL}/documents/\${po.id}/confirm\`, { method: 'POST', headers });
    const confirmedPo = await confirmPoRes.json();
    console.log('PO Status:', confirmedPo.status);

    // 6. Convert to Vendor Bill
    console.log('\\n6. Converting PO to Vendor Bill...');
    const convertRes = await fetch(\`\${API_URL}/documents/\${po.id}/convert\`, { method: 'POST', headers });
    const bill = await convertRes.json();
    console.log('Vendor Bill created:', bill.number);

    // 7. Confirm Vendor Bill (Posts to Journal)
    console.log('\\n7. Confirming Vendor Bill (Posting)...');
    const confirmBillRes = await fetch(\`\${API_URL}/documents/\${bill.id}/confirm\`, { method: 'POST', headers });
    const confirmedBill = await confirmBillRes.json();
    console.log('Bill Status:', confirmedBill.status);

    // 8. Pay Vendor Bill
    console.log('\\n8. Recording Payment for Vendor Bill...');
    const paymentRes = await fetch(\`\${API_URL}/payments\`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        document_id: bill.id,
        direction: 'send',
        amount: bill.total,
        pay_date: new Date().toISOString(),
        method: 'bank',
        note: 'Payment for materials'
      })
    });
    const payment = await paymentRes.json();
    console.log('Payment successful. Document status is now:', payment.document_status);

    // 9. Fetch Reports
    console.log('\\n9. Fetching Reports...');
    const year = new Date().getFullYear();
    
    const plRes = await fetch(\`\${API_URL}/reports/profit-loss?year=\${year}\`, { headers });
    const pl = await plRes.json();
    console.log('--- Profit & Loss ---');
    console.log(JSON.stringify(pl, null, 2));

    const bsRes = await fetch(\`\${API_URL}/reports/balance-sheet?year=\${year}\`, { headers });
    const bs = await bsRes.json();
    console.log('--- Balance Sheet ---');
    console.log(JSON.stringify(bs, null, 2));

    console.log('\\n--- E2E TEST COMPLETED SUCCESSFULLY ---');
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

runTest();
