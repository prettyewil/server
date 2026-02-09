const http = require('http');

const makeRequest = (path, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

const runTests = async () => {
    console.log('Running Error Handling Tests...');

    try {
        // 1. Test Invalid ID (CastError)
        console.log('\nTest 1: Invalid ID (expect 404 CastError handling)');
        const res1 = await makeRequest('/api/students/invalid_id_123');
        console.log(`Status: ${res1.status}`);
        console.log(`Body:`, res1.body);

        // 2. Test Register Missing Fields (ValidationError)
        console.log('\nTest 2: Register Missing Fields (expect 400 ValidationError handling)');
        const res2 = await makeRequest('/api/auth/register', 'POST', { email: 'test@example.com' }); // Missing password, etc.
        console.log(`Status: ${res2.status}`);
        console.log(`Body:`, res2.body);

        // 3. Test 404 Route
        console.log('\nTest 3: Non-existent Route (expect 404)');
        const res3 = await makeRequest('/api/non-existent-route');
        console.log(`Status: ${res3.status}`);
        console.log(`Body:`, res3.body);

    } catch (e) {
        console.error('Test failed (is server running?):', e.message);
    }
};

runTests();
