import { Router, Request, Response } from 'express';
import { sessionService } from '../services/sessionService.js';
import { requireAuth } from '../services/authService.js';
import { db } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Public: allows the voice widget to fetch available personas
router.get('/', (req: Request, res: Response) => {
  const personas = sessionService.getPersonas();
  res.json({ personas });
});

router.get('/:id', (req: Request, res: Response) => {
  const persona = sessionService.getPersona(String(req.params.id));
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }
  res.json({ persona });
});

// Admin-only: create or update persona
router.post('/', requireAuth, (req: Request, res: Response) => {
  const { name, description, systemPrompt, voiceName, temperature, isDefault } = req.body;
  if (!name || !systemPrompt) {
    res.status(400).json({ error: 'Name and systemPrompt are required' });
    return;
  }

  const id = req.body.id || `persona-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  // If default, unset previous default
  if (isDefault) {
    db.prepare('UPDATE personas SET is_default = 0').run();
  }

  db.prepare(`
    INSERT INTO personas (id, name, description, system_prompt, voice_name, temperature, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      system_prompt = excluded.system_prompt,
      voice_name = excluded.voice_name,
      temperature = excluded.temperature,
      is_default = excluded.is_default,
      updated_at = excluded.updated_at
  `).run(
    id,
    name,
    description || '',
    systemPrompt,
    voiceName || 'Puck',
    temperature ?? 0.7,
    isDefault ? 1 : 0,
    now,
    now
  );

  const persona = sessionService.getPersona(id);
  res.json({ persona });
});

export default router;
