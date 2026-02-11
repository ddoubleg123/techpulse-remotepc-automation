# RemotePC Automation System

Automated diagnostic data sync system for TechPulse mechanics.

## 🎯 What It Does

1. **Mechanic enters 6-digit RemotePC code** in TechPulse mobile app
2. **System automatically connects** to their computer via RemotePC
3. **Intelligently discovers diagnostic files** from ANY scan tool
4. **Downloads and parses** vehicle data, VINs, DTCs
5. **Imports into TechPulse** - no manual data entry needed!

## 🏗️ Architecture

```
TechPulse Mobile App
        ↓ (HTTPS)
API Service (Flask)
        ↓ (Redis Queue)
Background Worker (RQ)
        ↓ (PyAutoGUI)
RemotePC Desktop App
        ↓ (Remote Connection)
Mechanic's Computer
        ↓ (PowerShell Search)
Diagnostic Files Discovery
        ↓ (File Transfer)
Download & Parse
        ↓ (API Call)
Upload to TechPulse Database
```

## 📦 Installation

### Prerequisites

```bash
# Python 3.9+
python --version

# Redis Server
# Download from: https://redis.io/download
# Or use Docker:
docker run -d -p 6379:6379 redis

# RemotePC Desktop Application
# Install from: https://www.remotepc.com/download
```

### Setup

```bash
# 1. Navigate to automation directory
cd C:\Users\danie\CascadeProjects\techpulse-web\remotepc-automation

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Create .env file
cp .env.example .env

# 4. Edit .env with your settings
# REDIS_HOST=localhost
# REDIS_PORT=6379
# TECHPULSE_API_URL=https://api.techpulse.com
# PORT=5000
# DEBUG=False
```

## 🚀 Running the System

### Start Redis (if not running)

```bash
# Windows (if installed locally)
redis-server

# Or Docker
docker start redis
```

### Start API Server

```bash
python api_service.py
```

Output:
```
╔══════════════════════════════════════════╗
║   RemotePC Automation API Server        ║
║   Port: 5000                             ║
║   Endpoints:                             ║
║   POST /api/sync/request                 ║
║   GET  /api/sync/status/<job_id>         ║
╚══════════════════════════════════════════╝
```

### Start Background Worker

Open a new terminal:

```bash
rq worker sync --with-scheduler
```

Output:
```
Worker rq:worker:xyz started
Listening on queues: sync
```

## 📱 Mobile App Integration

### Request Sync

```typescript
// In TechPulse mobile app
const requestSync = async (personalKey: string) => {
  const response = await fetch('http://your-server:5000/api/sync/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mechanic_id: currentUserId,
      personal_key: personalKey
    })
  });

  const data = await response.json();
  return data.job_id;
};
```

### Poll Status

```typescript
const pollStatus = async (jobId: string) => {
  const response = await fetch(`http://your-server:5000/api/sync/status/${jobId}`);
  const status = await response.json();

  console.log(`Progress: ${status.progress}%`);
  console.log(`Message: ${status.message}`);
  console.log(`Files found: ${status.files_found}`);

  if (status.status === 'finished') {
    console.log('Sync complete!', status.result);
  }
};
```

## 🔍 How File Discovery Works

The system uses a smart, tool-agnostic approach:

### 1. **PowerShell Search**
```powershell
Get-ChildItem -Path 'C:\Snap-on','C:\Autel','C:\Launch' `
  -Include *.pdf,*.db,*.xml,*.json -Recurse `
  | Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-365)}
```

### 2. **Pattern Matching**
- Searches common diagnostic tool install locations
- Looks for file types: PDF, DB, XML, JSON, CSV
- Filters by keywords: "diagnostic", "dtc", "scan", "vehicle", etc.
- Only gets files from last year

### 3. **Intelligent Parsing**
- **PDF**: Extracts text, finds VINs and DTCs via regex
- **XML**: Parses structured diagnostic data
- **JSON**: Handles various tool-specific formats
- **SQLite DB**: Queries tables for vehicle and code data
- **CSV**: Detects VIN and DTC columns

### 4. **Data Extraction**
Extracts:
- VIN (17-character pattern)
- DTCs (P0420, C1234, etc.)
- Vehicle make/model/year
- Freeze frame data
- Diagnostic timestamps

## 📊 Supported File Formats

| Format | Tools | Status |
|--------|-------|--------|
| PDF | All (universal export) | ✅ Supported |
| XML | Autel, Launch, newer tools | ✅ Supported |
| JSON | Modern cloud-based tools | ✅ Supported |
| SQLite (.db) | Snap-on, Bosch | ✅ Supported |
| CSV | Generic exports | ✅ Supported |
| Text (.txt) | Basic scanners | ✅ Supported |
| Access (.mdb) | Older Snap-on | ⏳ Planned |

## 🛠️ Configuration

### Search Locations (`config.py`)

Add custom search paths:

```python
SEARCH_LOCATIONS = [
    r"C:\Program Files\Snap-on",
    r"C:\YourCustomTool",  # Add your tool here
    r"C:\Users\Public\Documents",
]
```

### File Patterns

Add custom file extensions:

```python
DIAGNOSTIC_FILE_PATTERNS = [
    "*.pdf",
    "*.customext",  # Add custom extension
]
```

### Keywords

Add custom filename keywords:

```python
DIAGNOSTIC_KEYWORDS = [
    "diagnostic", "dtc", "scan",
    "mycustomkeyword",  # Add custom keyword
]
```

## 🧪 Testing

### Test Connection

```bash
python remotepc_connector.py
```

### Test File Discovery

```bash
python file_discovery.py
```

### Test Parser

```bash
python file_parser.py
```

### Test Full Worker

```bash
python worker.py
```

## 📝 API Reference

### POST /api/sync/request

Request a sync job.

**Request:**
```json
{
  "mechanic_id": "mech_123",
  "personal_key": "123456"
}
```

**Response:**
```json
{
  "job_id": "abc-def-ghi",
  "status": "queued",
  "message": "Your files are being organized..."
}
```

### GET /api/sync/status/:job_id

Get sync job status.

**Response:**
```json
{
  "job_id": "abc-def-ghi",
  "status": "started",
  "progress": 45,
  "message": "Downloading files...",
  "files_found": 127
}
```

When finished:
```json
{
  "job_id": "abc-def-ghi",
  "status": "finished",
  "progress": 100,
  "message": "Sync complete!",
  "files_found": 127,
  "result": {
    "files_discovered": 127,
    "files_downloaded": 127,
    "files_processed": 89,
    "vehicles_imported": 45
  }
}
```

### POST /api/sync/cancel/:job_id

Cancel running job.

**Response:**
```json
{
  "status": "cancelled",
  "message": "Sync job cancelled successfully"
}
```

### GET /api/sync/history/:mechanic_id

Get sync history.

**Query Params:**
- `limit`: Number of jobs to return (default: 10)

**Response:**
```json
{
  "mechanic_id": "mech_123",
  "total_syncs": 5,
  "syncs": [
    {
      "job_id": "abc",
      "status": "finished",
      "created_at": "2025-02-09T10:30:00Z",
      "files_found": 127
    }
  ]
}
```

## 🔐 Security Considerations

1. **Personal Key Handling**
   - Keys are never stored
   - Only kept in memory during sync
   - Transmitted via HTTPS only

2. **File Access**
   - Only reads files (no modifications)
   - Downloads to isolated staging area
   - Auto-deleted after processing

3. **Remote Access**
   - Connection only during active sync
   - Automatically disconnects when done
   - Mechanic can revoke access anytime

## 🐛 Troubleshooting

### RemotePC Won't Connect

1. Check RemotePC is installed on server
2. Verify personal key is correct
3. Ensure RemotePC app is running
4. Check firewall settings

### Files Not Found

1. Verify diagnostic tool is installed
2. Check search paths in `config.py`
3. Look at PowerShell output for errors
4. Ensure files exist and are recent (<1 year)

### Parser Errors

1. Check file format is supported
2. Look at parser logs for details
3. Send sample file for analysis

### Worker Not Processing

1. Check Redis is running: `redis-cli ping`
2. Verify worker is running: `rq info`
3. Check worker logs for errors

## 📈 Monitoring

### Check Queue Status

```bash
curl http://localhost:5000/api/queue/stats
```

### Monitor Worker

```bash
rq info
```

### View Logs

```bash
# API logs
tail -f api.log

# Worker logs
tail -f worker.log
```

## 🚧 Roadmap

- [ ] Add Access Database (.mdb) support
- [ ] Implement image OCR for screenshots
- [ ] Add retry logic for failed connections
- [ ] Create admin dashboard
- [ ] Add Slack/email notifications
- [ ] Support multiple workers for scaling
- [ ] Add encryption for downloaded files

## 💡 Tips

1. **Schedule syncs during off-hours** to avoid interrupting mechanics
2. **Test with one mechanic first** before rolling out
3. **Monitor file sizes** - large shops may have GB of data
4. **Keep file age limit reasonable** - don't download years of data
5. **Use SSD storage** for temp downloads (faster processing)

## 📞 Support

For issues or questions:
- Create an issue on GitHub
- Email: support@techpulse.com
- Documentation: https://docs.techpulse.com/remotepc-automation
