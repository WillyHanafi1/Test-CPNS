import requests
import json
import hashlib
import hmac
import base64
from datetime import datetime
import os

# Configuration (Matches .env Sandbox)
CLIENT_ID = "BRN-0244-1776333809484"
SECRET_KEY = "SK-vgQbMt9eb1luPsYl5iHK"
WEBHOOK_URL = "http://localhost:8001/api/v1/transactions/webhook"

def simulate_webhook(order_id: str, status: str = "SUCCESS"):
    print(f"🚀 Simulating DOKU Webhook for Order: {order_id} (Status: {status})")
    
    # 1. Create Body
    body = {
        "order": {
            "invoice_number": order_id,
            "amount": 50000
        },
        "transaction": {
            "status": status,
            "date": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        }
    }
    body_str = json.dumps(body, separators=(',', ':'))
    
    # 2. Generate Digest
    digest_bytes = hashlib.sha256(body_str.encode('utf-8')).digest()
    digest = base64.b64encode(digest_bytes).decode('utf-8')
    
    # 3. Headers
    request_id = "REQ-" + hashlib.md5(order_id.encode()).hexdigest()[:8]
    timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    target_path = "/api/v1/transactions/webhook"
    
    # 4. Generate Signature
    string_to_sign = (
        f"Client-Id:{CLIENT_ID}\n"
        f"Request-Id:{request_id}\n"
        f"Request-Timestamp:{timestamp}\n"
        f"Request-Target:{target_path}\n"
        f"Digest:{digest}"
    )
    
    signature_hmac = hmac.new(
        SECRET_KEY.encode('utf-8'),
        string_to_sign.encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    signature = f"HMACSHA256={base64.b64encode(signature_hmac).decode('utf-8')}"
    
    headers = {
        "Content-Type": "application/json",
        "Client-Id": CLIENT_ID,
        "Request-Id": request_id,
        "Request-Timestamp": timestamp,
        "Request-Target": target_path,
        "Signature": signature
    }
    
    # 5. Send Request
    try:
        response = requests.post(WEBHOOK_URL, data=body_str, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("\n✅ SUCCESS: Webhook processed. Check your Hall of Fame now!")
        else:
            print("\n❌ FAILED: Webhook rejected by server.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    oid = input("Enter Order ID (e.g., DON-xxxx or PRO-xxxx): ")
    if oid:
        simulate_webhook(oid)
    else:
        print("Order ID is required.")
