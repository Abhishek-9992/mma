import { Router, Request, Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { parse } from 'url';
import { sessionService } from '../services/sessionService.js';
import { geminiLiveProxy } from '../services/geminiLiveProxy.js';
import { WebSocketChannelAdapter } from '../adapters/webSocketAdapter.js';

const router = Router();

// REST endpoint to initialize or pre-flight a voice session
router.post('/session', (req: Request, res: Response) => {
  const { personaId, modelName } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Web Client';

  const session = sessionService.createSession({
    personaId,
    modelName,
    clientIp,
    userAgent
  });

  const persona = sessionService.getPersona(session.personaId);

  res.json({
    sessionId: session.id,
    session,
    persona
  });
});

/**
 * Attaches the WebSocket Voice gateway to an existing HTTP server
 */
export function setupVoiceWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, req) => {
    const parsedUrl = parse(req.url || '', true);
    const pathname = parsedUrl.pathname;

    // Only handle /ws/voice endpoint
    if (pathname !== '/ws/voice' && pathname !== '/api/ws/voice') {
      return;
    }

    const query = parsedUrl.query;
    let sessionId = query.sessionId as string;
    const personaId = query.personaId as string;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Client';

    console.log(`[WS Voice] New incoming connection. Query sessionId: ${sessionId}, personaId: ${personaId}`);

    let session = sessionId ? sessionService.getSession(sessionId) : undefined;
    if (!session) {
      session = sessionService.createSession({
        id: sessionId,
        personaId,
        clientIp,
        userAgent
      });
      sessionId = session.id;
    }

    const persona = sessionService.getPersona(session.personaId) || sessionService.getDefaultPersona();
    const adapter = new WebSocketChannelAdapter(sessionId, ws);

    // Launch Gemini Live proxy session
    geminiLiveProxy.createSession(sessionId, adapter, persona);
  });
}

export default router;
