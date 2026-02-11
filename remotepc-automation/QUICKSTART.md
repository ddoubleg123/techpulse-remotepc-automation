# Quick Start Guide

Get RemotePC automation running in 5 minutes.

## 1️⃣ Prerequisites

Install these first:

```bash
# Python 3.9+
python --version

# Redis (choose one):
# - Download: https://redis.io/download
# - Docker: docker run -d -p 6379:6379 --name redis redis

# RemotePC Desktop App
# Download: https://www.remotepc.com/download
```

## 2️⃣ Install

```bash
cd C:\Users\danie\CascadeProjects\techpulse-web\remotepc-automation

# Install Python packages
pip install -r requirements.txt

# Copy environment file
copy .env.example .env

# Edit .env if needed (defaults should work)
notepad .env
```

## 3️⃣ Test Installation

```bash
python test_system.py
```

You should see:
```
✅ All imports successful!
✅ Connected to Redis
✅ Extracted VIN: 1HGBH41JXMN109186
✅ 6/6 tests passed
🎉 All tests passed! System is ready to use.
```

## 4️⃣ Start Services

**Terminal 1 - API Server:**
```bash
python api_service.py
```

**Terminal 2 - Worker:**
```bash
rq worker sync
```

## 5️⃣ Test from Mobile App

In your TechPulse mobile app, add this test screen:

```typescript
// Test sync request
const testSync = async () => {
  const response = await fetch('http://localhost:5000/api/sync/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mechanic_id: 'test_mechanic',
      personal_key: '123456'  // Use real RemotePC key
    })
  });

  const data = await response.json();
  console.log('Job ID:', data.job_id);

  // Poll for status
  const checkStatus = setInterval(async () => {
    const statusRes = await fetch(
      `http://localhost:5000/api/sync/status/${data.job_id}`
    );
    const status = await statusRes.json();

    console.log(`${status.progress}%: ${status.message}`);

    if (status.status === 'finished') {
      clearInterval(checkStatus);
      console.log('Done!', status.result);
    }
  }, 3000);
};
```

## 6️⃣ What Happens

1. **Mechanic enters personal key** in app
2. **API queues sync job**
3. **Worker picks up job**
4. **RemotePC connects** to mechanic's computer
5. **PowerShell searches** for diagnostic files
6. **Files are downloaded** to temp folder
7. **Parser extracts** VINs, DTCs, vehicle info
8. **Data uploads** to TechPulse database
9. **Mechanic sees** imported vehicles in app

## 🎯 Expected Output

### API Server
```
╔══════════════════════════════════════════╗
║   RemotePC Automation API Server        ║
║   Port: 5000                             ║
╚══════════════════════════════════════════╝
 * Running on http://0.0.0.0:5000
```

### Worker
```
Worker rq:worker:abc started
[0%] Connecting to your computer...
[20%] Searching for diagnostic files...
[40%] Found 127 files. Downloading...
[60%] Processing diagnostic data...
[80%] Uploading to TechPulse...
[100%] Sync complete!
```

### Mobile App
```
Sync Progress: 100%
Message: Sync complete!
Files Found: 127
Vehicles Imported: 45
```

## ⚠️ Troubleshooting

### Redis not running
```bash
# Start Redis
redis-server

# Or Docker
docker start redis
```

### Import errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### RemotePC won't connect
- Make sure RemotePC desktop app is installed
- Verify personal key is correct (6 digits)
- Check RemotePC app is running on server

### Files not found
- Add custom search paths to `config.py`
- Check mechanic has diagnostic files on computer
- Verify file age (<1 year by default)

## 📚 Next Steps

- Read [README.md](README.md) for full documentation
- Customize search paths in `config.py`
- Add more file parsers for specific tools
- Set up monitoring and alerts
- Deploy to production server

## 🆘 Still Having Issues?

1. Check logs for errors
2. Run `python test_system.py` again
3. Create an issue with error details
4. Email: support@techpulse.com
