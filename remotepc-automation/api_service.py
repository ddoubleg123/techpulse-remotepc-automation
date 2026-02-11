"""
API Service for RemotePC Automation
Flask API that handles sync requests from TechPulse mobile app
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from redis import Redis
from rq import Queue
from rq.job import Job
import os
from pathlib import Path
from dotenv import load_dotenv

import config
from worker import sync_mechanic_data

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for mobile app

# Initialize Redis and RQ
redis_conn = Redis(
    host=config.REDIS_HOST,
    port=config.REDIS_PORT,
    db=config.REDIS_DB
)
sync_queue = Queue('sync', connection=redis_conn)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'RemotePC Automation API',
        'version': '1.0.0'
    })


@app.route('/api/sync/request', methods=['POST'])
def request_sync():
    """
    Request a data sync from mechanic's computer

    Request body:
    {
        "mechanic_id": "unique_mechanic_id",
        "personal_key": "123456"
    }

    Response:
    {
        "job_id": "uuid",
        "status": "queued",
        "message": "Your files are being organized..."
    }
    """
    try:
        data = request.get_json()

        # Validate request
        mechanic_id = data.get('mechanic_id')
        personal_key = data.get('personal_key')

        if not mechanic_id:
            return jsonify({'error': 'mechanic_id is required'}), 400

        if not personal_key:
            return jsonify({'error': 'personal_key is required'}), 400

        # Validate personal key format (6 digits)
        if not personal_key.isdigit() or len(personal_key) != 6:
            return jsonify({'error': 'personal_key must be exactly 6 digits'}), 400

        # Queue the sync job
        job = sync_queue.enqueue(
            sync_mechanic_data,
            mechanic_id=mechanic_id,
            personal_key=personal_key,
            job_timeout='30m',  # 30 minute timeout
            result_ttl=3600,    # Keep result for 1 hour
            failure_ttl=3600    # Keep failure info for 1 hour
        )

        # Initialize job metadata
        job.meta = {
            'mechanic_id': mechanic_id,
            'progress': 0,
            'message': 'Waiting to start...',
            'files_found': 0,
            'status': 'queued'
        }
        job.save_meta()

        return jsonify({
            'job_id': job.id,
            'status': 'queued',
            'message': 'Your files are being organized. This may take a few minutes...'
        }), 202

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/sync/status/<job_id>', methods=['GET'])
def get_sync_status(job_id):
    """
    Get status of a sync job

    Response:
    {
        "status": "queued|started|finished|failed",
        "progress": 0-100,
        "message": "Current status message",
        "files_found": 123,
        "result": {...}  // Only present when finished
    }
    """
    try:
        job = Job.fetch(job_id, connection=redis_conn)

        response = {
            'job_id': job.id,
            'status': job.get_status(),
            'progress': job.meta.get('progress', 0),
            'message': job.meta.get('message', ''),
            'files_found': job.meta.get('files_found', 0)
        }

        # If job is finished, include result
        if job.is_finished:
            response['result'] = job.result

        # If job failed, include error
        if job.is_failed:
            response['error'] = str(job.exc_info)

        return jsonify(response)

    except Exception as e:
        return jsonify({
            'status': 'not_found',
            'error': str(e)
        }), 404


@app.route('/api/sync/cancel/<job_id>', methods=['POST'])
def cancel_sync(job_id):
    """
    Cancel a running sync job
    """
    try:
        job = Job.fetch(job_id, connection=redis_conn)

        if job.is_started or job.is_queued:
            job.cancel()
            return jsonify({
                'status': 'cancelled',
                'message': 'Sync job cancelled successfully'
            })
        else:
            return jsonify({
                'status': job.get_status(),
                'message': f'Job cannot be cancelled (current status: {job.get_status()})'
            }), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 404


@app.route('/api/sync/history/<mechanic_id>', methods=['GET'])
def get_sync_history(mechanic_id):
    """
    Get sync history for a mechanic

    Query params:
    - limit: number of jobs to return (default: 10)
    """
    try:
        limit = int(request.args.get('limit', 10))

        # Get all jobs from queue
        all_jobs = sync_queue.get_jobs()

        # Filter by mechanic_id
        mechanic_jobs = [
            {
                'job_id': job.id,
                'status': job.get_status(),
                'created_at': job.created_at.isoformat() if job.created_at else None,
                'ended_at': job.ended_at.isoformat() if job.ended_at else None,
                'progress': job.meta.get('progress', 0),
                'message': job.meta.get('message', ''),
                'files_found': job.meta.get('files_found', 0)
            }
            for job in all_jobs
            if job.meta.get('mechanic_id') == mechanic_id
        ]

        # Sort by created_at (most recent first)
        mechanic_jobs.sort(key=lambda x: x['created_at'] or '', reverse=True)

        # Limit results
        mechanic_jobs = mechanic_jobs[:limit]

        return jsonify({
            'mechanic_id': mechanic_id,
            'total_syncs': len(mechanic_jobs),
            'syncs': mechanic_jobs
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/queue/stats', methods=['GET'])
def get_queue_stats():
    """
    Get queue statistics (for admin/monitoring)
    """
    try:
        stats = {
            'queued': sync_queue.count,
            'started': len(sync_queue.started_job_registry),
            'finished': len(sync_queue.finished_job_registry),
            'failed': len(sync_queue.failed_job_registry),
        }

        return jsonify(stats)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'

    print(f"""
    ==============================================
       RemotePC Automation API Server

       Port: {port}
       Debug: {debug}

       Endpoints:
       POST /api/sync/request
       GET  /api/sync/status/<job_id>
       POST /api/sync/cancel/<job_id>
       GET  /api/sync/history/<mechanic_id>
       GET  /api/queue/stats
       GET  /health
    ==============================================
    """)

    app.run(host='0.0.0.0', port=port, debug=debug)
