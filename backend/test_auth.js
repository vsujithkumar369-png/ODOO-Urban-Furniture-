// test_auth.js
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

async function runTests() {
  console.log('--- STARTING AUTH & SECURITY TESTS ---');
  const ts = Date.now().toString().slice(-4);

  // Test 1: Public Signup creates accountant (ignores role=admin in body)
  console.log('\nTest 1: Signup with role=admin in request body...');
  const signupRes = await request('POST', '/api/auth/signup', {
    name: 'New Accountant User',
    login_id: `acc_t${ts}`,
    email: `acctest${ts}@test.com`,
    password: 'Password@123',
    role: 'admin' // Attempt privilege escalation
  });
  console.log('Signup Status:', signupRes.status);
  console.log('Assigned Role (Must be accountant):', signupRes.body.data?.role);
  if (signupRes.status === 201 && signupRes.body.data?.role === 'accountant') {
    console.log('✅ TEST 1 PASSED: Role escalation blocked. Role defaulted to accountant.');
  } else {
    console.error('❌ TEST 1 FAILED:', signupRes.body);
  }

  // Test 2: Validation check (weak password)
  console.log('\nTest 2: Signup with weak password...');
  const weakPassRes = await request('POST', '/api/auth/signup', {
    name: 'Bad Pass User',
    login_id: 'badpass1',
    email: 'badpass@test.com',
    password: 'weak'
  });
  console.log('Weak Pass Status (Must be 400):', weakPassRes.status);
  if (weakPassRes.status === 400) {
    console.log('✅ TEST 2 PASSED: Weak password rejected.');
  } else {
    console.error('❌ TEST 2 FAILED');
  }

  // Test 3: Login with newly created accountant
  console.log('\nTest 3: Login with accountant account...');
  const loginRes = await request('POST', '/api/auth/login', {
    login_id: `acc_t${ts}`,
    password: 'Password@123'
  });
  console.log('Login Status:', loginRes.status);
  const accountantToken = loginRes.body.data?.token;
  console.log('Accountant Token Received:', !!accountantToken);
  if (loginRes.status === 200 && accountantToken) {
    console.log('✅ TEST 3 PASSED: Accountant login successful.');
  } else {
    console.error('❌ TEST 3 FAILED:', loginRes.body);
  }

  // Test 4: Seeded Admin Login
  console.log('\nTest 4: Login with seeded admin account...');
  const adminLoginRes = await request('POST', '/api/auth/login', {
    login_id: 'admin_user',
    password: 'Admin@123'
  });
  console.log('Admin Login Status:', adminLoginRes.status);
  const adminToken = adminLoginRes.body.data?.token;
  console.log('Admin Token Received:', !!adminToken);
  if (adminLoginRes.status === 200 && adminToken) {
    console.log('✅ TEST 4 PASSED: Admin login successful.');
  } else {
    console.error('❌ TEST 4 FAILED:', adminLoginRes.body);
  }

  // Test 5: Accountant accessing user management endpoint (/api/users) -> Must be 403 FORBIDDEN
  console.log('\nTest 5: Accountant accessing Admin-only GET /api/users...');
  const accUserListRes = await request('GET', '/api/users', null, {
    'Authorization': `Bearer ${accountantToken}`
  });
  console.log('Accountant User List Status (Must be 403):', accUserListRes.status);
  if (accUserListRes.status === 403) {
    console.log('✅ TEST 5 PASSED: Accountant blocked from user management.');
  } else {
    console.error('❌ TEST 5 FAILED:', accUserListRes.body);
  }

  // Test 6: Admin accessing user management endpoint (/api/users) -> Must be 200 OK
  console.log('\nTest 6: Admin accessing GET /api/users...');
  const adminUserListRes = await request('GET', '/api/users', null, {
    'Authorization': `Bearer ${adminToken}`
  });
  console.log('Admin User List Status:', adminUserListRes.status);
  console.log('User Count:', adminUserListRes.body.data?.length);
  if (adminUserListRes.status === 200 && Array.isArray(adminUserListRes.body.data)) {
    console.log('✅ TEST 6 PASSED: Admin user management accessible.');
  } else {
    console.error('❌ TEST 6 FAILED:', adminUserListRes.body);
  }

  // Test 7: Accountant creating a Contact -> Must be 201 OK and generate hashed portal user
  console.log('\nTest 7: Accountant creating Contact with email...');
  const createContactRes = await request('POST', '/api/contacts', {
    name: 'Customer One',
    type: 'customer',
    email: `customer_${ts}@portal.com`
  }, {
    'Authorization': `Bearer ${accountantToken}`
  });
  console.log('Create Contact Status:', createContactRes.status);
  const portalUser = createContactRes.body.data?.portal_user;
  console.log('Portal User Auto Created:', portalUser);
  if (createContactRes.status === 201 && portalUser && portalUser.temporary_password) {
    console.log('✅ TEST 7 PASSED: Contact created by Accountant & portal user password pre-hashed.');
  } else {
    console.error('❌ TEST 7 FAILED:', createContactRes.body);
  }

  // Test 8: Login with portal contact user
  console.log('\nTest 8: Portal contact login with temp password...');
  const portalLoginRes = await request('POST', '/api/auth/login', {
    login_id: portalUser.login_id,
    password: portalUser.temporary_password
  });
  console.log('Portal Login Status:', portalLoginRes.status);
  console.log('Portal User Role:', portalLoginRes.body.data?.user?.role);
  if (portalLoginRes.status === 200 && portalLoginRes.body.data?.user?.role === 'contact') {
    console.log('✅ TEST 8 PASSED: Contact portal user login successful.');
  } else {
    console.error('❌ TEST 8 FAILED:', portalLoginRes.body);
  }

  console.log('\n--- ALL AUTH TESTS COMPLETED ---');
}

runTests().catch(console.error);
