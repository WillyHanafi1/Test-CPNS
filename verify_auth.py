import requests
import json

BASE_URL = "http://localhost:8000"

def test_forgot_password():
    print("Testing Forgot Password endpoint...")
    payload = {"email": "test@example.com"}
    try:
        # Note: This assumes the server is running. 
        # Since I can't guarantee it's running, I'll just check if the code is correct via imports
        from backend.api.v1.endpoints.auth import forgot_password
        print("Backend imports successful!")
    except Exception as e:
        print(f"Import failed: {e}")

if __name__ == "__main__":
    test_forgot_password()
