# Data Model & Cost Accounting

## 1. Relational Database Schema

The database stores all session telemetry, conversation transcripts, token modality events, and agent personas.

### Entity Relationship Diagram (ERD)

```
┌──────────────────┐          ┌──────────────────────────────────┐
│     personas     │          │             sessions             │
├──────────────────┤          ├──────────────────────────────────┤
│ id (PK)          │ 1      * │ id (PK)                          │
│ name             ├──────────┤ persona_id (FK)                  │
│ description      │          │ status ('active','completed'...) │
│ system_prompt    │          │ started_at / ended_at            │
│ voice_name       │          │ duration_seconds                 │
│ temperature      │          │ model_name                       │
│ is_default       │          │ prompt_tokens_text / audio       │
│ created_at       │          │ candidates_tokens_text / audio   │
└──────────────────┘          │ total_tokens                     │
                              │ total_cost_usd                   │
                              └───────────┬────────────────┬─────┘
                                          │ 1              │ 1
                                          │                │
                                          │ *              │ *
                              ┌───────────▼────┐   ┌───────▼───────────┐
                              │    messages    │   │   usage_events    │
                              ├────────────────┤   ├───────────────────┤
                              │ id (PK)        │   │ id (PK)           │
                              │ session_id(FK) │   │ session_id (FK)   │
                              │ role           │   │ timestamp         │
                              │ content        │   │ prompt_tokens     │
                              │ timestamp      │   │ candidates_tokens │
                              │ audio_duration │   │ incremental_cost  │
                              └────────────────┘   │ raw_details_json  │
                                                   └───────────────────┘
```

---

## 2. Gemini `usageMetadata` Mapping

Gemini Live sends periodic `usageMetadata` payloads during turns:

```json
{
  "usageMetadata": {
    "promptTokenCount": 184,
    "candidatesTokenCount": 92,
    "totalTokenCount": 276,
    "promptTokensDetails": [
      { "modality": "TEXT", "tokenCount": 64 },
      { "modality": "AUDIO", "tokenCount": 120 }
    ],
    "candidatesTokensDetails": [
      { "modality": "TEXT", "tokenCount": 18 },
      { "modality": "AUDIO", "tokenCount": 74 }
    ]
  }
}
```

### Table Column Mapping:
- `prompt_tokens_text` $\leftarrow$ sum of `promptTokensDetails` with `modality == 'TEXT'`
- `prompt_tokens_audio` $\leftarrow$ sum of `promptTokensDetails` with `modality == 'AUDIO'`
- `candidates_tokens_text` $\leftarrow$ sum of `candidatesTokensDetails` with `modality == 'TEXT'`
- `candidates_tokens_audio` $\leftarrow$ sum of `candidatesTokensDetails` with `modality == 'AUDIO'`
- `total_tokens` $\leftarrow$ `promptTokenCount + candidatesTokenCount`

---

## 3. Cost Calculation Formula

Prices are configured in `backend/src/config/pricing.json` per 1,000,000 (1M) tokens:

$$\text{Input Audio Cost} = \frac{\text{prompt\_tokens\_audio} \times \text{Rate}_{\text{input, audio}}}{1,000,000}$$
$$\text{Output Audio Cost} = \frac{\text{candidates\_tokens\_audio} \times \text{Rate}_{\text{output, audio}}}{1,000,000}$$
$$\text{Input Text Cost} = \frac{\text{prompt\_tokens\_text} \times \text{Rate}_{\text{input, text}}}{1,000,000}$$
$$\text{Output Text Cost} = \frac{\text{candidates\_tokens\_text} \times \text{Rate}_{\text{output, text}}}{1,000,000}$$

$$\text{Total Session Cost} = \text{Input Audio Cost} + \text{Output Audio Cost} + \text{Input Text Cost} + \text{Output Text Cost}$$

Unit tests in `backend/src/tests/pricingService.test.ts` validate this precision to within $0.00001.
