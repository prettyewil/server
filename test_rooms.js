const axios = require('axios');
axios.get('http://localhost:5000/api/rooms').then(res => {
    const room9 = res.data.find(r => r.roomNumber === '9');
    console.log(JSON.stringify(room9, null, 2));
}).catch(console.error);
