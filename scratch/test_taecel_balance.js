const https = require('https');

const apiKey = 'dtReIPlSfUOa4jakp4LyWCU0M2493d26aca4a6c0821ae2c71e153a6aciXPOVN2PEg7uZ0JTOUY84jy8574H14';
const nip = '26d8a9e17efc4f7c499772a25827df5uk2k8Y7aoM';

const body = JSON.stringify({
  key: apiKey,
  nip: nip
});

const options = {
  hostname: 'ne.taecel.com',
  path: '/api/balance',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('Sending request to Taecel balance endpoint...');

const req = https.request(options, (res) => {
  let raw = '';
  res.on('data', (chunk) => raw += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', raw);
    try {
      console.log('PARSED:', JSON.parse(raw));
    } catch (e) {
      console.log('Could not parse response as JSON');
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(body);
req.end();
