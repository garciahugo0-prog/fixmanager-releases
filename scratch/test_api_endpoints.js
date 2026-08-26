const https = require('https');

const apiKey = 'dtReIPlSfUOa4jakp4LyWCU0M2493d26aca4a6c0821ae2c71e153a6aciXPOVN2PEg7uZ0JTOUY84jy8574H14';
const nip = '26d8a9e17efc4f7c499772a25827df5uk2k8Y7aoM';

const body = JSON.stringify({
  key: apiKey,
  nip: nip
});

const endpoints = [
  '/api/getBalance',
  '/api/balance',
  '/getBalance',
  '/balance'
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.taecel.com',
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    console.log(`Testing ${options.hostname}${options.path}...`);

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        resolve({
          endpoint,
          status: res.statusCode,
          body: raw
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        endpoint,
        error: e.message
      });
    });

    req.write(body);
    req.end();
  });
}

async function run() {
  for (const ep of endpoints) {
    const result = await testEndpoint(ep);
    console.log('RESULT FOR', ep);
    if (result.error) {
      console.log('  Error:', result.error);
    } else {
      console.log('  Status:', result.status);
      console.log('  Body:', result.body);
    }
    console.log('-----------------------------');
  }
}

run();
