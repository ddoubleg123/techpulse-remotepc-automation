# Render Manual Setup Instructions

The API deployment is returning 502 errors. This is likely because the Redis environment variables need to be configured manually in the Render dashboard.

## Fix the Deployment

### Step 1: Access Render Dashboard
Go to: https://dashboard.render.com

### Step 2: Find Your API Service
Click on the `techpulse-sync-api` service

### Step 3: Add Missing Environment Variables

Click on "Environment" in the left sidebar, then add these environment variables:

**Required Variables:**
- `REDIS_HOST` = `red-d66d6m7gi27c738cuiv0`
- `REDIS_PORT` = `6379`

**Already Set (verify these exist):**
- `PYTHON_VERSION` = `3.11`
- `DEBUG` = `False`
- `RENDER` = `true`
- `TECHPULSE_API_URL` = `https://api.techpulse.com`

### Step 4: Trigger Manual Deploy

After adding the Redis variables:
1. Click "Manual Deploy"
2. Select "Deploy latest commit"
3. Click "Deploy"

### Step 5: Wait for Deployment

The deployment takes 2-5 minutes. Watch the logs tab to see progress.

### Step 6: Test the API

Once deployed, test with:
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

## Alternative: Use Render Internal URL

If you have access to Render's internal Redis URL (with authentication), use that instead:

In the Render dashboard for your Redis instance, you should see an "Internal Redis URL" like:
```
redis://default:password@red-d66d6m7gi27c738cuiv0:6379
```

If you have that, you can set:
- `REDIS_URL` = `redis://default:password@red-d66d6m7gi27c738cuiv0:6379`

And update `config.py` to prioritize `REDIS_URL`:
```python
if REDIS_URL:
    # Parse Redis URL
    redis_conn = Redis.from_url(REDIS_URL)
else:
    redis_conn = Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB)
```

## Troubleshooting

### Still Getting 502?

Check the logs in Render dashboard for these common issues:

1. **Import Error**: Missing dependencies in requirements.txt
2. **Redis Connection Error**: Wrong Redis host/port
3. **Port Binding Error**: Gunicorn not binding to $PORT
4. **Worker Import Error**: Still trying to import pyautogui (should be fixed)

### View Logs

In Render dashboard:
1. Click on `techpulse-sync-api`
2. Click "Logs" tab
3. Look for Python errors or stack traces

### Common Log Errors and Fixes

**Error: `KeyError: 'DISPLAY'`**
- Fixed in latest commit - make sure latest code is deployed

**Error: `ConnectionRefusedError: [Errno 111] Connection refused` (Redis)**
- Add REDIS_HOST and REDIS_PORT environment variables
- Verify Redis instance is running

**Error: `ImportError: No module named 'worker_mock'`**
- Verify worker_mock.py is in the repository
- Check requirements.txt has all dependencies

## After Successful Deployment

Once the API is healthy:

1. **Get API URL**: `https://techpulse-sync-api.onrender.com`

2. **Test endpoints**:
   ```bash
   # Health check
   curl https://techpulse-sync-api.onrender.com/health

   # Queue stats
   curl https://techpulse-sync-api.onrender.com/api/queue/stats

   # Request a test sync
   curl -X POST https://techpulse-sync-api.onrender.com/api/sync/request \
     -H "Content-Type: application/json" \
     -d '{"mechanic_id":"test123","personal_key":"123456"}'
   ```

3. **Update mobile app** with API URL in `DataSyncScreen.tsx`

4. **Test from mobile app** - the sync button should work!
