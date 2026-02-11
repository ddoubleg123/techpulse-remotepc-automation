# RemotePC Automation - Technical Architecture

## System Overview

This is a **tool-agnostic** diagnostic data sync system that works with ANY scan tool by intelligently discovering and parsing diagnostic files.

## Core Components

### 1. **API Service** (`api_service.py`)
- Flask REST API
- Handles sync requests from mobile app
- Manages job queue via Redis
- Returns real-time status updates

**Key Endpoints:**
- `POST /api/sync/request` - Initiate sync
- `GET /api/sync/status/:id` - Check progress
- `POST /api/sync/cancel/:id` - Cancel job

### 2. **Background Worker** (`worker.py`)
- RQ (Redis Queue) worker
- Processes sync jobs asynchronously
- Orchestrates entire workflow
- Updates job metadata for progress tracking

**Workflow:**
```
1. Connect via RemotePC
2. Discover files (PowerShell search)
3. Download files to staging
4. Parse files (extract VINs, DTCs)
5. Upload to TechPulse database
6. Cleanup and disconnect
```

### 3. **RemotePC Connector** (`remotepc_connector.py`)
- Automates RemotePC desktop application
- Uses PyAutoGUI for GUI automation
- Handles connection/disconnection
- Manages file transfer

**Connection Flow:**
```
Launch RemotePC App
  ↓
Find "Personal Key" option
  ↓
Enter 6-digit code
  ↓
Wait for connection
  ↓
Verify remote desktop visible
```

### 4. **File Discovery** (`file_discovery.py`)
- **PowerShell-based search** (preferred method)
- Searches common tool install locations
- Filters by file type and keywords
- Sorts by date (most recent first)

**Discovery Strategy:**
```powershell
Get-ChildItem -Path $searchPaths -Include $patterns -Recurse |
  Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-365) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 500
```

**Search Locations:**
- `C:\Snap-on\*`
- `C:\Autel\*`
- `C:\Launch\*`
- `C:\Bosch\*`
- `C:\Users\Public\Documents\*`
- (Extensible via config)

**File Patterns:**
- `*.pdf` - Universal diagnostic reports
- `*.db`, `*.sqlite` - Database files
- `*.xml`, `*.json` - Structured data
- `*.csv` - Exported data
- `*.txt` - Text reports

### 5. **File Parser** (`file_parser.py`)
- Multi-format parser with intelligent detection
- Extracts VINs, DTCs, vehicle info
- Handles tool-specific variations

**Supported Formats:**

| Format | Detection Method | Data Extracted |
|--------|------------------|----------------|
| **PDF** | PyPDF2 text extraction + regex | VIN, DTCs, vehicle info |
| **XML** | ElementTree parsing | Structured diagnostic data |
| **JSON** | JSON parsing + normalization | Vehicle and code data |
| **SQLite** | SQL queries on common tables | Database records |
| **CSV** | Pandas + column detection | Tabular data |
| **Text** | Regex pattern matching | Unstructured text |

**Extraction Patterns:**
```python
VIN:  \b[A-HJ-NPR-Z0-9]{17}\b
DTC:  [PCBU][0-9A-F]{4}
Year: (?:Year|MODEL YEAR)[:\s]*(\d{4})
```

### 6. **Configuration** (`config.py`)
- Centralized settings
- Search paths and patterns
- Timing parameters
- File age limits

## Data Flow

```
┌─────────────────┐
│  TechPulse App  │
│  (React Native) │
└────────┬────────┘
         │ HTTPS POST /api/sync/request
         │ { mechanic_id, personal_key }
         ↓
┌─────────────────┐
│   API Service   │
│    (Flask)      │
└────────┬────────┘
         │ Enqueue Job
         ↓
┌─────────────────┐
│  Redis Queue    │
│   (RQ)          │
└────────┬────────┘
         │ Dequeue
         ↓
┌─────────────────┐
│ Background      │
│ Worker (Python) │
└────────┬────────┘
         │
         ├─→ RemotePC Connector
         │   └─→ PyAutoGUI automation
         │       └─→ Connect to mechanic PC
         │
         ├─→ File Discovery
         │   └─→ PowerShell search
         │       └─→ Find diagnostic files
         │
         ├─→ File Transfer
         │   └─→ Download to staging
         │       └─→ temp/downloads/{mechanic_id}
         │
         ├─→ File Parser
         │   └─→ Extract VIN, DTCs, vehicle data
         │       └─→ Return structured JSON
         │
         └─→ Database Upload
             └─→ POST to TechPulse API
                 └─→ Import vehicles/codes
```

## File Parsing Intelligence

### Multi-Format Support

**Example 1: PDF Report**
```
Input: diagnostic_report_2025.pdf
Process:
  1. Extract text with PyPDF2
  2. Find VIN pattern: 1HGBH41JXMN109186
  3. Find DTCs: P0420, P0301, P0171
  4. Extract descriptions via context
Output: Structured JSON
```

**Example 2: XML File**
```xml
<DiagnosticReport>
  <Vehicle>
    <VIN>1HGBH41JXMN109186</VIN>
    <Make>Honda</Make>
    <Model>Civic</Model>
    <Year>2021</Year>
  </Vehicle>
  <DTCs>
    <DTC code="P0420" desc="Catalyst Efficiency Below Threshold"/>
    <DTC code="P0301" desc="Cylinder 1 Misfire"/>
  </DTCs>
</DiagnosticReport>
```

Process:
  1. Parse XML tree
  2. Find VIN element
  3. Extract vehicle info elements
  4. Parse DTC elements with attributes

**Example 3: SQLite Database**
```sql
-- Tables: vehicles, diagnostic_codes
SELECT v.vin, v.make, v.model, v.year,
       c.code, c.description
FROM vehicles v
JOIN diagnostic_codes c ON v.id = c.vehicle_id
```

Process:
  1. Connect to database
  2. Discover table schema
  3. Query for VIN and codes
  4. Join related tables

### Intelligent Fallbacks

If structured parsing fails, use regex on text:
```python
# Extract VIN from any text
vin_pattern = r'\b[A-HJ-NPR-Z0-9]{17}\b'

# Extract DTCs from any text
dtc_pattern = r'([PCBU][0-9A-F]{4})'

# Extract context around DTC
context_pattern = f'{dtc_code}[:\s-]*([^\n\r]*)'
```

## Tool-Agnostic Design

### Why It Works with Any Tool

1. **No hardcoded tool paths**
   - Searches common install locations
   - Extensible via config

2. **Universal file format support**
   - PDF (all tools can export)
   - Common data formats (XML, JSON, CSV)
   - Database files (SQLite, Access)

3. **Pattern-based discovery**
   - Looks for diagnostic keywords
   - Filters by file age
   - Sorts by relevance

4. **Flexible parsing**
   - Multiple parsers for each format
   - Regex fallbacks
   - Handles variations in structure

### Adding Support for New Tools

1. **Add search path** to `config.py`:
```python
SEARCH_LOCATIONS.append(r"C:\NewTool\Data")
```

2. **Add file pattern** if needed:
```python
DIAGNOSTIC_FILE_PATTERNS.append("*.newtoolext")
```

3. **Add parser** if format is unique:
```python
def _parse_newtool_format(self, file_path):
    # Custom parsing logic
    pass
```

## Scalability & Performance

### Asynchronous Processing
- Jobs queued in Redis
- Workers process in background
- Mobile app polls for status
- No blocking operations

### Parallel Workers
```bash
# Start multiple workers
rq worker sync &  # Worker 1
rq worker sync &  # Worker 2
rq worker sync &  # Worker 3
```

Each worker can process different mechanics simultaneously.

### Caching & Optimization
- File search results cached per session
- Parsed data staged before upload
- Incremental uploads (future: only new files)

### Resource Management
- Temp files auto-deleted after processing
- Connection timeout prevents hanging
- Max file limits prevent memory issues
- File age filter reduces data volume

## Security Model

### Data Flow Security
```
Mobile App
  ↓ HTTPS (TLS)
API Server
  ↓ Local (Redis)
Worker
  ↓ RemotePC Protocol
Mechanic's Computer (Read-only)
  ↓ File Transfer
Staging Area (Encrypted disk)
  ↓ Parsing
Memory (Temporary)
  ↓ HTTPS (TLS)
TechPulse Database
  ↓ Delete
Temp Files Removed
```

### Access Control
- Personal keys never stored
- Connection only during active sync
- Read-only file access
- Auto-disconnect after completion
- Mechanic can revoke anytime

### Data Handling
- Files never modified on remote machine
- Downloads to isolated staging
- Parsed data sanitized before upload
- Temp files securely deleted
- No persistent storage of diagnostic data

## Monitoring & Debugging

### Job Metadata
```json
{
  "job_id": "abc-123",
  "mechanic_id": "mech_456",
  "progress": 75,
  "message": "Processing files...",
  "files_found": 127,
  "files_downloaded": 127,
  "files_processed": 89,
  "current_file": "diagnostic_2025.pdf",
  "errors": [],
  "updated_at": "2025-02-09T10:30:00Z"
}
```

### Logging
- API requests logged
- Worker progress tracked
- File operations logged
- Errors captured with stack traces

### Health Checks
```bash
# API health
curl http://localhost:5000/health

# Queue stats
curl http://localhost:5000/api/queue/stats

# Worker status
rq info
```

## Deployment

### Development
```bash
# API
python api_service.py

# Worker
rq worker sync
```

### Production
```bash
# API (with gunicorn)
gunicorn -w 4 -b 0.0.0.0:5000 api_service:app

# Worker (with supervisor)
supervisord -c supervisord.conf

# Redis (Docker)
docker run -d -p 6379:6379 --name redis redis
```

### Environment Variables
```bash
REDIS_HOST=redis.production.com
TECHPULSE_API_URL=https://api.techpulse.com
DEBUG=False
```

## Future Enhancements

### Phase 2
- [ ] OCR for diagnostic screenshots
- [ ] Incremental sync (only new files)
- [ ] Multi-mechanic batching
- [ ] Compression for large files

### Phase 3
- [ ] Real-time sync (webhook-based)
- [ ] Mobile app file upload (backup)
- [ ] Direct OBD2 integration
- [ ] Cloud storage integration

### Phase 4
- [ ] Machine learning for better parsing
- [ ] Automatic tool detection
- [ ] Predictive file discovery
- [ ] Advanced analytics

## Summary

This system provides a **robust, tool-agnostic solution** for automating diagnostic data sync. Key strengths:

✅ Works with ANY scan tool
✅ Intelligent file discovery
✅ Multi-format parsing
✅ Scalable architecture
✅ Real-time progress tracking
✅ Secure data handling
✅ Easy to extend

The mechanic simply enters their 6-digit RemotePC code and the system handles everything else automatically.
