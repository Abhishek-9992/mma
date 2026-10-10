import express from 'express';
import cors from 'cors';
import { CONFIG } from '../backend/src/config/env.js';
import { initDatabase } from '../backend/src/db/connection.js';
import { authService } from '../backend/src/services/authService.js';
import { sessionService } from '../backend/src/services/sessionService.js';
import authRoutes from '../backend/src/routes/authRoutes.js';
import personaRoutes from '../backend/src/routes/personaRoutes.js';
import dashboardRoutes from '../backend/src/routes/dashboardRoutes.js';
import voiceRoutes from '../backend/src/routes/voiceRoutes.js';

// Initialize Database & Default Data for Serverless Function invocation
try {
  initDatabase();
  authService.ensureDefaultAdmin();
  sessionService.ensureDefaultPersonas();
} catch (err) {
  console.error('[Vercel Serverless] Error initializing DB:', err);
}

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/voice', voiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: 'vercel-serverless',
    timestamp: new Date().toISOString(),
    database: 'connected',
    geminiConfigured: !!CONFIG.geminiApiKey
  });
});

export default app;
