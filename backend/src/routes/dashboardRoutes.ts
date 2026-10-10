import { Router, Request, Response } from 'express';
import { sessionService } from '../services/sessionService.js';
import { defaultPricingService } from '../services/pricingService.js';
import { sseService } from '../services/sseService.js';
import { authService, requireAuth } from '../services/authService.js';

const router = Router();

// SSE Live Stream endpoint
// Supports both token query parameter (standard for EventSource) or Bearer header
router.get('/events', (req: Request, res: Response) => {
  const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
  if (!token || !authService.verifyToken(token)) {
    res.status(401).json({ error: 'Unauthorized SSE connection' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const clientId = `sse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  sseService.addClient(clientId, res);

  // Send initial ping and current summary
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, time: new Date().toISOString() })}\n\n`);
});

// Protect all standard dashboard analytical endpoints
router.use(requireAuth);

router.get('/summary', (req: Request, res: Response) => {
  const summary = sessionService.getDashboardSummary();
  res.json({ summary });
});

router.get('/trends', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string || '14', 10);
  const trends = sessionService.getDailyTrends(days);
  res.json({ trends });
});

router.get('/sessions', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string || '20', 10);
  const offset = parseInt(req.query.offset as string || '0', 10);
  const status = req.query.status as string;
  const personaId = req.query.personaId as string;
  const sortField = req.query.sortField as string;
  const sortOrder = req.query.sortOrder as 'ASC' | 'DESC';

  const result = sessionService.listSessions({
    limit,
    offset,
    status,
    personaId,
    sortField,
    sortOrder
  });

  res.json(result);
});

router.get('/sessions/:id', (req: Request, res: Response) => {
  const details = sessionService.getSessionDetails(String(req.params.id));
  if (!details) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(details);
});

router.get('/pricing', (req: Request, res: Response) => {
  const config = defaultPricingService.getPricingConfig();
  res.json({ pricing: config });
});

export default router;
