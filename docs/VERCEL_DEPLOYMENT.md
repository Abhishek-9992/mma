# 🚀 Vercel & Production Deployment Guide

This guide walks you through deploying your **Gemini Live AI Voice Agent & Real-Time Cost Dashboard** platform to **Vercel** and a backend host.

---

## ⚡ 1. Understanding the Deployment Architecture

A real-time voice agent application consists of two distinct components:

| Component | Technology | Best Hosting Platform | Why |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React + Vite + Tailwind CSS | **Vercel** | Ultra-fast global Edge CDN, automatic Git deployments, zero configuration. |
| **Backend Server & WebSocket Gateway** | Node.js + Express + `ws` + SQLite | **Render** / **Railway** / **Fly.io** | **Requires persistent WebSockets (`wss://`)** for streaming 16kHz/24kHz PCM audio in real-time. (Vercel serverless functions have a 10s timeout and do not support WebSocket servers). |

---

## 🛠️ Step 1: Deploy the Backend (Render / Railway / Docker)

Before deploying the frontend on Vercel, deploy your backend service so you have your production HTTP and WebSocket URLs ready.

### Option A: Deploying on Render (Free & Persistent)

1. Push your repository to GitHub.
2. Go to **[Render.com](https://render.com/)** and click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Set the following fields:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `GEMINI_API_KEY`: `your_gemini_api_key`
   - `GEMINI_MODEL`: `gemini-2.5-flash-native-audio-latest`
   - `JWT_SECRET`: `super-secret-jwt-key`
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_PASSWORD`: `admin123`
   - `PORT`: `5000`
6. Click **Create Web Service**.
7. Note your backend URL (e.g., `https://gemini-voice-backend.onrender.com`).

---

## 🌐 Step 2: Deploy Frontend on Vercel

### Option A: Deploy via GitHub (Recommended)

1. Go to **[Vercel Dashboard](https://vercel.com/new)**.
2. Click **Import Repository** and select your GitHub repository.
3. In **Framework Preset**, select **Vite**.
4. Set **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://gemini-voice-backend.onrender.com/api`
   - `VITE_WS_BASE_URL`: `wss://gemini-voice-backend.onrender.com/ws/voice`
6. Click **Deploy**.

---

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy from the `frontend` folder:
   ```bash
   cd frontend
   vercel
   ```

3. When prompted:
   - **Set up and deploy?**: `y`
   - **Which scope?**: Select your account.
   - **Link to existing project?**: `n`
   - **Project Name**: `gemini-voice-dashboard`
   - **Directory**: `./`
   - **Want to modify settings?**: `n`

4. Set Production Environment Variables:
   ```bash
   vercel env add VITE_API_BASE_URL production
   # Value: https://gemini-voice-backend.onrender.com/api

   vercel env add VITE_WS_BASE_URL production
   # Value: wss://gemini-voice-backend.onrender.com/ws/voice
   ```

5. Deploy to Production:
   ```bash
   vercel --prod
   ```

---

## ✅ Step 3: Verification & Checklist

Once deployed:

1. Open your Vercel deployment URL (e.g., `https://gemini-voice-dashboard.vercel.app`).
2. Log in to the Cost Dashboard using your admin credentials.
3. Click **Start Voice Session** to establish a real-time `wss://` audio stream with Gemini Live.
4. Verify streaming audio, waveform visualizer, real-time transcripts, and SSE telemetry updates work smoothly.
