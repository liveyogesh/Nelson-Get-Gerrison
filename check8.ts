import axios from 'axios';
async function test() {
  try {
    const r = await axios.post('http://localhost:3000/api/auth/login', { email: 'super_admin@nelsonhospital.com', password: 'password123' });
    console.log(r.data);
  } catch(e) {
    console.log(e.response?.status, e.response?.data);
  }
}
test();
