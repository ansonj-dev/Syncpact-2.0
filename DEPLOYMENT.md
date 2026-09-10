# SyncPact Deployment Guide for Render

This guide will help you deploy SyncPact to Render with both a backend API service and a frontend static site.

## Architecture Overview

Your deployment will consist of:
1. **Backend API** - Node.js Express server (`syncpact-api`)
2. **Frontend Static Site** - React/Vite SPA (`syncpact-frontend`)
3. **Persistent Disk** - 1GB storage for database and snapshots

## Prerequisites

- [x] GitHub repository with your code
- [ ] Render account (sign up at https://render.com)
- [ ] Somnia testnet wallet with STT for gas (optional, only if enabling live trading)

## Option 1: Deploy with Blueprint (Recommended)

### Step 1: Push Blueprint to GitHub

The `render.yaml` file is already in your repo root. Commit and push it:

```bash
git add render.yaml vite.config.ts package.json DEPLOYMENT.md
git commit -m "Add Render deployment configuration"
git push origin main
```

### Step 2: Create New Blueprint in Render

1. Go to https://dashboard.render.com
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub account if you haven't already
4. Select the repository: `ansonj-dev/Syncpact-2.0`
5. Render will automatically detect `render.yaml`
6. Click **"Apply"**

Render will create both services automatically!

### Step 3: Configure Environment Variables (Secrets)

After blueprint deployment, go to each service and add sensitive environment variables:

#### For `syncpact-api` service:

1. Go to **Dashboard** → **syncpact-api** → **Environment**
2. Add these secret environment variables:

| Key | Value | Required? |
|-----|-------|-----------|
| `PRIVATE_KEY` | Your testnet private key (0x...) | Only if `ENABLE_LIVE_TRADING=true` |
| `AI_BASE_URL` | OpenAI-compatible API URL | Optional |
| `AI_API_KEY` | Your AI API key | Optional |
| `AI_MODEL` | Model name (e.g., `gpt-4`) | Optional |

⚠️ **IMPORTANT**: 
- Use a TESTNET-ONLY wallet for `PRIVATE_KEY`
- Never use mainnet or production keys
- Keep `ENABLE_LIVE_TRADING=false` until you've tested thoroughly

### Step 4: Update Frontend API URL

After your API is deployed, update the frontend to point to it:

1. Go to **Dashboard** → **syncpact-frontend** → **Environment**
2. Add this environment variable:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | Your API URL (e.g., `https://syncpact-api.onrender.com`) |

3. Also update the `routes` section in `render.yaml` line 51:
   ```yaml
   destination: https://YOUR-API-SERVICE-NAME.onrender.com/api/*
   ```

4. Commit and push changes to trigger a redeploy.

## Option 2: Manual Deployment

If you prefer to set up services manually:

### Backend API Service

1. **New Web Service**
   - Name: `syncpact-api`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist-server/server/index.js`
   - Plan: `Starter` (or higher)

2. **Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   NETWORK=testnet
   CHAIN_ID=50312
   RPC_URL=https://dream-rpc.somnia.network
   WS_RPC_URL=wss://dream-rpc.somnia.network/ws
   INDEXER_URL=https://prd.smk.somnia.host/v1/graphql
   ENABLE_LIVE_TRADING=false
   DB_PATH=/opt/render/project/data/syncpact.json
   ```

3. **Add Disk Storage**
   - Go to service → **Disks** → **Add Disk**
   - Name: `syncpact-data`
   - Mount Path: `/opt/render/project/data`
   - Size: `1 GB`

### Frontend Static Site

1. **New Static Site**
   - Name: `syncpact-frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

2. **Environment Variables**
   ```
   VITE_API_URL=https://syncpact-api.onrender.com
   ```

3. **Redirects & Rewrites** (in `Settings` → `Redirects/Rewrites`)
   - Add rewrite rule: `/api/*` → `https://syncpact-api.onrender.com/api/*`
   - Add rewrite rule: `/*` → `/index.html` (for SPA routing)

## Post-Deployment Configuration

### 1. Verify API Health

Visit: `https://syncpact-api.onrender.com/api/health`

Expected response:
```json
{
  "ok": true,
  "chainId": 50312,
  "network": "shannon-testnet",
  "liveTrading": false,
  "privateKeyConfigured": false
}
```

### 2. Test Frontend

Visit: `https://syncpact-frontend.onrender.com`

You should see the SyncPact interface load.

### 3. Enable Live Trading (Optional)

⚠️ **Only after thorough testing**:

1. Go to `syncpact-api` → **Environment**
2. Add `PRIVATE_KEY` with your testnet private key
3. Change `ENABLE_LIVE_TRADING` to `true`
4. Click **"Save Changes"** (this will redeploy)

### 4. Configure AI Explanations (Optional)

Add to `syncpact-api` environment:
```
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4
```

## Monitoring & Maintenance

### View Logs
- Go to service → **Logs** tab
- Real-time logs show all API requests and errors

### Database Backup
The persistent disk stores your database at `/opt/render/project/data/syncpact.json`

To backup:
1. Go to service → **Shell** tab
2. Run: `cat /opt/render/project/data/syncpact.json`
3. Copy the output

### Update Deployment
Push changes to GitHub:
```bash
git add .
git commit -m "Update application"
git push origin main
```

Render will auto-deploy changes.

### Manual Deploy
Go to service → **Manual Deploy** → **Deploy latest commit**

## Troubleshooting

### Build Fails
- Check **Logs** for TypeScript errors
- Verify Node version (Render uses Node 20 by default)
- Run `npm run typecheck` locally first

### API Returns 502/503
- Check if service is still starting (can take 2-3 minutes)
- Verify environment variables are set
- Check logs for startup errors

### Frontend Can't Reach API
- Verify `VITE_API_URL` is set correctly
- Check redirect rules in frontend service
- Ensure API service is running (check health endpoint)

### Database Not Persisting
- Verify disk is mounted at `/opt/render/project/data`
- Check disk usage in service dashboard
- Ensure `DB_PATH` environment variable matches mount path

### Live Trading Fails
- Verify `PRIVATE_KEY` is valid and funded with STT
- Check `ENABLE_LIVE_TRADING=true`
- Ensure `NETWORK=testnet`
- Review logs for specific error messages

## Cost Estimate

Free tier limits:
- **Starter Plan**: $7/month per service (2 services = $14/month)
- **Static Site**: Free
- **Disk**: Free for first 1GB
- **Total**: ~$7-14/month depending on configuration

Services will spin down after 15 minutes of inactivity on free tier (first request takes ~30 seconds to wake up).

## Security Checklist

- [ ] Never use mainnet private keys
- [ ] Keep `ENABLE_LIVE_TRADING=false` until tested
- [ ] Use Render's secret environment variables for sensitive data
- [ ] Don't commit `.env` files with real keys
- [ ] Monitor API logs for suspicious activity
- [ ] Set up Render notifications for failed deployments

## Support Resources

- **Render Docs**: https://render.com/docs
- **Somnia Docs**: https://app.dreamdex.io/docs
- **Markets SDK**: https://prd.smk.somnia.host/docs/typescript
- **GitHub Issues**: https://github.com/ansonj-dev/Syncpact-2.0/issues

## Next Steps

1. Deploy using Blueprint (Option 1)
2. Verify health endpoints
3. Test paper trading mode thoroughly
4. Only then consider enabling live trading with a testnet wallet
5. Monitor logs and performance
6. Set up custom domain (optional)

---

**Remember**: This is testnet software. Test thoroughly before enabling any live trading features.
