"""
Configuration for RemotePC Automation System
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directories
BASE_DIR = Path(__file__).parent
TEMP_DIR = BASE_DIR / "temp"
DOWNLOADS_DIR = TEMP_DIR / "downloads"
SCREENSHOTS_DIR = TEMP_DIR / "screenshots"
ASSETS_DIR = BASE_DIR / "assets"

# Create directories
for directory in [TEMP_DIR, DOWNLOADS_DIR, SCREENSHOTS_DIR, ASSETS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Redis configuration
REDIS_URL = os.getenv('REDIS_URL')  # Full Redis URL if available
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_DB = int(os.getenv('REDIS_DB', 0))

# RemotePC configuration
REMOTEPC_APP_NAME = "RemotePC"
CONNECTION_TIMEOUT = 30  # seconds

# File discovery settings
SEARCH_LOCATIONS = [
    # Common diagnostic tool locations
    r"C:\Program Files\Snap-on",
    r"C:\Snap-on",
    r"C:\Program Files\Autel",
    r"C:\Autel",
    r"C:\Program Files\Launch",
    r"C:\Launch",
    r"C:\X431",
    r"C:\Program Files\Bosch",
    r"C:\Bosch",
    r"C:\KTS",
    r"C:\Program Files (x86)\Snap-on",
    r"C:\Program Files (x86)\Autel",
    r"C:\Program Files (x86)\Launch",
    r"C:\Program Files (x86)\Bosch",
    # Generic document locations
    r"C:\Users\Public\Documents",
    r"C:\ProgramData",
    # Desktop (mechanics often save here)
    r"C:\Users\{username}\Desktop",
    r"C:\Users\{username}\Documents",
]

# File patterns that indicate diagnostic data
DIAGNOSTIC_FILE_PATTERNS = [
    # PDF reports
    "*.pdf",
    # Database files
    "*.db",
    "*.sqlite",
    "*.mdb",
    "*.accdb",
    # Data files
    "*.xml",
    "*.json",
    "*.csv",
    "*.txt",
    # Diagnostic tool specific
    "*.sdx",  # Snap-on
    "*.rep",  # Report files
    "*.log",
    "*.dat",
]

# Keywords in filenames that suggest diagnostic content
DIAGNOSTIC_KEYWORDS = [
    "diagnostic", "dtc", "code", "scan", "report", "vehicle",
    "vin", "obd", "fault", "trouble", "freeze", "pid",
    "sensor", "snapshot", "datastream", "live", "capture"
]

# File age limit (only get files newer than this)
MAX_FILE_AGE_DAYS = 365  # 1 year

# Maximum files to download per session
MAX_FILES_PER_SESSION = 500

# Automation timing (seconds)
TIMING = {
    'app_launch': 3,
    'window_load': 2,
    'click_delay': 0.5,
    'typing_delay': 0.1,
    'connection_wait': 15,
    'file_operation': 2,
}
