const axios = require('axios');
const fs = require('fs');

async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/users/staff', {
            firstName: "Test",
            lastName: "Employee",
            email: "testemp@dorm.com",
            password: "Password1!",
            role: "staff"
        });
        fs.writeFileSync('C:/Dorm/server/test-error.log', "Success: " + JSON.stringify(res.data, null, 2));
    } catch (err) {
        if (err.response && err.response.data) {
            fs.writeFileSync('C:/Dorm/server/test-error.log', "Error Message: " + err.response.data.message + "\nStack: " + err.response.data.stack);
        } else {
            fs.writeFileSync('C:/Dorm/server/test-error.log', "Error: " + err.message);
        }
    }
}
test();
