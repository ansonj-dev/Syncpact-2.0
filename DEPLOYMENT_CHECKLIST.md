# ✅ SyncPact Render Deployment Checklist

Print this out or keep it open while deploying!

---

## 📋 Pre-Deployment

- [ ] Code is pushed to GitHub: `https://github.com/ansonj-dev/Syncpact-2.0`
- [ ] Have a Render account (sign up at https://render.com)
- [ ] (Optional) Have testnet wallet with STT for live trading

---

## 🚀 Deployment Steps

### Step 1: Create Blueprint
- [ ] Open https://dashboard.render.com
- [ ] Click **"New"** → **"Blueprint"**
- [ ] Connect GitHub account
- [ ] Select repository: `ansonj-dev/Syncpact-2.0`
- [ ] Click **"Apply"**
- [ ] Wait for services to deploy (2-3 min)

### Step 2: Verify Services Created
- [ ] `syncpact-api` service created
- [ ] `syncpact-frontend` service created
- [ ] Disk storage attached to API service

---

## 🔧 Configuration

### Step 3: Configure API Service
Go to **syncpact-api** → **Environment**

#### Required Environment Variables (Already Set)
- [x] `NODE_ENV=production`
- [x] `PORT=10000`
- [x] `NETWORK=testnet`
- [x] `CHAIN_ID=50312`
- [x] `RPC_URL=https://dream-rpc.somnia.network`
- [x] `WS_RPC_URL=wss://dream-rpc.somnia.network/ws`
- [x] `INDEXER_URL=https://prd.smk.somnia.host/v1/graphql`
- [x] `ENABLE_LIVE_TRADING=false`
- [x] `DB_PATH=/opt/render/project/data/syncpact.json`

#### Optional Secrets to Add
- [ ] `PRIVATE_KEY` (⚠️ testnet only, only if enabling live trading)
- [ ] `AI_BASE_URL` (e.g., https://api.openai.com/v1)
- [ ] `AI_API_KEY` (your API key)
- [ ] `AI_MODEL` (e.g., gpt-4)

### Step 4: Configure Frontend Service
Go to **syncpact-frontend** → **Environment**

- [ ] Add `VITE_API_URL` = Your API URL (copy from syncpact-api service URL)
  - Example: `https://syncpact-api.onrender.com`
- [ ] Click **"Save Changes"**
- [ ] Go to **Manual Deploy** → **Deploy latest commit**

### Step 5: Update Frontend Rewrites (If Needed)
If using a different API service name, update `render.yaml`:
- [ ] Edit line 51: Update API URL in rewrite rule
- [ ] Commit and push changes

---

## 🧪 Testing

### Step 6: Test API
- [ ] API URL: `https://syncpact-api.onrender.com`
- [ ] Health endpoint: `https://syncpact-api.onrender.com/api/health`
- [ ] Expected response contains: `"ok": true`

**Test command:**
```bash
curl https://syncpact-api.onrender.com/api/health
```

Expected:
```json
{
  "ok": true,
  "chainId": 50312,
  "network": "shannon-testnet",
  "liveTrading": false,
  "privateKeyConfigured": false
}
```

### Step 7: Test Frontend
- [ ] Frontend URL: `https://syncpact-frontend.onrender.com`
- [ ] Page loads successfully
- [ ] No console errors related to API connection
- [ ] Can view markets data

### Step 8: Test API Endpoints
- [ ] Markets: `https://syncpact-api.onrender.com/api/markets`
- [ ] Strategies: `https://syncpact-api.onrender.com/api/strategies`
- [ ] History: `https://syncpact-api.onrender.com/api/history`

---

## 🔒 Security Verification

### Step 9: Security Checklist
- [ ] `ENABLE_LIVE_TRADING` is `false` (unless you've tested thoroughly)
- [ ] `PRIVATE_KEY` is only a testnet key (if set)
- [ ] No `.env` files committed to GitHub
- [ ] Secrets are stored in Render environment variables
- [ ] `NETWORK=testnet` confirmed

---

## 📊 Monitoring Setup

### Step 10: Set Up Monitoring
- [ ] Check **Logs** tab in both services
- [ ] Verify no startup errors
- [ ] Set up Render notifications (optional)
  - Go to account settings → Notifications
- [ ] Bookmark service URLs for quick access

---

## 🎯 Optional Enhancements

### Step 11: Additional Configuration (Optional)
- [ ] Set up custom domain
  - Go to service → **Settings** → **Custom Domains**
- [ ] Configure auto-deploy settings
  - Go to service → **Settings** → **Auto-Deploy**
- [ ] Set up health check alerts
- [ ] Configure deploy notifications (Slack/Discord)

---

## ✅ Deployment Complete!

### Final Verification
- [ ] Both services show "Live" status
- [ ] API health check passes
- [ ] Frontend loads and displays data
- [ ] No errors in service logs
- [ ] Wallet connection works (if using browser wallet)

---

## 📝 Record Your URLs

Write down your deployed URLs here:

**API Service:**
```
https://______________________________.onrender.com
```

**Frontend:**
```
https://______________________________.onrender.com
```

**API Health:**
```
https://______________________________.onrender.com/api/health
```

---

## 🆘 If Something Goes Wrong

### Common Issues & Solutions

**Build Failed:**
- [ ] Check logs for specific error
- [ ] Run `npm run typecheck` locally
- [ ] Verify Node version compatibility

**API Not Responding:**
- [ ] Wait 2-3 minutes for initial startup
- [ ] Check environment variables are set
- [ ] View logs for errors

**Frontend Can't Reach API:**
- [ ] Verify `VITE_API_URL` is correct
- [ ] Check API service is running
- [ ] Test API health endpoint directly

**Database Issues:**
- [ ] Verify disk is mounted at `/opt/render/project/data`
- [ ] Check disk usage in dashboard
- [ ] Review logs for permission errors

---

## 📚 Resources

- [ ] Bookmark: `RENDER_QUICKSTART.md` (quick reference)
- [ ] Bookmark: `DEPLOYMENT.md` (full guide)
- [ ] Bookmark: Render Dashboard
- [ ] Bookmark: GitHub Repository

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ API returns `{"ok": true}` from health endpoint  
✅ Frontend loads without errors  
✅ Markets data displays correctly  
✅ No critical errors in logs  
✅ Services show "Live" status in Render dashboard  

---

**Deployment Date:** ________________

**Deployed By:** ________________

**Notes:**
```




```

---

Need help? See `DEPLOYMENT.md` for detailed troubleshooting!
