// test_api.js - Diagnostic API Tester

const http = require('http');

function post(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'GET',
      headers
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  try {
    console.log('Logging in...');
    const loginRes = await post('http://localhost:3000/api/auth/login', {
      email: 'admin@premiumresize.com',
      password: 'admin1234'
    });
    console.log('Login Response:', loginRes.status, loginRes.body);

    if (loginRes.status !== 200) {
      console.log('Login failed');
      return;
    }

    const { token } = JSON.parse(loginRes.body);
    const headers = { 'Authorization': `Bearer ${token}` };

    console.log('\nFetching stats...');
    const statsRes = await get('http://localhost:3000/api/license/stats', headers);
    console.log('Stats Response:', statsRes.status, statsRes.body);

    console.log('\nFetching licenses...');
    const listRes = await get('http://localhost:3000/api/license/list', headers);
    console.log('Licenses Response:', listRes.status, listRes.body);
  } catch (err) {
    console.error('Connection / Request Error:', err);
  }
}

run();
