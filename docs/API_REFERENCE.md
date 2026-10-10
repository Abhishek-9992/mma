# 📖 API & WebSocket Gateway Reference

Complete specification of REST endpoints, Server-Sent Events (SSE), and WebSocket protocols for the Gemini Live Voice Agent & Cost Analytics platform.

---

## 🌐 Base URLs

| Service | Environment | Base URL |
| :--- | :--- | :--- |
| **HTTP REST & SSE** | Development | `http://localhost:5000` |
| **Voice WebSocket Gateway** | Development | `ws://localhost:5000/ws/voice` |
| **Vite Frontend Dev** | Development | `http://localhost:5173` (proxies `/api` and `/ws` to port 5000) |

---

## 🔐 Authentication

All admin dashboard mutation endpoints require a Bearer JWT token in the `Authorization` header:

```http
Authorization: Bearer <jwt_token>
```

### 1. `POST /api/auth/login`
Authenticates an administrator and returns a signed JWT.

- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```

- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "username": "admin",
      "role": "admin"
    }
  }
  ```

- **Response `401 Unauthorized`**:
  ```json
  {
    "error": "Invalid username or password"
  }
  ```

### 2. `GET /api/auth/me`
Validates the current JWT token and returns user details.

- **Headers**: `Authorization: Bearer <jwt_token>`
- **Response `200 OK`**:
  ```json
  {
    "user": {
      "username": "admin",
      "role": "admin"
    }
  }
  ```

---

## 📊 Dashboard & Analytics APIs

### 1. `GET /api/dashboard/summary`
Returns high-level aggregate usage and financial KPIs across all recorded sessions.

- **Response `200 OK`**:
  ```json
  {
    "activeSessions": 1,
    "completedSessions": 28,
    "totalDurationSeconds": 4820,
    "totalCostUsd": 0.041852,
    "totalTokens": 64200,
    "promptTokens": {
      "text": 14200,
      "audio": 28000,
      "total": 42200
    },
    "candidatesTokens": {
      "text": 3200,
      "audio": 18800,
      "total": 22000
    }
  }
  ```

---

### 2. `GET /api/dashboard/trends?days=7`
Returns time-series aggregations grouped by date for charts and analytics.

- **Query Parameters**:
  - `days` (optional, default: `7`): Number of historical days to retrieve.

- **Response `200 OK`**:
  ```json
  [
    {
      "date": "2026-10-04",
      "sessions": 4,
      "costUsd": 0.005230,
      "textTokens": 2400,
      "audioTokens": 6800,
      "totalTokens": 9200
    },
    {
      "date": "2026-10-05",
      "sessions": 6,
      "costUsd": 0.008410,
      "textTokens": 3800,
      "audioTokens": 10200,
      "totalTokens": 14000
    }
  ]
  ```

---

### 3. `GET /api/dashboard/sessions`
Returns paginated session records with filtering options.

- **Query Parameters**:
  - `limit` (optional, default: `50`): Maximum rows to return.
  - `offset` (optional, default: `0`): Pagination offset.
  - `status` (optional): Filter by `'active'`, `'completed'`, or `'error'`.
  - `personaId` (optional): Filter by persona ID.

- **Response `200 OK`**:
  ```json
  {
    "sessions": [
      {
        "id": "505b6e00-706e-46b7-8d84-f7908350de50",
        "persona_id": "persona-general",
        "persona_name": "Nova - Friendly Assistant",
        "status": "completed",
        "started_at": "2026-10-10T07:22:15.000Z",
        "ended_at": "2026-10-10T07:25:30.000Z",
        "duration_seconds": 195,
        "model_name": "gemini-2.5-flash-native-audio-latest",
        "prompt_tokens_text": 420,
        "prompt_tokens_audio": 2840,
        "candidates_tokens_text": 110,
        "candidates_tokens_audio": 1980,
        "total_tokens": 5350,
        "total_cost_usd": 0.003415
      }
    ],
    "total": 29
  }
  ```

---

### 4. `GET /api/dashboard/sessions/:id`
Retrieves granular session details including full timestamped transcripts, turn-by-turn messages, and exact mathematical pricing equation.

- **Response `200 OK`**:
  ```json
  {
    "session": {
      "id": "505b6e00-706e-46b7-8d84-f7908350de50",
      "persona_id": "persona-general",
      "status": "completed",
      "total_tokens": 5350,
      "total_cost_usd": 0.003415
    },
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "Hi Nova, can you explain quantum computing in one sentence?",
        "timestamp": "2026-10-10T07:22:18.000Z",
        "audio_duration_ms": null
      },
      {
        "id": "msg-2",
        "role": "assistant",
        "content": "Quantum computing uses quantum mechanics to process complex data exponentially faster than classical computers.",
        "timestamp": "2026-10-10T07:22:21.000Z",
        "audio_duration_ms": 3200
      }
    ],
    "costBreakdown": {
      "promptTextCost": 0.000042,
      "promptAudioCost": 0.001988,
      "candidatesTextCost": 0.000044,
      "candidatesAudioCost": 0.001386,
      "totalCost": 0.003460,
      "rates": {
        "textInputPerMillion": 0.10,
        "audioInputPerMillion": 0.70,
        "textOutputPerMillion": 0.40,
        "audioOutputPerMillion": 0.70
      }
    }
  }
  ```

---

### 5. `GET /api/dashboard/pricing`
Inspects current active billing rates loaded from `pricing.json`.

- **Response `200 OK`**:
  ```json
  {
    "currency": "USD",
    "updatedAt": "2026-10-10",
    "source": "ai.google.dev/pricing",
    "models": {
      "gemini-2.5-flash-native-audio-latest": {
        "textInputPerMillion": 0.10,
        "audioInputPerMillion": 0.70,
        "textOutputPerMillion": 0.40,
        "audioOutputPerMillion": 0.70
      }
    }
  }
  ```

---

## 📡 Server-Sent Events (SSE) Stream

### `GET /api/dashboard/events`
Real-time push channel delivering telemetry events directly to the dashboard without client polling.

- **Headers**:
  ```http
  Accept: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  ```

- **Event Formats**:

  1. **`session_started`**:
     ```
     event: session_started
     data: {"sessionId":"1f4e8350-...","personaId":"persona-general","model":"gemini-2.5-flash-native-audio-latest","startedAt":"2026-10-10T13:40:00.000Z"}
     ```

  2. **`usage_update`**:
     ```
     event: usage_update
     data: {"sessionId":"1f4e8350-...","totalTokens":2450,"totalCostUsd":0.00156,"incrementalCost":0.00032,"timestamp":"2026-10-10T13:40:12.000Z"}
     ```

  3. **`session_completed`**:
     ```
     event: session_completed
     data: {"sessionId":"1f4e8350-...","durationSeconds":45,"totalCostUsd":0.00214,"status":"completed"}
     ```

---

## 🎭 Persona Management APIs

### 1. `GET /api/personas`
Lists all available agent personas.

- **Response `200 OK`**:
  ```json
  {
    "personas": [
      {
        "id": "persona-general",
        "name": "Nova - Friendly Assistant",
        "description": "A versatile, polite, and helpful general-purpose AI voice agent.",
        "voice_name": "Aoede",
        "temperature": 0.7,
        "is_default": 1
      },
      {
        "id": "persona-support",
        "name": "Atlas - Technical Support",
        "description": "Methodical, patient, and precise technical troubleshooting agent.",
        "voice_name": "Fenrir",
        "temperature": 0.4,
        "is_default": 0
      },
      {
        "id": "persona-concierge",
        "name": "Lyra - Executive Concierge",
        "description": "Polished, sophisticated executive concierge for bookings.",
        "voice_name": "Puck",
        "temperature": 0.8,
        "is_default": 0
      }
    ]
  }
  ```

---

## 🎙️ Voice WebSocket Gateway

### Connection Endpoint
```
ws://localhost:5000/ws/voice?personaId=persona-general&sessionId=<optional_uuid>
```

#### Query Parameters:
- `personaId` (optional): Persona identifier. Defaults to active default persona (`persona-general`).
- `sessionId` (optional): Pre-allocated session UUID. If omitted, the gateway generates a UUID v4.

---

### 1. Client-to-Server Protocol

#### A. Binary Frame (Microphone Audio)
- Format: **Raw Linear PCM 16-bit, 16,000 Hz Mono, Little-Endian**
- Chunk Size: Typically **4,096 bytes** (128ms of audio at 32,000 bytes/sec)
- Packaging: Transmitted as raw `ArrayBuffer` / `Buffer` (zero framing overhead).

#### B. Text Fallback Turn (`JSON`)
Clients can transmit typed prompts over the same connection:
```json
{
  "type": "text",
  "text": "Hello, how can you help me today?"
}
```

---

### 2. Server-to-Client Protocol

#### A. Binary Frame (Synthesized Speech Output)
- Format: **Raw Linear PCM 16-bit, 24,000 Hz Mono, Little-Endian**
- Playback: Queued directly into client `AudioStreamPlayer` lookahead scheduler.

#### B. JSON Control Frames

##### Handshake Complete (`setup_complete`)
Fired once Gemini establishes the bidirectional session:
```json
{
  "type": "setup_complete",
  "sessionId": "1f4e8350-64a2-4f6e-85e6-b0bedff36125",
  "persona": {
    "id": "persona-general",
    "name": "Nova - Friendly Assistant",
    "voice_name": "Aoede"
  }
}
```

##### Streaming Transcript Chunk (`transcript_chunk`)
Incremental word/phrase tokens for real-time subtitle rendering:
```json
{
  "type": "transcript_chunk",
  "role": "assistant",
  "text": "Hello! "
}
```

##### Turn Transcript Complete (`transcript`)
Full synthesized turn text after model completes generation:
```json
{
  "type": "transcript",
  "role": "assistant",
  "text": "Hello! I am Nova, your voice assistant. How can I help you?",
  "durationMs": 2400
}
```

##### Barge-In Interruption (`interrupted`)
Dispatched immediately when server-side VAD detects the user speaking during model playback:
```json
{
  "type": "interrupted",
  "timestamp": "2026-10-10T13:41:05.120Z"
}
```
*Client Action: Call `player.flush()` to instantly halt active speaker audio.*

##### Live Token & Usage Event (`usage`)
Incremental token accounting metadata:
```json
{
  "type": "usage",
  "usageMetadata": {
    "promptTokenCount": 384,
    "candidatesTokenCount": 112,
    "totalTokenCount": 496,
    "promptTokensDetails": [
      { "modality": "TEXT", "tokenCount": 84 },
      { "modality": "AUDIO", "tokenCount": 300 }
    ],
    "candidatesTokensDetails": [
      { "modality": "AUDIO", "tokenCount": 112 }
    ]
  }
}
```

##### Session Error (`error`)
```json
{
  "type": "error",
  "error": "Upstream error: rate limit exceeded"
}
```
