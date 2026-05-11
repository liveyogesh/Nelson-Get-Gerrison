import express from "express";
import { createServer as createViteServer } from "vite";
import mysql from 'mysql2/promise';
import { runEnterpriseHRMigration } from './enterprise_hr_migration.js';
import { HRNormalizationEngine } from './hr_normalization_engine.js';
import { HRProductionPromotion } from './hr_production_promotion.js';
import path from "path";

// Initialize database connection
async function getDbConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || '103.191.209.155',
    user: process.env.DB_USER || 'dexly_nlsngrisn_usr',
    password: process.env.DB_PASSWORD || 'E5@&ubfz0DGvtok8',
    database: process.env.DB_NAME || 'dexly_nlsngrisn_db',
    multipleStatements: true
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/migration/run-schema", async (req, res) => {
    try {
      const db = await getDbConnection();
      await runEnterpriseHRMigration(db);
      await db.end();
      res.json({ success: true, message: "Schema migration successful" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/migration/normalize", async (req, res) => {
    try {
      const { batchId } = req.body;
      if (!batchId) return res.status(400).json({ success: false, error: "Missing batchId" });
      const db = await getDbConnection();
      const engine = new HRNormalizationEngine(db);
      await engine.processBatch(batchId);
      await db.end();
      res.json({ success: true, message: `Normalization completed for batch ${batchId}` });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/migration/promote", async (req, res) => {
    try {
      const { batchId, facilityId } = req.body;
      if (!batchId || !facilityId) return res.status(400).json({ success: false, error: "Missing batchId or facilityId" });
      const db = await getDbConnection();
      const promoter = new HRProductionPromotion(db);
      await promoter.promoteBatchToProduction(batchId, facilityId);
      await db.end();
      res.json({ success: true, message: `Promotion completed for batch ${batchId}` });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/migration/stats", async (req, res) => {
    try {
      const db = await getDbConnection();
      // Gather some stats
      const [rawRows]: any = await db.query(`SELECT COUNT(*) as count FROM stg_hims_employee_import`);
      const [cleanedRows]: any = await db.query(`SELECT COUNT(*) as count FROM stg_employee_cleaned`);
      const [prodRows]: any = await db.query(`SELECT COUNT(*) as count FROM hr_employees`);
      
      const [batches]: any = await db.query(`SELECT DISTINCT import_batch_id FROM stg_hims_employee_import LIMIT 10`);

      await db.end();
      res.json({ 
        success: true, 
        stats: {
          raw: rawRows[0]?.count || 0,
          cleaned: cleanedRows[0]?.count || 0,
          production: prodRows[0]?.count || 0,
          batches: batches.map((b: any) => b.import_batch_id)
        }
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
