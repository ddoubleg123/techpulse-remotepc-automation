"""
Background worker for processing RemotePC sync jobs
Uses RQ (Redis Queue) for job management
"""
import os
import time
import json
from pathlib import Path
from datetime import datetime
from rq import get_current_job
from rq.job import Job

from remotepc_connector import RemotePCConnector, RemotePCFileTransfer
from file_discovery import PowerShellFileDiscovery
from file_parser import DiagnosticFileParser
import config


class SyncWorker:
    """
    Worker that processes file sync requests
    """

    def __init__(self, job_id: str):
        self.job_id = job_id
        self.job = get_current_job()
        self.connector = RemotePCConnector()
        self.file_transfer = RemotePCFileTransfer()
        self.file_parser = DiagnosticFileParser()

    def process_sync_request(self, mechanic_id: str, personal_key: str) -> dict:
        """
        Main sync workflow

        Args:
            mechanic_id: Unique ID of mechanic
            personal_key: 6-digit RemotePC access code

        Returns:
            dict with sync results
        """
        try:
            # Phase 1: Connect
            self._update_progress(5, "Connecting to your computer...")
            if not self.connector.connect(personal_key):
                raise Exception("Failed to connect via RemotePC")

            # Phase 2: Discover files
            self._update_progress(20, "Searching for diagnostic files...")
            discovered_files = self._discover_files()

            self._update_progress(40, f"Found {len(discovered_files)} files. Downloading...")

            # Phase 3: Download files
            staging_dir = config.DOWNLOADS_DIR / mechanic_id / self.job_id
            staging_dir.mkdir(parents=True, exist_ok=True)

            downloaded_count = self.file_transfer.download_files(
                discovered_files,
                staging_dir
            )

            self._update_progress(60, "Processing diagnostic data...")

            # Phase 4: Parse files
            parsed_data = self._parse_files(staging_dir)

            self._update_progress(80, "Uploading to TechPulse...")

            # Phase 5: Upload to database
            uploaded_count = self._upload_to_database(mechanic_id, parsed_data)

            # Phase 6: Cleanup
            self._update_progress(95, "Cleaning up...")
            self.connector.disconnect()

            self._update_progress(100, "Sync complete!")

            return {
                'status': 'success',
                'files_discovered': len(discovered_files),
                'files_downloaded': downloaded_count,
                'files_processed': len(parsed_data),
                'vehicles_imported': uploaded_count
            }

        except Exception as e:
            self._update_progress(0, f"Error: {str(e)}")
            self.connector.disconnect()
            raise

    def _discover_files(self) -> list:
        """
        Discover diagnostic files on remote machine
        """
        discoverer = PowerShellFileDiscovery()
        files = discoverer.discover_files()
        return files

    def _parse_files(self, directory: Path) -> list:
        """
        Parse downloaded diagnostic files
        Extract vehicle info, DTCs, etc.
        """
        parsed_data = []

        for file_path in directory.glob('*'):
            try:
                data = self.file_parser.parse(file_path)
                if data:
                    parsed_data.append(data)
            except Exception as e:
                print(f"Failed to parse {file_path}: {str(e)}")

        return parsed_data

    def _upload_to_database(self, mechanic_id: str, parsed_data: list) -> int:
        """
        Upload parsed diagnostic data to TechPulse database
        """
        # This will call your backend API
        import requests

        api_url = os.getenv('TECHPULSE_API_URL', 'http://localhost:3000')
        uploaded = 0

        for vehicle_data in parsed_data:
            try:
                response = requests.post(
                    f"{api_url}/api/mechanic/{mechanic_id}/vehicles/import",
                    json=vehicle_data,
                    headers={'Content-Type': 'application/json'}
                )

                if response.status_code == 200:
                    uploaded += 1

            except Exception as e:
                print(f"Failed to upload vehicle data: {str(e)}")

        return uploaded

    def _update_progress(self, progress: int, message: str):
        """
        Update job progress for real-time status updates
        """
        if self.job:
            self.job.meta['progress'] = progress
            self.job.meta['message'] = message
            self.job.meta['updated_at'] = datetime.now().isoformat()
            self.job.save_meta()

        print(f"[{progress}%] {message}")


# RQ Job Functions (must be at module level)

def sync_mechanic_data(mechanic_id: str, personal_key: str, job_id: str = None):
    """
    Main entry point for sync job
    Called by RQ worker

    Args:
        mechanic_id: Mechanic's user ID
        personal_key: 6-digit RemotePC code
        job_id: Optional job ID

    Returns:
        dict with sync results
    """
    if not job_id:
        job = get_current_job()
        job_id = job.id if job else "manual"

    worker = SyncWorker(job_id)
    result = worker.process_sync_request(mechanic_id, personal_key)

    return result


if __name__ == "__main__":
    # Test worker locally
    test_result = sync_mechanic_data(
        mechanic_id="test_mechanic_123",
        personal_key="123456"
    )
    print(json.dumps(test_result, indent=2))
