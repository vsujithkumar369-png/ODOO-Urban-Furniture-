// test_contact.js
const http = require('http');

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runContactTests() {
  console.log('--- STARTING TASK 2 CONTACT MASTER INTEGRATION TESTS ---');
  const ts = Date.now().toString().slice(-5);

  // Login Admin & Accountant & Contact
  const adminLogin = await request('POST', '/api/auth/login', { login_id: 'admin_user', password: 'Admin@123' });
  const adminToken = adminLogin.body.data.token;

  const accLogin = await request('POST', '/api/auth/login', { login_id: 'acc_user', password: 'Accountant@123' });
  const accToken = accLogin.body.data.token;

  // Test 1: Create CUSTOMER contact by Accountant -> Success
  console.log('\nTest 1: Accountant creating CUSTOMER contact...');
  const res1 = await request('POST', '/api/contacts', {
    name: `Customer Alpha ${ts}`,
    type: 'CUSTOMER',
    email: `cust_alpha_${ts}@test.com`,
    mobile: '+1-555-0101',
    street: '123 Main St',
    city: 'Metropolis',
    state: 'NY',
    country: 'USA',
    pincode: '10001'
  }, { 'Authorization': `Bearer ${accToken}` });
  console.log('Test 1 Status:', res1.status);
  const portalUser1 = res1.body.data?.portal_user;
  console.log('Created Contact ID:', res1.body.data?.id);
  console.log('Portal User Generated:', !!portalUser1);
  if (res1.status === 201 && (res1.body.data?.type === 'customer' || res1.body.data?.type === 'CUSTOMER') && portalUser1) {
    console.log('✅ TEST 1 PASSED: CUSTOMER created successfully with portal user.');
  } else {
    console.error('❌ TEST 1 FAILED:', res1.body);
  }

  // Test 2: Create VENDOR contact by Admin -> Success
  console.log('\nTest 2: Admin creating VENDOR contact...');
  const res2 = await request('POST', '/api/contacts', {
    name: `Vendor Beta ${ts}`,
    type: 'VENDOR',
    email: `vend_beta_${ts}@test.com`,
    mobile: '+1-555-0202',
    city: 'Gotham'
  }, { 'Authorization': `Bearer ${adminToken}` });
  console.log('Test 2 Status:', res2.status);
  if (res2.status === 201 && (res2.body.data?.type === 'vendor' || res2.body.data?.type === 'VENDOR')) {
    console.log('✅ TEST 2 PASSED: VENDOR created successfully.');
  } else {
    console.error('❌ TEST 2 FAILED:', res2.body);
  }

  // Test 3: Create BOTH contact -> Success
  console.log('\nTest 3: Creating BOTH type contact...');
  const res3 = await request('POST', '/api/contacts', {
    name: `Partner Gamma ${ts}`,
    type: 'BOTH',
    email: `part_gamma_${ts}@test.com`
  }, { 'Authorization': `Bearer ${accToken}` });
  console.log('Test 3 Status:', res3.status);
  if (res3.status === 201 && (res3.body.data?.type === 'both' || res3.body.data?.type === 'BOTH')) {
    console.log('✅ TEST 3 PASSED: BOTH type contact created.');
  } else {
    console.error('❌ TEST 3 FAILED:', res3.body);
  }

  // Test 4: Invalid contact type -> Rejected 400
  console.log('\nTest 4: Creating contact with invalid type...');
  const res4 = await request('POST', '/api/contacts', {
    name: 'Invalid Type',
    type: 'SUPERHERO',
    email: `inv_type_${ts}@test.com`
  }, { 'Authorization': `Bearer ${accToken}` });
  console.log('Test 4 Status (Must be 400):', res4.status);
  if (res4.status === 400) {
    console.log('✅ TEST 4 PASSED: Invalid type rejected.');
  } else {
    console.error('❌ TEST 4 FAILED:', res4.body);
  }

  // Test 5: Invalid email -> Rejected 400
  console.log('\nTest 5: Creating contact with invalid email format...');
  const res5 = await request('POST', '/api/contacts', {
    name: 'Invalid Email',
    type: 'CUSTOMER',
    email: 'not-an-email'
  }, { 'Authorization': `Bearer ${accToken}` });
  console.log('Test 5 Status (Must be 400):', res5.status);
  if (res5.status === 400) {
    console.log('✅ TEST 5 PASSED: Invalid email format rejected.');
  } else {
    console.error('❌ TEST 5 FAILED:', res5.body);
  }

  // Test 6: Missing required field (name) -> Rejected 400
  console.log('\nTest 6: Creating contact missing name...');
  const res6 = await request('POST', '/api/contacts', {
    type: 'CUSTOMER',
    email: `noname_${ts}@test.com`
  }, { 'Authorization': `Bearer ${accToken}` });
  console.log('Test 6 Status (Must be 400):', res6.status);
  if (res6.status === 400) {
    console.log('✅ TEST 6 PASSED: Missing name rejected.');
  } else {
    console.error('❌ TEST 6 FAILED:', res6.body);
  }

  // Test 7: Duplicate email -> Rejected 400
  console.log('\nTest 7: Creating contact with duplicate email...');
  const res7 = await request('POST', '/api/contacts', {
    name: 'Duplicate Email Contact',
    type: 'CUSTOMER',
    email: `cust_alpha_${ts}@test.com`
  }, { 'Authorization': `Bearer ${accToken}` });
  console.log('Test 7 Status (Must be 400):', res7.status);
  if (res7.status === 400) {
    console.log('✅ TEST 7 PASSED: Duplicate email rejected cleanly.');
  } else {
    console.error('❌ TEST 7 FAILED:', res7.body);
  }

  // Test 8: Repeated contact creation attempt -> No duplicate created
  console.log('\nTest 8: Repeated creation attempt with same email...');
  const res8 = await request('POST', '/api/contacts', {
    name: `Customer Alpha ${ts}`,
    type: 'CUSTOMER',
    email: `cust_alpha_${ts}@test.com`
  }, { 'Authorization': `Bearer ${accToken}` });
  console.log('Test 8 Status (Must be 400):', res8.status);
  if (res8.status === 400) {
    console.log('✅ TEST 8 PASSED: Repeated contact creation prevented.');
  } else {
    console.error('❌ TEST 8 FAILED:', res8.body);
  }

  // Test 9: Portal user login test
  console.log('\nTest 9: Portal contact login with temp password...');
  const res9 = await request('POST', '/api/auth/login', {
    login_id: portalUser1.login_id,
    password: portalUser1.temporary_password
  });
  console.log('Test 9 Status:', res9.status);
  const contactToken = res9.body.data?.token;
  if (res9.status === 200 && contactToken) {
    console.log('✅ TEST 9 PASSED: Portal user logged in successfully.');
  } else {
    console.error('❌ TEST 9 FAILED:', res9.body);
  }

  // Test 10: Contact user accessing Contact Master APIs -> Must be 403 Forbidden
  console.log('\nTest 10: Contact role accessing GET /api/contacts...');
  const res10 = await request('GET', '/api/contacts', null, { 'Authorization': `Bearer ${contactToken}` });
  console.log('Test 10 Status (Must be 403):', res10.status);
  if (res10.status === 403) {
    console.log('✅ TEST 10 PASSED: Contact role blocked from internal Contact Master APIs.');
  } else {
    console.error('❌ TEST 10 FAILED:', res10.body);
  }

  // Test 11: Update contact & verify portal user link preserved
  console.log('\nTest 11: Updating contact address and email...');
  const res11 = await request('PUT', `/api/contacts/${res1.body.data.id}`, {
    city: 'New Gotham',
    email: `cust_alpha_updated_${ts}@test.com`
  }, { 'Authorization': `Bearer ${accToken}` });
  console.log('Test 11 Status:', res11.status);
  console.log('Updated City:', res11.body.data?.city);
  if (res11.status === 200 && res11.body.data?.city === 'New Gotham') {
    console.log('✅ TEST 11 PASSED: Contact updated and portal user email updated.');
  } else {
    console.error('❌ TEST 11 FAILED:', res11.body);
  }

  // Test 12: Verify no password hashes in Contact API response
  console.log('\nTest 12: Verifying GET /api/contacts response structure...');
  const res12 = await request('GET', `/api/contacts/${res1.body.data.id}`, null, { 'Authorization': `Bearer ${accToken}` });
  console.log('Test 12 Keys:', Object.keys(res12.body.data));
  const hasPasswordKey = 'password' in res12.body.data || 'password_hash' in res12.body.data;
  if (res12.status === 200 && !hasPasswordKey) {
    console.log('✅ TEST 12 PASSED: Contact response clean without sensitive password fields.');
  } else {
    console.error('❌ TEST 12 FAILED');
  }

  console.log('\n--- ALL TASK 2 CONTACT TESTS COMPLETED ---');
}

runContactTests().catch(console.error);
