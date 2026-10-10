# Deployment Guide & Cloud Hosting Comparison

## 1. Cloud Hosting Platform Comparison

Because the Voice Agent relies on **persistent, stateful bidirectional WebSockets with streaming PCM audio**, choosing the right hosting environment is critical.

| Option | Pros | Cons | Verdict / Recommendation |
| :--- | :--- | :--- | :--- |
| **Option A: Google Cloud Run (Recommended for Enterprise)** | • Native Google Cloud VPC integration with Gemini API (lowest egress latency).<br>• Supports WebSockets with up to 60-minute connection timeouts.<br>• Scale-to-zero when idle, automatic horizontal scaling under load. | • Requires setting CPU allocation to "always-on" per instance to avoid audio starvation during pauses. | **Best overall** for production Google AI workloads. Single managed container service. |
| **Option B: Railway or Fly.io (Recommended for Quick Launch)** | • Exceptional native WebSocket and TCP streaming performance.<br>• Built-in persistent volume support for SQLite (or single-click PostgreSQL).<br>• Seamless Dockerfile deployment from GitHub. | • Tiered egress pricing at high voice volume. | **Best for developer experience** and rapid full-stack deployments. |
| **Option C: Vercel (Frontend) + Render / AWS ECS (Backend)** | • Vercel provides world-class global CDN delivery for Next.js/React frontend.<br>• Easy custom domain and SSL setup. | • Serverless functions on Vercel **cannot** host long-lived WebSocket audio proxies.<br>• Splitting frontend and backend across two providers increases configuration overhead. | Good if frontend is hosted on Vercel and backend is deployed to an EC2/ECS or Render container. |

---

## 2. Environment Variables

Create `.env` based on `.env.example`:

```bash
# Server & Environment
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com

# Gemini API Authentication (Server-Side Only)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp

# Security & Dashboard Admin Credentials
JWT_SECRET=super_secure_random_production_jwt_secret_64chars
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_to_a_strong_password

# Database Configuration
DATABASE_PATH=/app/data/mma.db
```

---

## 3. Step-by-Step Production Deployment

### Deploying with Docker Compose

1. Clone repository to your cloud instance (e.g., Ubuntu VM or VPS):
   ```bash
   git clone https://github.com/your-org/mma.git
   cd mma
   ```
2. Configure `.env` with your production Gemini API key and credentials.
3. Build and launch containers:
   ```bash
   docker compose up -d --build
   ```
4. Verify healthy operation:
   ```bash
   curl http://localhost:5000/api/health
   ```

### Deploying Backend to Google Cloud Run

1. Build and push container to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/mma-voice-backend -f Dockerfile.backend
   ```
2. Deploy to Cloud Run with WebSocket timeout:
   ```bash
   gcloud run deploy mma-voice-backend \
     --image gcr.io/PROJECT_ID/mma-voice-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --timeout=3600 \
     --set-env-vars GEMINI_API_KEY=YOUR_KEY,JWT_SECRET=YOUR_SECRET
   ```
