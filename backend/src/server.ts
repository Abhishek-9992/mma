import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { CONFIG } from './config/env.js';
import { initDatabase } from './db/connection.js';
import { authService } from './services/authService.js';
import { sessionService } from './services/sessionService.js';
import { geminiLiveProxy } from './services/geminiLiveProxy.js';
import authRoutes from './routes/authRoutes.js';
import personaRoutes from './routes/personaRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import voiceRoutes, { setupVoiceWebSocket } from './routes/voiceRoutes.js';

// Initialize Database & Defaults
initDatabase();
authService.ensureDefaultAdmin();
sessionService.ensureDefaultPersonas();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!req.path.startsWith('/api/dashboard/events')) {
      const ms = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} (${ms}ms)`);
    }
  });
  next();
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/voice', voiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    activeSessions: geminiLiveProxy.getActiveCount(),
    database: 'connected',
    geminiConfigured: !!CONFIG.geminiApiKey
  });
});

// Create HTTP and WebSocket servers
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

setupVoiceWebSocket(wss);

server.listen(CONFIG.port, '0.0.0.0', () => {
  console.log(`🚀 Voice Agent & Cost Analytics Server running on http://0.0.0.0:${CONFIG.port}`);
  console.log(`🎙️ Voice WebSocket Gateway available at ws://0.0.0.0:${CONFIG.port}/ws/voice`);
  console.log(`📊 SSE Live Dashboard stream available at http://0.0.0.0:${CONFIG.port}/api/dashboard/events`);
});

export { app, server };
