"""
Intelligent file discovery system for diagnostic data
Searches for diagnostic files regardless of tool brand
"""
import os
import time
import pyautogui
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import config

class DiagnosticFileDiscovery:
    """
    Smart file discovery that works with any diagnostic tool
    """

    def __init__(self):
        self.found_files = []
        self.search_stats = {
            'locations_searched': 0,
            'files_found': 0,
            'total_size_mb': 0
        }

    def search_all_locations(self) -> List[Dict]:
        """
        Search all common locations for diagnostic files
        Returns list of discovered files with metadata
        """
        print("🔍 Starting intelligent file discovery...")

        # Get current username for path expansion
        username = self._get_remote_username()

        for location in config.SEARCH_LOCATIONS:
            # Expand {username} in paths
            expanded_location = location.replace('{username}', username)

            try:
                self._search_location(expanded_location)
            except Exception as e:
                print(f"   Skipping {expanded_location}: {str(e)}")
                continue

        # Sort by date modified (most recent first)
        self.found_files.sort(key=lambda x: x['modified_date'], reverse=True)

        # Limit to max files
        self.found_files = self.found_files[:config.MAX_FILES_PER_SESSION]

        print(f"\n✅ Discovery complete:")
        print(f"   • Searched {self.search_stats['locations_searched']} locations")
        print(f"   • Found {self.search_stats['files_found']} diagnostic files")
        print(f"   • Total size: {self.search_stats['total_size_mb']:.2f} MB")

        return self.found_files

    def _get_remote_username(self) -> str:
        """
        Get the username of the remote computer
        """
        # Open Command Prompt and get username
        pyautogui.hotkey('win', 'r')
        time.sleep(config.TIMING['window_load'])
        pyautogui.write('cmd')
        pyautogui.press('enter')
        time.sleep(config.TIMING['window_load'])

        pyautogui.write('echo %USERNAME%')
        pyautogui.press('enter')
        time.sleep(1)

        # Take screenshot and use OCR to read username
        # For now, default to Public
        pyautogui.hotkey('alt', 'f4')  # Close CMD

        return "Public"  # Fallback - will work for Public folders

    def _search_location(self, location: str):
        """
        Search a specific location for diagnostic files
        """
        print(f"   Searching: {location}")

        # Open File Explorer
        pyautogui.hotkey('win', 'e')
        time.sleep(config.TIMING['window_load'])

        # Navigate to location
        pyautogui.hotkey('ctrl', 'l')  # Focus address bar
        time.sleep(config.TIMING['click_delay'])
        pyautogui.write(location, interval=0.02)
        pyautogui.press('enter')
        time.sleep(config.TIMING['window_load'])

        # Check if location exists (if error dialog appears)
        # This is simplified - in production, use image recognition

        # Use Windows search to find diagnostic files
        pyautogui.hotkey('ctrl', 'f')  # Open search
        time.sleep(config.TIMING['window_load'])

        # Search for files with diagnostic keywords
        search_query = ' OR '.join(config.DIAGNOSTIC_KEYWORDS[:5])  # Top 5 keywords
        pyautogui.write(search_query, interval=0.02)
        pyautogui.press('enter')
        time.sleep(5)  # Wait for search results

        # Switch to Details view
        pyautogui.hotkey('ctrl', 'shift', '6')
        time.sleep(1)

        # Sort by Date Modified
        pyautogui.click(x=700, y=150)  # Approximate location of Date Modified column
        pyautogui.click(x=700, y=150)  # Click twice for descending order
        time.sleep(1)

        # Select all search results
        pyautogui.hotkey('ctrl', 'a')
        time.sleep(1)

        # Copy file paths (we'll process this later)
        pyautogui.hotkey('ctrl', 'c')
        time.sleep(2)

        self.search_stats['locations_searched'] += 1

        # Close File Explorer window
        pyautogui.hotkey('ctrl', 'w')
        time.sleep(config.TIMING['click_delay'])

    def _is_diagnostic_file(self, filename: str) -> bool:
        """
        Determine if a file is likely diagnostic data
        """
        filename_lower = filename.lower()

        # Check file extension
        ext = Path(filename).suffix.lower()
        if ext in ['.pdf', '.db', '.xml', '.json', '.csv', '.mdb', '.sqlite']:
            # Check for diagnostic keywords in filename
            return any(keyword in filename_lower for keyword in config.DIAGNOSTIC_KEYWORDS)

        return False

    def _get_file_age_days(self, modified_date: datetime) -> int:
        """
        Calculate file age in days
        """
        return (datetime.now() - modified_date).days


class PowerShellFileDiscovery:
    """
    Alternative approach: Use PowerShell to search for files
    More reliable than GUI automation
    """

    def __init__(self):
        self.temp_results_file = config.TEMP_DIR / "file_search_results.txt"

    def discover_files(self) -> List[str]:
        """
        Use PowerShell to search for diagnostic files
        """
        print("🔍 Using PowerShell for file discovery...")

        # Build PowerShell search command
        ps_command = self._build_search_command()

        # Execute via Run dialog
        self._execute_powershell(ps_command)

        # Wait for results
        time.sleep(10)

        # Download results file
        return self._read_results()

    def _build_search_command(self) -> str:
        """
        Build PowerShell command to find diagnostic files
        """
        # Search paths
        paths = [
            r"'C:\Program Files\Snap-on'",
            r"'C:\Snap-on'",
            r"'C:\Autel'",
            r"'C:\Launch'",
            r"'C:\Bosch'",
            r"'C:\Users\Public\Documents'",
        ]

        # File patterns
        patterns = "*.pdf", "*.db", "*.xml", "*.json", "*.csv"

        # Build search command
        search_paths = " , ".join(paths)

        command = f"""
        $paths = @({search_paths})
        $patterns = @('*.pdf','*.db','*.xml','*.json','*.csv','*.mdb','*.sqlite')
        $results = @()

        foreach ($path in $paths) {{
            if (Test-Path $path) {{
                foreach ($pattern in $patterns) {{
                    $files = Get-ChildItem -Path $path -Filter $pattern -Recurse -ErrorAction SilentlyContinue |
                             Where-Object {{ $_.LastWriteTime -gt (Get-Date).AddDays(-365) }} |
                             Select-Object FullName, Length, LastWriteTime
                    $results += $files
                }}
            }}
        }}

        $results | Sort-Object LastWriteTime -Descending |
                   Select-Object -First 500 |
                   Export-Csv -Path '{str(self.temp_results_file).replace(chr(92), chr(92)*2)}' -NoTypeInformation
        """

        return command.strip()

    def _execute_powershell(self, command: str):
        """
        Execute PowerShell command on remote machine
        """
        # Open PowerShell
        pyautogui.hotkey('win', 'r')
        time.sleep(config.TIMING['window_load'])
        pyautogui.write('powershell', interval=0.02)
        pyautogui.press('enter')
        time.sleep(config.TIMING['app_launch'])

        # Type command (for long commands, we'd save to file first)
        # For now, simplified version
        simple_command = """
        Get-ChildItem -Path 'C:\\Snap-on','C:\\Autel','C:\\Launch','C:\\Bosch' -Include *.pdf,*.db,*.xml,*.json -Recurse -ErrorAction SilentlyContinue |
        Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-365)} |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 100 FullName,Length,LastWriteTime |
        Export-Csv -Path 'C:\\Temp\\diagnostic_files.csv' -NoTypeInformation
        """

        pyautogui.write(simple_command.replace('\n', ' '), interval=0.01)
        pyautogui.press('enter')

        # Wait for execution
        time.sleep(15)

        # Close PowerShell
        pyautogui.write('exit')
        pyautogui.press('enter')

    def _read_results(self) -> List[str]:
        """
        Read the results CSV from remote machine
        """
        # Navigate to results file and copy it
        results_path = r"C:\Temp\diagnostic_files.csv"

        pyautogui.hotkey('win', 'e')
        time.sleep(config.TIMING['window_load'])

        pyautogui.hotkey('ctrl', 'l')
        pyautogui.write(results_path, interval=0.02)
        pyautogui.press('enter')
        time.sleep(2)

        # Copy the file
        pyautogui.hotkey('ctrl', 'c')
        time.sleep(1)

        return []  # Will process CSV later


if __name__ == "__main__":
    # Test the discovery system
    discoverer = PowerShellFileDiscovery()
    files = discoverer.discover_files()
    print(f"Found {len(files)} files")
