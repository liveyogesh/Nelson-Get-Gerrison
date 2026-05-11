import db from './server/db.js';
(async () => {
    try {
        const [a] = await db.query('DESCRIBE gatepass_requests');
        console.log("gatepass_requests:", a.map((c: any) => c.Field));
    } catch(e) {}
    try {
        const [a] = await db.query('DESCRIBE audit_logs');
        console.log("audit_logs:", a.map((c: any) => c.Field));
    } catch(e) {}
    try {
        const [a] = await db.query('DESCRIBE restricted_zones');
        console.log("restricted_zones:", a.map((c: any) => c.Field));
    } catch(e) {}
    try {
        const [a] = await db.query('DESCRIBE gatepass_movements');
        console.log("gatepass_movements:", a.map((c: any) => c.Field));
    } catch(e) {}
    process.exit(0);
})();
