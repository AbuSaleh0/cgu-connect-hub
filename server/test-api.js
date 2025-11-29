const http = require('http');

// Simple test script to check if server is running and responding
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/posts?limit=5',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer ...' // We can't easily test auth without a valid Google token
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
