# Deploy to Render - Complete Guide

## Option 1: Deploy via Render Dashboard (Easiest)

### Step 1: Push to GitHub

```bash
cd /c/Users/danie/CascadeProjects/techpulse-web
git add remotepc-automation/
git commit -m "Add RemotePC automation system"
git push origin main
```

### Step 2: Deploy on Render Dashboard

1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub repo: `techpulse-web`
4. Render will automatically detect `remotepc-automation/render.yaml`
5. Click "Apply" to create all services:
   - Redis instance
   - API web service
   - Background worker

### Step 3: Get Your API URL

After deployment completes:
1. Go to your web service
2. Copy the URL (e.g., `https://techpulse-sync-api.onrender.com`)
3. Update your mobile app:

```typescript
// In mobile/src/screens/DataSyncScreen.tsx
const API_BASE_URL = 'https://techpulse-sync-api.onrender.com';
```

---

## Option 2: Deploy via Render CLI

### Prerequisites

```bash
# Install Render CLI
npm install -g @render/cli

# Or with pip
pip install render-cli
```

### Step 1: Get Render API Key

1. Go to https://dashboard.render.com/u/settings/api-keys
2. Create new API key
3. Copy the key

### Step 2: Set Environment Variable

```bash
# Windows
set RENDER_API_KEY=your-api-key-here

# Or add to .env
echo "RENDER_API_KEY=your-api-key-here" >> .env
```

### Step 3: Push Code to GitHub

```bash
cd /c/Users/danie/CascadeProjects/techpulse-web
git add remotepc-automation/
git commit -m "Add RemotePC automation system"
git push origin main
```

### Step 4: Deploy with CLI

```bash
cd remotepc-automation

# Deploy using Blueprint
render blueprint deploy
```

Or manually create services:

```bash
# Create Redis
render services create redis \
  --name techpulse-redis \
  --plan starter

# Create API service
render services create web \
  --name techpulse-sync-api \
  --runtime python \
  --plan starter \
  --buildCommand "pip install -r requirements.txt" \
  --startCommand "gunicorn -w 4 -b 0.0.0.0:\$PORT api_service:app" \
  --repo https://github.com/YOUR_USERNAME/techpulse-web \
  --branch main \
  --rootDir remotepc-automation

# Create Worker service
render services create worker \
  --name techpulse-sync-worker \
  --runtime python \
  --plan starter \
  --buildCommand "pip install -r requirements.txt" \
  --startCommand "rq worker sync --with-scheduler" \
  --repo https://github.com/YOUR_USERNAME/techpulse-web \
  --branch main \
  --rootDir remotepc-automation
```

---

## Option 3: Quick Deploy Script

I'll create a script that does everything:

```bash
cd /c/Users/danie/CascadeProjects/techpulse-web
./remotepc-automation/deploy-to-render.sh
```

---

## What Gets Deployed

### 1. Redis Instance
- **Name**: techpulse-redis
- **Plan**: Starter (Free)
- **Purpose**: Job queue for background processing
- **Persistence**: In-memory (resets on restart - upgrade to paid for persistence)

### 2. Web Service (API)
- **Name**: techpulse-sync-api
- **URL**: https://techpulse-sync-api.onrender.com
- **Plan**: Starter (Free)
- **Runtime**: Python 3.11
- **Command**: `gunicorn -w 4 -b 0.0.0.0:$PORT api_service:app`
- **Auto-deploy**: Yes (on git push)

### 3. Background Worker
- **Name**: techpulse-sync-worker
- **Plan**: Starter (Free)
- **Runtime**: Python 3.11
- **Command**: `rq worker sync --with-scheduler`
- **Processes**: Sync jobs from Redis queue

---

## Environment Variables (Auto-configured)

All services get these automatically from `render.yaml`:

- `REDIS_HOST` - Redis hostname (auto-linked)
- `REDIS_PORT` - Redis port (auto-linked)
- `PYTHON_VERSION` - 3.11
- `DEBUG` - False
- `TECHPULSE_API_URL` - Your main TechPulse API URL

---

## Testing Deployment

### 1. Check Health Endpoint

```bash
curl https://techpulse-sync-api.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "RemotePC Automation API",
  "version": "1.0.0"
}
```

### 2. Check Queue Stats

```bash
curl https://techpulse-sync-api.onrender.com/api/queue/stats
```

### 3. Test Sync Request

```bash
curl -X POST https://techpulse-sync-api.onrender.com/api/sync/request \
  -H "Content-Type: application/json" \
  -d '{
    "mechanic_id": "test_mechanic",
    "personal_key": "123456"
  }'
```

---

## Update Mobile App

Once deployed, update your mobile app to use the production URL:

```typescript
// mobile/src/screens/DataSyncScreen.tsx (Line 10)
const API_BASE_URL = 'https://techpulse-sync-api.onrender.com';
```

Then rebuild your mobile app:

```bash
cd mobile
npx expo run:android
```

---

## Monitoring

### View Logs

**Dashboard:**
1. Go to https://dashboard.render.com
2. Click on service (API or Worker)
3. View "Logs" tab

**CLI:**
```bash
render logs --service techpulse-sync-api
render logs --service techpulse-sync-worker
```

### Check Service Status

```bash
render services list
```

---

## Troubleshooting

### API won't start
- Check build logs for dependency errors
- Verify Python version compatibility
- Check environment variables are set

### Worker not processing jobs
- Check worker logs
- Verify Redis connection
- Test Redis connection: `redis-cli -h REDIS_HOST -p REDIS_PORT ping`

### Redis connection errors
- Verify Redis service is running
- Check environment variables (REDIS_HOST, REDIS_PORT)
- Restart services to reconnect

---

## Cost

**Free Tier Limits:**
- Redis: 25 MB storage
- Web service: 750 hours/month
- Worker: 750 hours/month
- Bandwidth: 100 GB/month

**Upgrade if needed:**
- Redis Starter: $7/month (250 MB)
- Standard: $25/month (1 GB)
- Web/Worker Starter: $7/month each

---

## Automatic Deploys

Once set up, every time you push to GitHub:
```bash
git add .
git commit -m "Update automation"
git push origin main
```

Render automatically:
1. Detects changes
2. Rebuilds services
3. Deploys new version
4. Zero downtime

---

## Next Steps After Deployment

1. ✅ Get deployed URL
2. ✅ Update mobile app API_BASE_URL
3. ✅ Test health endpoint
4. ✅ Test sync from mobile app
5. ✅ Monitor logs for first sync
6. ✅ Set up alerts (optional)

## Support

If deployment fails:
- Check Render dashboard logs
- Run: `render logs --service SERVICE_NAME`
- Contact Render support: https://render.com/docs
