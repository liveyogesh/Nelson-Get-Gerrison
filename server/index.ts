import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import gatepassRoutes from './routes/gatepass.js';
import visitorRoutes from './routes/visitors.js';
import zoneRoutes from './routes/zones.js';
import configRoutes from './routes/config.js';
import hrmsRoutes from './routes/hrms.js';
import workflowRoutes from './routes/workflow.js';
import integrationsRoutes from './routes/integrations.js';
import { fileURLToPath } from 'url';

import usersRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import lockdownRoutes from './routes/lockdown.js';
import complianceRoutes from './routes/compliance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize DB
initDB();

import { startEscalationWatcher } from './services/escalationWatcher.js';
import { startNotificationWorker } from './services/notificationWorker.js';
import { startArchivalWorker } from './services/archivalWorker.js';

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('authenticate_socket', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} authenticated as user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

import { createServer as createViteServer } from 'vite';

const PORT = 3000;

// Start background services
startEscalationWatcher(io);
startNotificationWorker(io);
startArchivalWorker();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/gatepass', gatepassRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/config', configRoutes);
app.use('/api/hrms', hrmsRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/lockdown', lockdownRoutes);
app.use('/api/compliance', complianceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), hospital: 'Nelson Hospital' });
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

