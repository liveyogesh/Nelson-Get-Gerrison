import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || '103.191.209.155',
  user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
  password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
  database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
};

async function test() {
  const connection = await mysql.createConnection(dbConfig);
  try {
     const [rows] = await connection.query('DESCRIBE gatepass_approvals');
     console.log(rows);
  } catch (e: any) {
     console.log(e.message);
  }
  await connection.end();
}
test();
