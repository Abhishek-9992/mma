export type ModalityType = 'TEXT' | 'AUDIO' | 'IMAGE' | 'VIDEO';

export interface ModalityTokenDetail {
  modality: ModalityType | string;
  tokenCount: number;
}

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  cachedContentTokenCount?: number;
  thoughtsTokenCount?: number;
  promptTokensDetails?: ModalityTokenDetail[];
  candidatesTokensDetails?: ModalityTokenDetail[];
}

export interface ModelPricingTier {
  displayName: string;
  input: Record<string, number>; // Rate per 1,000,000 tokens in USD
  output: Record<string, number>; // Rate per 1,000,000 tokens in USD
}

export interface PricingConfig {
  currency: string;
  pricingSource: string;
  verifiedDate: string;
  defaultModel: string;
  models: Record<string, ModelPricingTier>;
}

export interface CostCalculationResult {
  modelName: string;
  promptTokensText: number;
  promptTokensAudio: number;
  promptTokensOther: number;
  candidatesTokensText: number;
  candidatesTokensAudio: number;
  candidatesTokensOther: number;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  totalTokens: number;
  promptCostUsd: number;
  candidatesCostUsd: number;
  totalCostUsd: number;
  modalityBreakdown: {
    inputTextCost: number;
    inputAudioCost: number;
    outputTextCost: number;
    outputAudioCost: number;
    otherCost: number;
  };
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  voiceName: 'Puck' | 'Charon' | 'Aoede' | 'Fenrir' | 'Kore' | string;
  temperature?: number;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'active' | 'completed' | 'error';

export interface Session {
  id: string;
  personaId: string;
  personaName?: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  modelName: string;
  promptTokensText: number;
  promptTokensAudio: number;
  candidatesTokensText: number;
  candidatesTokensAudio: number;
  totalTokens: number;
  totalCostUsd: number;
  clientIp?: string;
  userAgent?: string;
  errorMessage?: string | null;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  audioDurationMs?: number;
}

export interface UsageEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  incrementalCostUsd: number;
  rawDetailsJson: string;
}

export interface DashboardSummary {
  activeSessions: number;
  completedSessions: number;
  totalSessions: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalAudioInputTokens: number;
  totalAudioOutputTokens: number;
  totalTextInputTokens: number;
  totalTextOutputTokens: number;
  totalCostUsd: number;
  audioCostUsd: number;
  textCostUsd: number;
}

export interface DailyTrendPoint {
  date: string;
  sessionCount: number;
  totalCostUsd: number;
  audioTokens: number;
  textTokens: number;
  totalTokens: number;
  durationSeconds: number;
}
