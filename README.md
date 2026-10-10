# 🎙️ Gemini Live AI Voice Agent & Real-Time Cost Dashboard

An enterprise-ready conversational voice agent powered by the **Google Gemini Multimodal Live API**, featuring bidirectional 16kHz/24kHz PCM speech streaming, natural barge-in turn-taking, configurable agent personas, and a real-time **Usage & Cost Analytics Dashboard**.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-19-cyan)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3-38bdf8)
![Gemini Live API](https://img.shields.io/badge/Gemini_Live-BidiGenerateContent-orange)

---

## 🌟 Key Features

### 1. Gemini Voice Agent (Speech-to-Speech)
- **Bidirectional Streaming**: Streams 16kHz linear PCM audio from the user and receives 24kHz linear PCM back with sub-500ms latency.
- **Server-Side Security**: The Gemini API key remains strictly server-side. Browser clients connect via secure WebSocket proxies.
- **Natural Barge-In**: Server-side VAD detects speech interruptions (`interrupted: true`), immediately flushing client playback queues so the agent stops talking without latency or overlap.
- **Configurable Personas**: Selectable system prompts and voice presets (Aoede, Puck, Fenrir, Kore) stored in SQLite/PostgreSQL.
- **Callable & Pluggable Channels**: Designed with an abstract `AudioChannelAdapter` ready for embeddable React widgets, mobile apps, and phone-line integration (Twilio Media Streams).

### 2. Real-Time Usage & Cost Dashboard
- **Direct Log Telemetry**: Derives all token counts and costs directly from Gemini API `usageMetadata` frames (with exact modality breakdowns).
- **Live Synchronization**: Pushes session starts, completions, and token usage events to the browser in real-time via Server-Sent Events (SSE).
- **Summary Metrics**: Active vs. completed sessions, duration, audio vs. text token consumption, and running spend totals.
- **Trend Charts**: Interactive Recharts visualizations of daily spend trends ($ USD) and stacked token modality distributions.
- **Session Telemetry & Audit Drawer**: Click any session row to inspect the full timestamped transcript, model info, and exact mathematical cost equation ($ tokens $\times$ rates).
- **Admin Authentication**: Secure JWT login with bcrypt password hashing (`admin` / `admin123`).

### 3. Cost Engine & Pricing Configuration
- Modular pricing defined in `backend/src/config/pricing.json` (rates per 1M tokens by modality: text vs. audio input and output).
- Verified against the official Google AI for Developers pricing table (`ai.google.dev/pricing`, October 2026).
- Validated with unit tests (`npx vitest run`).

---

## 🚀 Quickstart Guide

### Prerequisites
- Node.js v20+ or v22+
- npm v10+

### 1. Backend Setup
```bash
cd backend
npm install

# Configure environment variables (.env is preconfigured)
cp .env.example .env

# Run database migrations and seed realistic sample sessions
npm run seed

# Run unit tests for cost calculation
npm test

# Start the backend server (runs on http://localhost:5000)
npm run dev
```

### 2. Frontend Setup
```bash
cd ../frontend
npm install

# Start the frontend dev server (runs on http://localhost:5173)
npm run dev
```

### 3. Accessing the Application
- **Voice Agent Widget**: Open [http://localhost:5173/](http://localhost:5173/)
- **Cost & Usage Dashboard**: Click "Cost & Usage Dashboard" in the navigation bar.
- **Admin Credentials**:
  - Username: `admin`
  - Password: `admin123`

---

## 🧪 Running Unit Tests

Run the Vitest test suite to verify the pricing calculation engine:
```bash
cd backend
npx vitest run
```
Output:
```
✓ src/tests/pricingService.test.ts (5 tests)
  ✓ loads model pricing configuration correctly
  ✓ calculates cost accurately for mixed text and audio tokens
  ✓ handles fallback when promptTokensDetails is omitted
  ✓ calculates zero cost for empty metadata
  ✓ supports model tier variations like gemini-2.5-flash
```

---

## 📂 Project Structure

```
mma/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts                  # Typed environment configuration
│   │   │   └── pricing.json            # Configurable rates per 1M tokens
│   │   ├── db/
│   │   │   ├── connection.ts           # SQLite connection & WAL pragma
│   │   │   ├── schema.sql              # Relational database schema
│   │   │   └── seed.ts                 # Realistic session generator
│   │   ├── models/
│   │   │   └── types.ts                # Domain models & usage schemas
│   │   ├── services/
│   │   │   ├── pricingService.ts       # Mathematical cost engine
│   │   │   ├── geminiLiveProxy.ts      # Multimodal Live WS gateway
│   │   │   ├── sessionService.ts       # Telemetry logging & aggregates
│   │   │   ├── authService.ts          # bcrypt + JWT admin authentication
│   │   │   └── sseService.ts           # Real-time event broadcaster
│   │   ├── adapters/
│   │   │   ├── baseAdapter.ts          # Abstract audio channel interface
│   │   │   ├── webSocketAdapter.ts     # Web browser PCM stream adapter
│   │   │   └── twilioAdapter.ts        # Telephony media stream blueprint
│   │   ├── routes/
│   │   │   ├── authRoutes.ts           # Admin login endpoints
│   │   │   ├── dashboardRoutes.ts      # Metrics, trends, sessions, and SSE
│   │   │   ├── personaRoutes.ts        # Persona CRUD
│   │   │   └── voiceRoutes.ts          # Voice session preflight & WS handler
│   │   ├── tests/
│   │   │   └── pricingService.test.ts  # Vitest unit test suite
│   │   └── server.ts                   # Express & WebSocket bootstrap
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── widget/
│   │   │   │   ├── VoiceWidget.tsx     # Embeddable voice agent card
│   │   │   │   ├── AudioVisualizer.tsx # Dynamic frequency spectrum
│   │   │   │   └── PersonaSelector.tsx # System prompt & voice selector
│   │   │   ├── dashboard/
│   │   │   │   ├── SummaryCards.tsx    # Live session and spend cards
│   │   │   │   ├── TrendCharts.tsx     # Recharts spend and token charts
│   │   │   │   ├── SessionsTable.tsx   # Sortable/filterable session logs
│   │   │   │   ├── SessionDrawer.tsx   # Detailed transcript & math drawer
│   │   │   │   └── PricingModal.tsx    # Active pricing rates inspector
│   │   │   └── common/
│   │   │       ├── Navbar.tsx
│   │   │       └── AuthModal.tsx
│   │   ├── hooks/
│   │   │   ├── useVoiceAgent.ts        # Web Audio API & PCM streaming hook
│   │   │   └── useDashboardSSE.ts      # Live dashboard updates hook
│   │   ├── lib/
│   │   │   ├── audioUtils.ts           # 16kHz PCM encoder & 24kHz player
│   │   │   └── api.ts                  # REST API client
│   │   ├── App.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── ARCHITECTURE.md                 # System diagrams & latency pipeline
│   ├── DATA_MODEL.md                   # DB schema & usageMetadata mapping
│   ├── TELEPHONY_INTEGRATION.md        # Twilio Media Streams integration
│   └── DEPLOYMENT.md                   # Cloud hosting comparison & guide
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

---

## 🐳 Containerized Deployment

Run the complete multi-container stack with Docker Compose:
```bash
docker compose up -d --build
```

---

## 📚 Comprehensive Documentation Suite

| Document | Purpose |
| :--- | :--- |
| 📘 [**Master System Setup & Architecture Guide**](docs/SYSTEM_GUIDE.md) | Single-page guide covering environment setup, technical architecture, and system maintenance. |
| 🏗️ [**Architecture & Latency Design**](docs/ARCHITECTURE.md) | High-level system architecture, audio streaming pipeline, and sub-500ms latency design. |
| 📖 [**API & WebSocket Gateway Reference**](docs/API_REFERENCE.md) | Full catalog of REST endpoints, SSE real-time events, and WebSocket frame contracts. |
| 🛠️ [**Developer & Contributor Guide**](docs/DEVELOPER_GUIDE.md) | Environment configuration, audio downsampling/playback algorithms, custom personas, and test suites. |
| 👤 [**End-User & Operator Guide**](docs/USER_GUIDE.md) | Voice widget interaction walkthrough, barge-in interruption, and dashboard usage manual. |
| 💾 [**Data Model & Pricing Accounting**](docs/DATA_MODEL.md) | Relational SQLite schema, ERD, and Gemini `usageMetadata` mathematical pricing calculations. |
| 📞 [**Telephony Integration Guide**](docs/TELEPHONY_INTEGRATION.md) | Twilio Voice Media Streams architecture, $\mu$-law transcoding, and TwiML integration. |
| 🚀 [**Cloud Deployment Guide**](docs/DEPLOYMENT.md) | Docker Compose multi-container setup, cloud hosting platform comparison, and TLS/WSS setup. |
| ⚡ [**Vercel Deployment Guide**](docs/VERCEL_DEPLOYMENT.md) | Deploying React frontend to Vercel and Node.js WebSocket backend to Render/Railway. |
