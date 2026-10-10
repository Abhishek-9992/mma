import { Router, Request, Response } from 'express';
import { authService, requireAuth } from '../services/authService.js';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const result = authService.login(username, password);
  if (!result) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  res.json(result);
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

export default router;
