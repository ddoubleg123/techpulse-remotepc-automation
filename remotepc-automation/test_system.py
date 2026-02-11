"""
Test script for RemotePC automation system
Run this to verify everything is working
"""
import sys
import time
import requests
from pathlib import Path

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def test_imports():
    """Test that all required packages are installed"""
    print_header("Testing Python Imports")

    try:
        import pyautogui
        print("✅ pyautogui")
    except ImportError:
        print("❌ pyautogui - Run: pip install pyautogui")
        return False

    try:
        import cv2
        print("✅ opencv-python")
    except ImportError:
        print("❌ opencv-python - Run: pip install opencv-python")
        return False

    try:
        import redis
        print("✅ redis")
    except ImportError:
        print("❌ redis - Run: pip install redis")
        return False

    try:
        import rq
        print("✅ rq")
    except ImportError:
        print("❌ rq - Run: pip install rq")
        return False

    try:
        import PyPDF2
        print("✅ PyPDF2")
    except ImportError:
        print("❌ PyPDF2 - Run: pip install PyPDF2")
        return False

    try:
        import pandas
        print("✅ pandas")
    except ImportError:
        print("❌ pandas - Run: pip install pandas")
        return False

    try:
        import flask
        print("✅ flask")
    except ImportError:
        print("❌ flask - Run: pip install flask flask-cors")
        return False

    print("\n✅ All imports successful!")
    return True

def test_redis():
    """Test Redis connection"""
    print_header("Testing Redis Connection")

    try:
        from redis import Redis
        import config

        redis_conn = Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            db=config.REDIS_DB
        )

        # Test ping
        if redis_conn.ping():
            print(f"✅ Connected to Redis at {config.REDIS_HOST}:{config.REDIS_PORT}")

            # Test write/read
            redis_conn.set('test_key', 'test_value')
            value = redis_conn.get('test_key')

            if value == b'test_value':
                print("✅ Redis read/write working")
                redis_conn.delete('test_key')
                return True

        return False

    except Exception as e:
        print(f"❌ Redis connection failed: {str(e)}")
        print("\nMake sure Redis is running:")
        print("  - Windows: redis-server")
        print("  - Docker: docker run -d -p 6379:6379 redis")
        return False

def test_file_parser():
    """Test file parser with sample data"""
    print_header("Testing File Parser")

    try:
        from file_parser import DiagnosticFileParser

        parser = DiagnosticFileParser()

        # Test text extraction
        sample_text = """
        VIN: 1HGBH41JXMN109186
        Year: 2021
        Make: Honda
        Model: Civic

        Diagnostic Trouble Codes:
        P0420 - Catalyst System Efficiency Below Threshold
        P0301 - Cylinder 1 Misfire Detected
        P0171 - System Too Lean (Bank 1)
        """

        result = parser._extract_from_text(sample_text)

        if result:
            print(f"✅ Extracted VIN: {result['vin']}")
            print(f"✅ Found {len(result['dtc_codes'])} DTCs:")
            for dtc in result['dtc_codes']:
                print(f"   • {dtc['code']}: {dtc['description']}")

            if result['vehicle_info'].get('year'):
                print(f"✅ Vehicle: {result['vehicle_info'].get('year')} "
                      f"{result['vehicle_info'].get('make')} "
                      f"{result['vehicle_info'].get('model')}")

            return True
        else:
            print("❌ Parser returned no data")
            return False

    except Exception as e:
        print(f"❌ Parser test failed: {str(e)}")
        return False

def test_api_server():
    """Test API server (if running)"""
    print_header("Testing API Server")

    try:
        response = requests.get('http://localhost:5000/health', timeout=2)

        if response.status_code == 200:
            data = response.json()
            print(f"✅ API server is running")
            print(f"   Service: {data.get('service')}")
            print(f"   Version: {data.get('version')}")
            return True
        else:
            print(f"❌ API server returned status {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print("⚠️  API server not running")
        print("   Start with: python api_service.py")
        return False
    except Exception as e:
        print(f"❌ API test failed: {str(e)}")
        return False

def test_queue():
    """Test RQ queue setup"""
    print_header("Testing RQ Queue")

    try:
        from redis import Redis
        from rq import Queue
        import config

        redis_conn = Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            db=config.REDIS_DB
        )

        test_queue = Queue('test', connection=redis_conn)

        # Queue a simple job
        def test_job():
            return "Hello from worker!"

        job = test_queue.enqueue(test_job)

        print(f"✅ Queued test job: {job.id}")
        print("⚠️  Note: Worker must be running to process jobs")
        print("   Start worker with: rq worker sync")

        return True

    except Exception as e:
        print(f"❌ Queue test failed: {str(e)}")
        return False

def test_directories():
    """Test required directories exist"""
    print_header("Testing Directory Structure")

    try:
        import config

        dirs = [
            config.TEMP_DIR,
            config.DOWNLOADS_DIR,
            config.SCREENSHOTS_DIR,
            config.ASSETS_DIR
        ]

        for directory in dirs:
            if directory.exists():
                print(f"✅ {directory.name}/")
            else:
                print(f"⚠️  Creating {directory.name}/")
                directory.mkdir(parents=True, exist_ok=True)

        return True

    except Exception as e:
        print(f"❌ Directory test failed: {str(e)}")
        return False

def run_all_tests():
    """Run all tests"""
    print("""
    ==============================================================
            RemotePC Automation System - Test Suite
    ==============================================================
    """)

    tests = [
        ("Imports", test_imports),
        ("Directories", test_directories),
        ("Redis", test_redis),
        ("File Parser", test_file_parser),
        ("RQ Queue", test_queue),
        ("API Server", test_api_server),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ {test_name} test crashed: {str(e)}")
            results.append((test_name, False))

    # Summary
    print_header("Test Summary")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}  {test_name}")

    print(f"\n{passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! System is ready to use.")
        print("\nNext steps:")
        print("  1. Start API server: python api_service.py")
        print("  2. Start worker: rq worker sync")
        print("  3. Send test request from mobile app")
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    run_all_tests()
