# SyncPact Render Deployment - Quick Start

## 🚀 Deploy in 5 Minutes

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Deploy on Render
1. Go to https://dashboard.render.com
2. Click **"New"** → **"Blueprint"**
3. Connect GitHub and select `ansonj-dev/Syncpact-2.0`
4. Click **"Apply"**

### 3. Configure Secrets (After Deployment)
Go to `syncpact-api` service → **Environment** → Add:

| Variable | Value | Required? |
|----------|-------|-----------|
| `PRIVATE_KEY` | `0x...` | Only for live trading |
| `AI_API_KEY` | Your API key | Optional |

### 4. Update Frontend API URL
Go to `syncpact-frontend` → **Environment** → Add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://syncpact-api.onrender.com` |

Then click **"Manual Deploy"** → **"Deploy latest commit"**

### 5. Test Your Deployment

**API Health Check:**
```
https://syncpact-api.onrender.com/api/health
```

**Frontend:**
```
https://syncpact-frontend.onrender.com
```

## 📋 Files Added for Deployment

- `render.yaml` - Blueprint configuration
- `DEPLOYMENT.md` - Full deployment guide
- `RENDER_QUICKSTART.md` - This file
- `scripts/ensure-data-dir.js` - Data directory setup

## ⚙️ Default Configuration

```
NETWORK=testnet
ENABLE_LIVE_TRADING=false  ⚠️ Keep false until tested!
PORT=10000
DB_PATH=/opt/render/project/data/syncpact.json
```

## 🔒 Security Notes

- ✅ Testnet only
- ✅ Live trading disabled by default
- ✅ Never commit private keys
- ✅ Use Render secret environment variables

## 💰 Cost

- **Backend API**: ~$7/month (Starter plan)
- **Frontend**: Free (Static site)
- **Storage**: Free (1GB disk)
- **Total**: ~$7/month

## 📚 Need More Help?

See `DEPLOYMENT.md` for the complete guide with:
- Manual deployment steps
- Troubleshooting
- Monitoring & maintenance
- Security checklist

## 🆘 Common Issues

**Build fails?**
```bash
npm run typecheck  # Test locally first
```

**API not responding?**
- Wait 2-3 minutes for initial startup
- Check service logs in Render dashboard

**Frontend can't reach API?**
- Verify `VITE_API_URL` is set
- Check API health endpoint works

---

**Ready?** Start with step 1 above! 🎯
