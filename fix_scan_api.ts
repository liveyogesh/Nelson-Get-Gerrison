import * as fs from 'fs';
let content = fs.readFileSync('server/routes/gatepass.ts', 'utf8');

const scanRoute = `
router.get('/lookup', authorizePermissions('PROCESS_GATEPASS_MOVEMENT', 'SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { qr, empId } = req.query;
    let query = '';
    let params: any[] = [];
    
    if (qr) {
      // Validate JWT
      let decoded: any;
      try {
        decoded = jwt.verify(qr as string, JWT_SECRET);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid or forged QR token' });
      }
      query = 'SELECT r.*, e.first_name, e.last_name FROM gatepass_requests r JOIN hr_employees e ON r.employee_id = e.employee_id WHERE r.request_id = ?';
      params = [decoded.request_id];
    } else if (empId) {
      query = 'SELECT r.*, e.first_name, e.last_name FROM gatepass_requests r JOIN hr_employees e ON r.employee_id = e.employee_id WHERE e.employee_code = ? ORDER BY r.request_id DESC LIMIT 1';
      params = [empId];
    } else {
      return res.status(400).json({ error: 'Provide qr or empId' });
    }

    const [rows]: any = await db.query(query, params);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Pass not found' });
    
    const pass = rows[0];
    res.json({
        id: pass.request_id,
        type: pass.request_type,
        employeeName: (pass.first_name + ' ' + (pass.last_name || '')).trim(),
        status: pass.current_status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
`;

if (!content.includes('/lookup')) {
  // insert before router.get('/:id/history'
  content = content.replace("router.get('/:id/history',", scanRoute + "\nrouter.get('/:id/history',");
  fs.writeFileSync('server/routes/gatepass.ts', content);
  console.log("Added /lookup API");
}
