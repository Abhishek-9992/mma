import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import {
  DashboardSummary,
  DailyTrendPoint,
  GeminiUsageMetadata,
  Message,
  Persona,
  Session,
  SessionStatus,
  UsageEvent
} from '../models/types.js';
import { defaultPricingService } from './pricingService.js';
import { sseService } from './sseService.js';

export class SessionService {
  /**
   * Initializes default personas if the table is empty.
   */
  public ensureDefaultPersonas(): void {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM personas').get() as { count: number };
    if (countRow.count === 0) {
      const now = new Date().toISOString();
      const defaultPersonas = [
        {
          id: 'persona-general',
          name: 'Nova - Friendly Assistant',
          description: 'A versatile, polite, and helpful general-purpose AI voice agent.',
          system_prompt: 'You are Nova, an intelligent, empathetic, and succinct voice assistant. Respond conversationally and naturally. Keep spoken responses concise and punchy for realistic real-time speech.',
          voice_name: 'Aoede',
          temperature: 0.7,
          is_default: 1,
          created_at: now,
          updated_at: now
        },
        {
          id: 'persona-support',
          name: 'Atlas - Customer Support Specialist',
          description: 'Patient, professional support agent ready to resolve technical inquiries.',
          system_prompt: 'You are Atlas, a professional customer support specialist for a tech platform. Always maintain a calm, courteous demeanor. Clarify issues quickly and offer concrete step-by-step solutions.',
          voice_name: 'Puck',
          temperature: 0.6,
          is_default: 0,
          created_at: now,
          updated_at: now
        },
        {
          id: 'persona-sales',
          name: 'Zephyr - Consultative Sales Executive',
          description: 'Enthusiastic, consultative advisor discovering client needs and pitching solutions.',
          system_prompt: 'You are Zephyr, a consultative enterprise sales specialist. Ask smart qualifying questions, highlight return on investment (ROI), and suggest relevant product packages.',
          voice_name: 'Fenrir',
          temperature: 0.7,
          is_default: 0,
          created_at: now,
          updated_at: now
        },
        {
          id: 'persona-concierge',
          name: 'Lyra - Executive Concierge',
          description: 'Sophisticated concierge managing reservations, agendas, and priority requests.',
          system_prompt: 'You are Lyra, an elite luxury concierge. Speak with warmth, elegance, and supreme efficiency. Assist with bookings, recommendations, and executive scheduling.',
          voice_name: 'Kore',
          temperature: 0.5,
          is_default: 0,
          created_at: now,
          updated_at: now
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO personas (id, name, description, system_prompt, voice_name, temperature, is_default, created_at, updated_at)
        VALUES (@id, @name, @description, @system_prompt, @voice_name, @temperature, @is_default, @created_at, @updated_at)
      `);

      for (const p of defaultPersonas) {
        stmt.run(p);
      }
      console.log('[DB] Seeded default personas.');
    }
  }

  public getPersonas(): Persona[] {
    return db.prepare('SELECT * FROM personas ORDER BY is_default DESC, name ASC').all() as Persona[];
  }

  public getPersona(id: string): Persona | undefined {
    return db.prepare('SELECT * FROM personas WHERE id = ?').get(id) as Persona | undefined;
  }

  public getDefaultPersona(): Persona {
    let p = db.prepare('SELECT * FROM personas WHERE is_default = 1 LIMIT 1').get() as Persona | undefined;
    if (!p) {
      p = db.prepare('SELECT * FROM personas LIMIT 1').get() as Persona | undefined;
    }
    if (!p) {
      this.ensureDefaultPersonas();
      p = db.prepare('SELECT * FROM personas LIMIT 1').get() as Persona;
    }
    return p;
  }

  public createSession(params: {
    id?: string;
    personaId?: string;
    modelName?: string;
    clientIp?: string;
    userAgent?: string;
  }): Session {
    const id = params.id || uuidv4();
    const persona = params.personaId ? this.getPersona(params.personaId) : this.getDefaultPersona();
    const personaId = persona?.id || 'persona-general';
    const personaName = persona?.name || 'General Assistant';
    const modelName = params.modelName || defaultPricingService.getPricingConfig().defaultModel;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO sessions (
        id, persona_id, persona_name, status, started_at, model_name,
        prompt_tokens_text, prompt_tokens_audio, candidates_tokens_text, candidates_tokens_audio,
        total_tokens, total_cost_usd, client_ip, user_agent
      ) VALUES (
        @id, @personaId, @personaName, 'active', @startedAt, @modelName,
        0, 0, 0, 0, 0, 0.0, @clientIp, @userAgent
      )
    `);

    insertStmt.run({
      id,
      personaId,
      personaName,
      startedAt: now,
      modelName,
      clientIp: params.clientIp || null,
      userAgent: params.userAgent || null
    });

    const session = this.getSession(id)!;
    sseService.broadcast('session:created', session);
    return session;
  }

  public getSession(id: string): Session | undefined {
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined;
  }

  public addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string, audioDurationMs = 0): Message {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO messages (id, session_id, role, content, timestamp, audio_duration_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, role, content, timestamp, audioDurationMs);

    const message: Message = { id, sessionId, role, content, timestamp, audioDurationMs };
    sseService.broadcast('transcript:update', message);
    return message;
  }

  public recordUsage(sessionId: string, metadata: GeminiUsageMetadata): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    // Calculate cost based on current configured pricing
    const costResult = defaultPricingService.calculateCost(session.modelName, metadata);

    // Calculate incremental tokens
    const newTotalTokens = costResult.totalTokens;
    const incrementalTokens = Math.max(0, newTotalTokens - session.totalTokens);
    const incrementalCost = Math.max(0, costResult.totalCostUsd - session.totalCostUsd);

    // Record usage event
    const eventId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO usage_events (
        id, session_id, timestamp, prompt_tokens, candidates_tokens, total_tokens, incremental_cost_usd, raw_details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      sessionId,
      now,
      costResult.totalPromptTokens,
      costResult.totalCandidatesTokens,
      newTotalTokens,
      incrementalCost,
      JSON.stringify(metadata)
    );

    // Update session running totals
    db.prepare(`
      UPDATE sessions SET
        prompt_tokens_text = ?,
        prompt_tokens_audio = ?,
        candidates_tokens_text = ?,
        candidates_tokens_audio = ?,
        total_tokens = ?,
        total_cost_usd = ?
      WHERE id = ?
    `).run(
      costResult.promptTokensText,
      costResult.promptTokensAudio,
      costResult.candidatesTokensText,
      costResult.candidatesTokensAudio,
      costResult.totalTokens,
      costResult.totalCostUsd,
      sessionId
    );

    const updatedSession = this.getSession(sessionId);
    sseService.broadcast('usage:update', {
      sessionId,
      usageEventId: eventId,
      costResult,
      session: updatedSession
    });
  }

  public endSession(sessionId: string, status: SessionStatus = 'completed', errorMessage?: string): Session | undefined {
    const session = this.getSession(sessionId);
    if (!session) return undefined;

    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(0, (new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000);

    db.prepare(`
      UPDATE sessions SET
        status = ?,
        ended_at = ?,
        duration_seconds = ?,
        error_message = ?
      WHERE id = ?
    `).run(status, endedAt, durationSeconds, errorMessage || null, sessionId);

    const endedSession = this.getSession(sessionId);
    sseService.broadcast('session:ended', endedSession);
    return endedSession;
  }

  public listSessions(options: {
    limit?: number;
    offset?: number;
    status?: string;
    personaId?: string;
    sortField?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}): { sessions: Session[]; total: number } {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }
    if (options.personaId) {
      conditions.push('persona_id = ?');
      params.push(options.personaId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM sessions ${whereClause}`).get(...params) as { count: number };

    const validSortFields = ['started_at', 'duration_seconds', 'total_tokens', 'total_cost_usd', 'status'];
    const sortField = validSortFields.includes(options.sortField || '') ? options.sortField : 'started_at';
    const sortOrder = options.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const sessions = db.prepare(`
      SELECT * FROM sessions
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as Session[];

    return { sessions, total: totalRow.count };
  }

  public getSessionDetails(sessionId: string): {
    session: Session;
    persona?: Persona;
    messages: Message[];
    usageEvents: UsageEvent[];
  } | undefined {
    const session = this.getSession(sessionId);
    if (!session) return undefined;

    const persona = this.getPersona(session.personaId);
    const messages = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC').all(sessionId) as Message[];
    const usageEvents = db.prepare('SELECT * FROM usage_events WHERE session_id = ? ORDER BY timestamp ASC').all(sessionId) as UsageEvent[];

    return { session, persona, messages, usageEvents };
  }

  public getDashboardSummary(): DashboardSummary {
    const totalRow = db.prepare(`
      SELECT
        COUNT(*) as totalSessions,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeSessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedSessions,
        COALESCE(SUM(duration_seconds), 0) as totalDurationSeconds,
        COALESCE(AVG(duration_seconds), 0) as averageDurationSeconds,
        COALESCE(SUM(total_tokens), 0) as totalTokens,
        COALESCE(SUM(prompt_tokens_text + prompt_tokens_audio), 0) as totalInputTokens,
        COALESCE(SUM(candidates_tokens_text + candidates_tokens_audio), 0) as totalOutputTokens,
        COALESCE(SUM(prompt_tokens_audio), 0) as totalAudioInputTokens,
        COALESCE(SUM(candidates_tokens_audio), 0) as totalAudioOutputTokens,
        COALESCE(SUM(prompt_tokens_text), 0) as totalTextInputTokens,
        COALESCE(SUM(candidates_tokens_text), 0) as totalTextOutputTokens,
        COALESCE(SUM(total_cost_usd), 0) as totalCostUsd
      FROM sessions
    `).get() as any;

    // Approximate breakdown of audio vs text costs
    const pricing = defaultPricingService.getModelPricing(defaultPricingService.getPricingConfig().defaultModel);
    const audioInRate = pricing.input['AUDIO'] ?? 3.00;
    const audioOutRate = pricing.output['AUDIO'] ?? 12.00;
    const textInRate = pricing.input['TEXT'] ?? 0.75;
    const textOutRate = pricing.output['TEXT'] ?? 4.50;

    const audioCost = (totalRow.totalAudioInputTokens * audioInRate + totalRow.totalAudioOutputTokens * audioOutRate) / 1_000_000;
    const textCost = (totalRow.totalTextInputTokens * textInRate + totalRow.totalTextOutputTokens * textOutRate) / 1_000_000;

    return {
      activeSessions: totalRow.activeSessions || 0,
      completedSessions: totalRow.completedSessions || 0,
      totalSessions: totalRow.totalSessions || 0,
      totalDurationSeconds: Math.round(totalRow.totalDurationSeconds || 0),
      averageDurationSeconds: Math.round(totalRow.averageDurationSeconds || 0),
      totalTokens: totalRow.totalTokens || 0,
      totalInputTokens: totalRow.totalInputTokens || 0,
      totalOutputTokens: totalRow.totalOutputTokens || 0,
      totalAudioInputTokens: totalRow.totalAudioInputTokens || 0,
      totalAudioOutputTokens: totalRow.totalAudioOutputTokens || 0,
      totalTextInputTokens: totalRow.totalTextInputTokens || 0,
      totalTextOutputTokens: totalRow.totalTextOutputTokens || 0,
      totalCostUsd: Number((totalRow.totalCostUsd || 0).toFixed(6)),
      audioCostUsd: Number(audioCost.toFixed(6)),
      textCostUsd: Number(textCost.toFixed(6))
    };
  }

  public getDailyTrends(days = 14): DailyTrendPoint[] {
    // Generate dates for past N days
    const rows = db.prepare(`
      SELECT
        substr(started_at, 1, 10) as date,
        COUNT(*) as sessionCount,
        COALESCE(SUM(total_cost_usd), 0) as totalCostUsd,
        COALESCE(SUM(prompt_tokens_audio + candidates_tokens_audio), 0) as audioTokens,
        COALESCE(SUM(prompt_tokens_text + candidates_tokens_text), 0) as textTokens,
        COALESCE(SUM(total_tokens), 0) as totalTokens,
        COALESCE(SUM(duration_seconds), 0) as durationSeconds
      FROM sessions
      GROUP BY substr(started_at, 1, 10)
      ORDER BY date ASC
      LIMIT ?
    `).all(days) as any[];

    return rows.map(r => ({
      date: r.date,
      sessionCount: r.sessionCount,
      totalCostUsd: Number(r.totalCostUsd.toFixed(4)),
      audioTokens: r.audioTokens,
      textTokens: r.textTokens,
      totalTokens: r.totalTokens,
      durationSeconds: Math.round(r.durationSeconds)
    }));
  }
}

export const sessionService = new SessionService();
