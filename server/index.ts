import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import securityRoutes from './routes/security.js';
import gatepassRoutes from './routes/gatepass.js';
import enterpriseRoutes from './routes/enterprise.js';
import rolesRoutes from './routes/roles.js';
import auditRoutes from './routes/audit.js';
import { processEscalations } from './utils/escalation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
    dotenv.config();

    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());

    // IMPORTANT: API routes must come BEFORE Vite middleware
    app.get('/api/health', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
    app.use('/api/auth', authRoutes);
    app.use('/api', adminRoutes);
    app.use('/api/security', securityRoutes);
    app.use('/api/gatepass', gatepassRoutes);
    app.use('/api/enterprise', enterpriseRoutes);
    app.use('/api', rolesRoutes);
    app.use('/api', auditRoutes);

    // Init DB (non-blocking)
    initDB().catch(console.error);

    // Simulate Escalation Engine
    setInterval(() => {
        processEscalations().catch(console.error);
    }, 60 * 1000);

    // Vite integration
    const isProd = process.env.NODE_ENV === 'production';
    
    if (!isProd) {
        console.log('Starting in DEVELOPMENT mode...');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        console.log('Starting in PRODUCTION mode...');
        const distPath = path.resolve(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.resolve(distPath, 'index.html'));
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);
