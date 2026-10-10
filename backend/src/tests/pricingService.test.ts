import { describe, it, expect } from 'vitest';
import { PricingService } from '../services/pricingService.js';
import { GeminiUsageMetadata } from '../models/types.js';

describe('PricingService & Cost Calculation', () => {
  const service = new PricingService();

  it('loads model pricing configuration correctly', () => {
    const config = service.getPricingConfig();
    expect(config.currency).toBe('USD');
    expect(config.models['gemini-2.0-flash-exp']).toBeDefined();
    expect(config.models['gemini-2.0-flash-exp'].input.AUDIO).toBe(3.00);
    expect(config.models['gemini-2.0-flash-exp'].output.AUDIO).toBe(12.00);
  });

  it('calculates cost accurately for mixed text and audio tokens', () => {
    // 100,000 text input tokens: 100,000 * 0.75 / 1,000,000 = $0.075
    // 50,000 audio input tokens: 50,000 * 3.00 / 1,000,000 = $0.150
    // 20,000 text output tokens: 20,000 * 4.50 / 1,000,000 = $0.090
    // 10,000 audio output tokens: 10,000 * 12.00 / 1,000,000 = $0.120
    // Total Expected: 0.075 + 0.150 + 0.090 + 0.120 = $0.435

    const metadata: GeminiUsageMetadata = {
      promptTokensDetails: [
        { modality: 'TEXT', tokenCount: 100000 },
        { modality: 'AUDIO', tokenCount: 50000 }
      ],
      candidatesTokensDetails: [
        { modality: 'TEXT', tokenCount: 20000 },
        { modality: 'AUDIO', tokenCount: 10000 }
      ]
    };

    const result = service.calculateCost('gemini-2.0-flash-exp', metadata);

    expect(result.promptTokensText).toBe(100000);
    expect(result.promptTokensAudio).toBe(50000);
    expect(result.candidatesTokensText).toBe(20000);
    expect(result.candidatesTokensAudio).toBe(10000);

    expect(result.totalPromptTokens).toBe(150000);
    expect(result.totalCandidatesTokens).toBe(30000);
    expect(result.totalTokens).toBe(180000);

    expect(result.modalityBreakdown.inputTextCost).toBeCloseTo(0.075, 5);
    expect(result.modalityBreakdown.inputAudioCost).toBeCloseTo(0.150, 5);
    expect(result.modalityBreakdown.outputTextCost).toBeCloseTo(0.090, 5);
    expect(result.modalityBreakdown.outputAudioCost).toBeCloseTo(0.120, 5);

    expect(result.promptCostUsd).toBeCloseTo(0.225, 5);
    expect(result.candidatesCostUsd).toBeCloseTo(0.210, 5);
    expect(result.totalCostUsd).toBeCloseTo(0.435, 5);
  });

  it('handles fallback when promptTokensDetails is omitted', () => {
    const metadata: GeminiUsageMetadata = {
      promptTokenCount: 10000,
      candidatesTokenCount: 5000
    };

    const result = service.calculateCost('gemini-2.0-flash-exp', metadata);
    // 10,000 text input * $0.75 / 1M = $0.0075
    // 5,000 text output * $4.50 / 1M = $0.0225
    // Total = $0.0300
    expect(result.promptTokensText).toBe(10000);
    expect(result.candidatesTokensText).toBe(5000);
    expect(result.totalCostUsd).toBeCloseTo(0.0300, 5);
  });

  it('calculates zero cost for empty metadata', () => {
    const metadata: GeminiUsageMetadata = {};
    const result = service.calculateCost('gemini-2.0-flash-exp', metadata);

    expect(result.totalTokens).toBe(0);
    expect(result.totalCostUsd).toBe(0);
  });

  it('supports model tier variations like gemini-2.5-flash', () => {
    // gemini-2.5-flash:
    // text input: $0.50 / 1M
    // audio input: $3.00 / 1M
    // text output: $3.00 / 1M
    // audio output: $10.00 / 1M
    const metadata: GeminiUsageMetadata = {
      promptTokensDetails: [
        { modality: 'TEXT', tokenCount: 1000000 }, // $0.50
        { modality: 'AUDIO', tokenCount: 1000000 }  // $3.00
      ],
      candidatesTokensDetails: [
        { modality: 'TEXT', tokenCount: 1000000 }, // $3.00
        { modality: 'AUDIO', tokenCount: 1000000 }  // $10.00
      ]
    };

    const result = service.calculateCost('gemini-2.5-flash', metadata);
    expect(result.promptCostUsd).toBeCloseTo(3.50, 4);
    expect(result.candidatesCostUsd).toBeCloseTo(13.00, 4);
    expect(result.totalCostUsd).toBeCloseTo(16.50, 4);
  });
});
