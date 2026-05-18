# Cloudflare Deployment Guide

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Cloudflare Pages   │────▶│  Cloudflare      │────▶│    Turso     │
│  (Static Frontend)  │     │  Workers (API)   │     │  (Database)  │
└─────────────────────┘     └──────────────────┘     └──────────────┘
         liftoff.pages.dev          liftoff-api.workers.dev
```

## Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
3. [Turso account](https://turso.tech) (already configured)

## Step 1: Deploy API (Cloudflare Workers)

### 1.1 Authenticate Wrangler

```bash
bunx wrangler login
```

### 1.2 Set Secrets

```bash
# Set your Turso credentials as secrets
bunx wrangler secret put TURSO_URL
# Enter: libsql://liftoff-sosokker.aws-ap-northeast-1.turso.io

bunx wrangler secret put TURSO_TOKEN
# Enter your Turso auth token

bunx wrangler secret put JWT_SECRET
# Enter a strong random secret for JWT signing
```

### 1.3 Deploy the Worker

```bash
bun run deploy:api
```

This will deploy to `liftoff-api.YOUR_SUBDOMAIN.workers.dev` (or custom domain if configured).

### 1.4 Test the API

```bash
curl https://liftoff-api.YOUR_SUBDOMAIN.workers.dev/
# Should return: {"status":"ok","service":"liftoff-api","platform":"cloudflare-workers"}
```

## Step 2: Deploy Frontend (Cloudflare Pages)

### 2.1 Build the Frontend

```bash
bun run build
```

This creates a `dist/` folder with the static SPA.

### 2.2 Update API URL

Before building, update the API URL in `src/stores/authStore.ts` or set via environment variable:

```bash
# Option 1: Set env var before build
VITE_API_URL=https://liftoff-api.YOUR_SUBDOMAIN.workers.dev bun run build

# Option 2: Edit authStore.ts directly
# Change: const API_URL = import.meta.env.VITE_API_URL || 'https://liftoff-api.YOUR_SUBDOMAIN.workers.dev'
```

### 2.3 Deploy to Pages

```bash
# Create a new Pages project (first time only)
bunx wrangler pages project create liftoff

# Deploy
bunx wrangler pages deploy dist --project-name=liftoff
```

Or use the Cloudflare Dashboard:
1. Go to **Workers & Pages** → **Create a project** → **Pages**
2. Connect your Git repo or upload the `dist/` folder directly
3. Build settings: Not needed (pre-built static files)
4. Deploy

## Step 3: Custom Domain (Optional)

### Workers Custom Domain

```bash
# Add custom domain to your Worker
bunx wrangler route add api.yourdomain.com/* --worker liftoff-api
```

Or via Dashboard:
1. Go to your Worker
2. **Settings** → **Triggers** → **Add Custom Domain**
3. Enter `api.yourdomain.com`

### Pages Custom Domain

1. Go to your Pages project
2. **Custom domains** → **Set up a custom domain**
3. Enter `yourdomain.com`
4. Follow DNS instructions

## Step 4: Update CORS (if using custom domain)

If you use a custom domain for the frontend, update `server/worker.ts`:

```typescript
app.use('*', cors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com', 'http://localhost:5173'],
  credentials: true,
  // ...
}))
```

Then redeploy:
```bash
bun run deploy:api
```

## Environment Variables Reference

| Variable | Description | Where to Set |
|----------|-------------|--------------|
| `TURSO_URL` | Turso database URL | Wrangler secret |
| `TURSO_TOKEN` | Turso auth token | Wrangler secret |
| `JWT_SECRET` | JWT signing secret | Wrangler secret |
| `VITE_API_URL` | API URL for frontend | Build-time env var |

## Troubleshooting

### "Cannot find module '@libsql/client/web'"
Make sure you're importing from `@libsql/client/web` in the Worker, not `@libsql/client`.

### "Failed to create client"
Check that `TURSO_URL` and `TURSO_TOKEN` secrets are set correctly:
```bash
bunx wrangler secret list
```

### CORS errors
Ensure the frontend origin is in the CORS allowlist in `server/worker.ts`.

### Database not initialized
The database auto-initializes on first request. If you see schema errors, check Turso connection.

## Monitoring

View logs:
```bash
bun run logs
```

Or use the Cloudflare Dashboard → **Workers** → **liftoff-api** → **Logs**.

## Updating

### Update API only:
```bash
bun run deploy:api
```

### Update Frontend only:
```bash
bun run build
bunx wrangler pages deploy dist --project-name=liftoff
```

### Update both:
```bash
bun run build
bun run deploy:api
bunx wrangler pages deploy dist --project-name=liftoff
```
