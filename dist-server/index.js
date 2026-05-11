import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
// Initialize DB
initDB();
import { startEscalationWatcher } from './services/escalationWatcher.js';
const app = express();
const PORT = process.env.PORT_BACKEND || 3001;
// Start background services
startEscalationWatcher();
// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
// Static files (Production)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));
}
// Routes
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), hospital: 'Nelson Hospital' });
});
// Production SPA handling
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
