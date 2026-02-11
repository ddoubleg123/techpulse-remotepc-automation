"""
Mock worker for Render deployment
This simulates the sync process for testing without requiring RemotePC

For production, the real worker with RemotePC automation would run on:
- A Windows server with RemotePC installed
- Or your local development machine
"""
import time
import random
from rq import get_current_job
from datetime import datetime


def sync_mechanic_data(mechanic_id: str, personal_key: str, job_id: str = None):
    """
    Mock sync worker that simulates the file sync process

    For production: Replace this with the real worker.py that has RemotePC automation
    """
    if not job_id:
        job = get_current_job()
        job_id = job.id if job else "manual"
    else:
        job = get_current_job()

    def update_progress(progress: int, message: str):
        if job:
            job.meta['progress'] = progress
            job.meta['message'] = message
            job.meta['updated_at'] = datetime.now().isoformat()
            job.save_meta()
        print(f"[{progress}%] {message}")

    try:
        # Simulate connection
        update_progress(5, "Connecting to your computer...")
        time.sleep(2)

        # Simulate file discovery
        update_progress(20, "Searching for diagnostic files...")
        time.sleep(3)

        # Simulate finding files
        files_found = random.randint(50, 150)
        if job:
            job.meta['files_found'] = files_found
            job.save_meta()

        update_progress(40, f"Found {files_found} files. Downloading...")
        time.sleep(4)

        # Simulate processing
        update_progress(60, "Processing diagnostic data...")
        time.sleep(3)

        # Simulate upload
        vehicles_imported = random.randint(20, 60)
        update_progress(80, "Uploading to TechPulse...")
        time.sleep(2)

        # Simulate cleanup
        update_progress(95, "Cleaning up...")
        time.sleep(1)

        update_progress(100, "Sync complete!")

        return {
            'status': 'success',
            'files_discovered': files_found,
            'files_downloaded': files_found,
            'files_processed': int(files_found * 0.7),
            'vehicles_imported': vehicles_imported,
            'note': 'MOCK DATA - Replace with real worker for production'
        }

    except Exception as e:
        update_progress(0, f"Error: {str(e)}")
        raise


if __name__ == "__main__":
    # Test the mock worker
    result = sync_mechanic_data(
        mechanic_id="test_mechanic",
        personal_key="123456"
    )
    print(f"\nResult: {result}")
