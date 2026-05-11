import db from './server/db.js';
(async () => {
    try {
        const [a] = await db.query('DESCRIBE security_incidents');
        console.log("security_incidents:", a.map((c: any) => c.Field));
    } catch(e) {}
    process.exit(0);
})();
