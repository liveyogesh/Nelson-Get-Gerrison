import axios from 'axios';

async function testSubmit() {
  try {
    const r = await axios.post('http://localhost:3000/api/auth/login', { email: 'EMP01', password: 'password123' });
    const token = r.data.token;
    console.log("Logged in:", token.slice(0,10));
    
    // try to submit gatepass
    try {
      const res2 = await axios.post('http://localhost:3000/api/gatepass', {
        type: 'PERSONAL',
        reason: 'Going to lunch',
        isPriority: false,
        priorityReason: ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(res2.data);
    } catch (e: any) {
      console.error(e.response?.status, e.response?.data);
    }

  } catch (e: any) {
    console.log("Login failed", e.response?.status);
  }
}

testSubmit();
