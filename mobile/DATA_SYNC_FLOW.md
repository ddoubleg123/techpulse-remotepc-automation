# Data Sync Button Flow

## Where the Button Is

### Dashboard Screen
The "Sync My Data" button appears on the **Dashboard** screen, right below the "Chat With Synth" button.

```
┌─────────────────────────────────────┐
│  Dashboard                          │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  New Vehicle                  │ │  ← Primary button
│  │  Start a new diagnostic       │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 💬 Chat With Synth           │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ ☁️ Sync My Data  [Auto Import]│ │  ← NEW BUTTON
│  └───────────────────────────────┘ │
│                                     │
│  Recent Activity                   │
│  ┌───────────────────────────────┐ │
│  │ 2019 Honda Accord             │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## User Flow

### Step 1: Tap "Sync My Data"
```
Dashboard → Sync My Data button tapped
           ↓
      Opens DataSyncScreen
```

### Step 2: DataSync Screen Shows Instructions
```
┌─────────────────────────────────────┐
│  ☁️ Sync Your Data                  │
│                                     │
│  Automatically import diagnostic    │
│  files from your shop computer      │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ How it works:                 │ │
│  │                               │ │
│  │ ① Open RemotePC on shop PC    │ │
│  │ ② Find your 6-digit key       │ │
│  │ ③ Enter key below             │ │
│  │ ④ Wait 2-5 minutes            │ │
│  └───────────────────────────────┘ │
│                                     │
│  RemotePC Personal Key              │
│  ┌───────────────────────────────┐ │
│  │      1  2  3  4  5  6         │ │  ← Input field
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     🔄 Start Sync             │ │  ← Action button
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Step 3: Enter 6-Digit Key
```
User types: 1 2 3 4 5 6
           ↓
Button becomes active (blue)
```

### Step 4: Tap "Start Sync"
```
Start Sync button tapped
           ↓
API POST request to backend
           ↓
Job created in queue
           ↓
Show progress screen
```

### Step 5: Progress Screen
```
┌─────────────────────────────────────┐
│  ☁️ Sync Your Data                  │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │         🔄 Loading...         │ │
│  │                               │ │
│  │  ████████░░░░░░░░░░░░  45%   │ │  ← Progress bar
│  │                               │ │
│  │     Downloading files...      │ │  ← Status message
│  │                               │ │
│  │     📁 Found 127 files        │ │  ← Files count
│  │                               │ │
│  │  ┌─────────────────────────┐ │ │
│  │  │      Cancel             │ │ │  ← Cancel option
│  │  └─────────────────────────┘ │ │
│  └───────────────────────────────┘ │
│                                     │
│  Sync Details                       │
│  Job ID: abc12345...                │
│  Status: started                    │
└─────────────────────────────────────┘
```

Progress updates every 3 seconds:
- 0%: "Preparing to sync..."
- 5%: "Connecting to your computer..."
- 20%: "Searching for diagnostic files..."
- 40%: "Found 127 files. Downloading..."
- 60%: "Processing diagnostic data..."
- 80%: "Uploading to TechPulse..."
- 95%: "Cleaning up..."
- 100%: "Sync complete!"

### Step 6: Completion
```
┌─────────────────────────────────────┐
│  Sync Complete! 🎉                  │
│                                     │
│  Successfully imported 45 vehicles  │
│  from 89 files.                     │
│                                     │
│  Your data is now available in      │
│  the app.                           │
│                                     │
│  ┌───────────────────────────────┐ │
│  │    View Vehicles              │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │    OK                         │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

Tapping "View Vehicles" navigates back to Dashboard where imported vehicles now appear.

## Behind the Scenes

### What Happens When User Taps "Start Sync"

```
Mobile App (React Native)
    ↓ POST /api/sync/request
    ↓ { mechanic_id, personal_key: "123456" }

Backend API (Flask)
    ↓ Validate key format
    ↓ Queue job in Redis
    ↓ Return job_id

Background Worker (Python + RQ)
    ↓ Pick up job from queue
    ↓ Connect via RemotePC (PyAutoGUI)
    ↓ Search for files (PowerShell)
    ↓ Download files to temp
    ↓ Parse files (extract VINs, DTCs)
    ↓ Upload to TechPulse database
    ↓ Mark job complete

Mobile App
    ↓ Poll /api/sync/status/{job_id}
    ↓ Update progress bar
    ↓ Show completion alert
```

## Technical Details

### Files Involved

**Mobile App:**
- `src/screens/DataSyncScreen.tsx` - Full sync UI
- `src/screens/DashboardScreen.tsx` - Button placement
- `App.tsx` - Navigation setup

**Backend:**
- `remotepc-automation/api_service.py` - API endpoints
- `remotepc-automation/worker.py` - Background processing
- `remotepc-automation/remotepc_connector.py` - RemotePC automation
- `remotepc-automation/file_discovery.py` - File search
- `remotepc-automation/file_parser.py` - Data extraction

### API Endpoints Used

1. **POST /api/sync/request**
   - Initiates sync
   - Returns job_id

2. **GET /api/sync/status/:job_id**
   - Returns current progress
   - Polled every 3 seconds

3. **POST /api/sync/cancel/:job_id** (optional)
   - Cancels running job

## Error Handling

### Invalid Key
```
User enters: "12345" (only 5 digits)
         ↓
Alert: "Personal key must be exactly 6 digits"
```

### Connection Failed
```
RemotePC can't connect
         ↓
Progress stops at 5%
         ↓
Alert: "Could not connect to your computer.
        Please check RemotePC is running."
```

### No Files Found
```
Search completes but no files found
         ↓
Job completes with 0 files
         ↓
Alert: "No diagnostic files found.
        Make sure your scan tool has saved data."
```

## Configuration

### Update Server URL
In `DataSyncScreen.tsx`:
```typescript
const API_BASE_URL = 'http://your-server.com:5000';
// Change to your production URL
```

### Customize Polling Interval
In `DataSyncScreen.tsx`:
```typescript
setInterval(async () => {
  // Poll status
}, 3000); // Change from 3 seconds
```

## Testing

### Test Locally
1. Start backend: `python api_service.py`
2. Start worker: `rq worker sync`
3. Run mobile app
4. Tap "Sync My Data"
5. Enter test key: `123456`
6. Watch progress

### Test Without RemotePC
Mock the sync in `worker.py`:
```python
def sync_mechanic_data(mechanic_id, personal_key, job_id=None):
    # For testing, return mock data
    return {
        'files_discovered': 50,
        'vehicles_imported': 20
    }
```

## Future Enhancements

- [ ] Add sync history (show past syncs)
- [ ] Schedule automatic syncs
- [ ] Sync in background
- [ ] Push notifications when complete
- [ ] Show preview of files before import
- [ ] Selective import (choose which vehicles)
