import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config/env.js';
import { db } from '../db/connection.js';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export class AuthService {
  public ensureDefaultAdmin(): void {
    const admin = db.prepare('SELECT * FROM users WHERE username = ?').get(CONFIG.adminUsername);
    if (!admin) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(CONFIG.adminPassword, salt);
      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, created_at)
        VALUES (?, ?, ?, 'admin', ?)
      `).run(id, CONFIG.adminUsername, hash, now);

      console.log(`[Auth] Default admin initialized with username: "${CONFIG.adminUsername}"`);
    }
  }

  public login(username: string, password: string): { token: string; user: AuthUser } | null {
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!row) {
      return null;
    }

    const isValid = bcrypt.compareSync(password, row.password_hash);
    if (!isValid) {
      return null;
    }

    const user: AuthUser = {
      id: row.id,
      username: row.username,
      role: row.role
    };

    const token = jwt.sign(user, CONFIG.jwtSecret, { expiresIn: '7d' });
    return { token, user };
  }

  public verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, CONFIG.jwtSecret) as AuthUser;
      return decoded;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const user = authService.verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
    return;
  }

  (req as any).user = user;
  next();
}
