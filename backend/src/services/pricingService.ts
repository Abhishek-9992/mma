import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  CostCalculationResult,
  GeminiUsageMetadata,
  ModelPricingTier,
  PricingConfig
} from '../models/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PricingService {
  private config: PricingConfig;
  private configPath: string;

  constructor(customConfigPath?: string) {
    this.configPath = customConfigPath || path.resolve(__dirname, '../config/pricing.json');
    this.config = this.loadConfig();
  }

  public loadConfig(): PricingConfig {
    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(data);
      return this.config;
    } catch (err) {
      console.error(`Failed to load pricing config from ${this.configPath}:`, err);
      // Fallback safe configuration
      this.config = {
        currency: 'USD',
        pricingSource: 'Fallback default',
        verifiedDate: '2026-10-10',
        defaultModel: 'gemini-2.0-flash-exp',
        models: {
          'gemini-2.0-flash-exp': {
            displayName: 'Gemini 2.0 Flash Live',
            input: { TEXT: 0.75, AUDIO: 3.00, IMAGE: 1.00, VIDEO: 1.00 },
            output: { TEXT: 4.50, AUDIO: 12.00 }
          }
        }
      };
      return this.config;
    }
  }

  public getPricingConfig(): PricingConfig {
    return this.config;
  }

  public getModelPricing(modelName: string): ModelPricingTier {
    if (this.config.models[modelName]) {
      return this.config.models[modelName];
    }
    // Fallback to default or first available model
    const defaultModel = this.config.models[this.config.defaultModel];
    if (defaultModel) {
      return defaultModel;
    }
    const firstKey = Object.keys(this.config.models)[0];
    return this.config.models[firstKey];
  }

  /**
   * Calculates the exact USD cost based on token counts and modality breakdown.
   * Rate is specified per 1,000,000 tokens.
   */
  public calculateCost(
    modelName: string,
    metadata: GeminiUsageMetadata
  ): CostCalculationResult {
    const tier = this.getModelPricing(modelName);

    let promptTokensText = 0;
    let promptTokensAudio = 0;
    let promptTokensOther = 0;

    let candidatesTokensText = 0;
    let candidatesTokensAudio = 0;
    let candidatesTokensOther = 0;

    // 1. Process Prompt (Input) Modalities
    if (metadata.promptTokensDetails && metadata.promptTokensDetails.length > 0) {
      for (const item of metadata.promptTokensDetails) {
        const mod = item.modality.toUpperCase();
        const count = item.tokenCount || 0;
        if (mod === 'AUDIO') {
          promptTokensAudio += count;
        } else if (mod === 'TEXT') {
          promptTokensText += count;
        } else {
          promptTokensOther += count;
        }
      }
    } else if (metadata.promptTokenCount && metadata.promptTokenCount > 0) {
      // If breakdown not present, treat as TEXT by default
      promptTokensText = metadata.promptTokenCount;
    }

    // 2. Process Candidates (Output) Modalities
    if (metadata.candidatesTokensDetails && metadata.candidatesTokensDetails.length > 0) {
      for (const item of metadata.candidatesTokensDetails) {
        const mod = item.modality.toUpperCase();
        const count = item.tokenCount || 0;
        if (mod === 'AUDIO') {
          candidatesTokensAudio += count;
        } else if (mod === 'TEXT') {
          candidatesTokensText += count;
        } else {
          candidatesTokensOther += count;
        }
      }
    } else if (metadata.candidatesTokenCount && metadata.candidatesTokenCount > 0) {
      // If candidates breakdown not present, default to TEXT output
      candidatesTokensText = metadata.candidatesTokenCount;
    }

    const totalPromptTokens = promptTokensText + promptTokensAudio + promptTokensOther;
    const totalCandidatesTokens = candidatesTokensText + candidatesTokensAudio + candidatesTokensOther;
    const totalTokens = totalPromptTokens + totalCandidatesTokens;

    // Rates per 1M tokens: cost = tokens * (rate / 1,000,000)
    const textInRate = tier.input['TEXT'] ?? 0.75;
    const audioInRate = tier.input['AUDIO'] ?? 3.00;
    const otherInRate = tier.input['IMAGE'] ?? 1.00;

    const textOutRate = tier.output['TEXT'] ?? 4.50;
    const audioOutRate = tier.output['AUDIO'] ?? 12.00;
    const otherOutRate = tier.output['OTHER'] ?? textOutRate;

    const inputTextCost = (promptTokensText * textInRate) / 1_000_000;
    const inputAudioCost = (promptTokensAudio * audioInRate) / 1_000_000;
    const inputOtherCost = (promptTokensOther * otherInRate) / 1_000_000;

    const outputTextCost = (candidatesTokensText * textOutRate) / 1_000_000;
    const outputAudioCost = (candidatesTokensAudio * audioOutRate) / 1_000_000;
    const outputOtherCost = (candidatesTokensOther * otherOutRate) / 1_000_000;

    const promptCostUsd = inputTextCost + inputAudioCost + inputOtherCost;
    const candidatesCostUsd = outputTextCost + outputAudioCost + outputOtherCost;
    const totalCostUsd = promptCostUsd + candidatesCostUsd;

    return {
      modelName,
      promptTokensText,
      promptTokensAudio,
      promptTokensOther,
      candidatesTokensText,
      candidatesTokensAudio,
      candidatesTokensOther,
      totalPromptTokens,
      totalCandidatesTokens,
      totalTokens,
      promptCostUsd,
      candidatesCostUsd,
      totalCostUsd,
      modalityBreakdown: {
        inputTextCost,
        inputAudioCost,
        outputTextCost,
        outputAudioCost,
        otherCost: inputOtherCost + outputOtherCost
      }
    };
  }
}

export const defaultPricingService = new PricingService();
