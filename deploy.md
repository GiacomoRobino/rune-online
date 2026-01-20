# Deployment Guide - Sorcery Online

Deploy your game for free using **Fly.io** (server) and **Vercel** (client).

```
┌─────────────────┐        WSS         ┌─────────────────┐
│     Vercel      │◄──────────────────►│     Fly.io      │
│  (React client) │                    │ (Colyseus server)│
└─────────────────┘                    └─────────────────┘
```

---

## Prerequisites

- GitHub account (for Vercel auto-deploy)
- Fly.io account (free signup)

---

## Step 1: Deploy Server to Fly.io

### 1.1 Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux/WSL
curl -L https://fly.io/install.sh | sh
```

### 1.2 Sign up and login

```bash
fly auth signup   # Create account (or fly auth login if you have one)
```

### 1.3 Prepare server for production

The server needs a Dockerfile and fly.toml config. Create these files:

**server/Dockerfile:**
```dockerfile
FROM node:20-slim AS builder
WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install

# Copy source
COPY shared/ ./shared/
COPY server/ ./server/

# Build server
WORKDIR /app/server
RUN npm run build

# Production image
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

**server/fly.toml:**
```toml
app = "sorcery-online"  # Change this to your unique app name
primary_region = "fra"   # Frankfurt, change to closer region if needed

[build]

[env]
  PORT = "8080"
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false   # Keep server running
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 100
    soft_limit = 80
```

### 1.4 Update server code for production

In `server/src/index.ts`, ensure it uses the PORT environment variable:

```typescript
const port = Number(process.env.PORT) || 2567;
```

### 1.5 Deploy to Fly.io

```bash
cd server
fly launch --no-deploy    # Initialize app (follow prompts)
fly deploy                # Deploy!
```

Your server will be live at: `https://your-app-name.fly.dev`

Test it:
```bash
curl https://your-app-name.fly.dev/health
```

---

## Step 2: Deploy Client to Vercel

### 2.1 Update client for production

Create `client/.env.production`:
```
VITE_SERVER_URL=wss://your-app-name.fly.dev
```

Update `client/src/hooks/useColyseus.ts`:
```typescript
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
```

### 2.2 Deploy via Vercel Dashboard (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "New Project" → Import your repository
4. Configure:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variable:
   - `VITE_SERVER_URL` = `wss://your-app-name.fly.dev`
6. Click Deploy

### 2.3 Or deploy via CLI

```bash
npm i -g vercel
cd client
vercel
```

---

## Step 3: Test Your Deployment

1. Open your Vercel URL in one browser
2. Open it in another browser/device (or incognito)
3. Both enter nicknames → game should start
4. Play a game to verify WebSocket connection works!

---

## Regions

Choose regions close to you for lower latency:

| Region Code | Location |
|-------------|----------|
| `fra` | Frankfurt, Germany |
| `lhr` | London, UK |
| `iad` | Virginia, USA |
| `sjc` | San Jose, USA |
| `syd` | Sydney, Australia |
| `nrt` | Tokyo, Japan |

---

## Troubleshooting

### WebSocket connection fails
- Ensure you're using `wss://` (not `ws://`) for production
- Check Fly.io logs: `fly logs`

### Server not responding
- Check if deployed: `fly status`
- View logs: `fly logs --app your-app-name`

### Client not building
- Check Vercel build logs in dashboard
- Ensure `VITE_SERVER_URL` is set correctly

---

## Cost Summary

| Service | Free Tier Limits |
|---------|------------------|
| **Fly.io** | 3 shared VMs, 160GB outbound/month |
| **Vercel** | Unlimited sites, 100GB bandwidth/month |

**Total cost: $0/month** for hobby use with friends!

---

## Updating Your Deployment

### Server
```bash
cd server
fly deploy
```

### Client
Push to GitHub → Vercel auto-deploys, or:
```bash
cd client
vercel --prod
```
