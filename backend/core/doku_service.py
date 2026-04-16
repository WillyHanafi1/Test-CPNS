import uuid
import json
import base64
import hashlib
import hmac
import logging
import requests
from datetime import datetime, timezone
from backend.config import settings

logger = logging.getLogger(__name__)

class DokuService:
    def __init__(self):
        self.client_id = settings.DOKU_CLIENT_ID
        self.secret_key = settings.DOKU_SECRET_KEY
        self.is_production = settings.DOKU_ENVIRONMENT.lower() == "production"
        
        # Base URL for Jokul Checkout
        if self.is_production:
            self.base_url = "https://api.doku.com"
        else:
            self.base_url = "https://api-sandbox.doku.com"

    def _generate_signature(self, request_id: str, request_timestamp: str, target_path: str, body_json: dict) -> str:
        # 1. Generate Digest from Body (Base64 of SHA256 of minified JSON)
        # Note: If body is empty, do we need digest? Checkout API always has a body.
        body_bytes = json.dumps(body_json, separators=(',', ':')).encode('utf-8')
        digest_bytes = hashlib.sha256(body_bytes).digest()
        digest = base64.b64encode(digest_bytes).decode('utf-8')

        # 2. Prepare String to Sign
        string_to_sign = (
            f"Client-Id:{self.client_id}\n"
            f"Request-Id:{request_id}\n"
            f"Request-Timestamp:{request_timestamp}\n"
            f"Request-Target:{target_path}\n"
            f"Digest:{digest}"
        )

        # 3. Generate HMAC-SHA256 signature
        signature_hmac = hmac.new(
            self.secret_key.encode('utf-8'),
            string_to_sign.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        signature_base64 = base64.b64encode(signature_hmac).decode('utf-8')
        return f"HMACSHA256={signature_base64}"

    def create_transaction(self, order_id: str, amount: int, item_details: list, customer_details: dict) -> dict:
        """
        Creates a DOKU Checkout Payment Link.
        Returns:
            dict containing 'token' and 'redirect_url'
        """
        target_path = "/checkout/v1/payment"
        url = self.base_url + target_path
        
        request_id = str(uuid.uuid4())
        # Format UTC to ISO8601 YYYY-MM-DDTHH:MM:SSZ
        request_timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Mapping item_details to DOKU expectations if necessary. 
        # But let's just supply the basic structure for Jokul Checkout
        line_items = []
        for item in item_details:
            line_items.append({
                "name": item.get("name", "Item")[:50],
                "price": item.get("price", 0),
                "quantity": item.get("quantity", 1)
            })
            
        # Amount object
        payment_amount = {
            "value": amount,
            "currency": "IDR"
            # In Jokul Checkout, amount must be integer if currency is IDR, 
            # Or some docs say number. Doku requires it to be numbers.
        }

        payload = {
            "order": {
                "invoice_number": order_id,
                "amount": amount,
                "line_items": line_items,
                "callback_url": "https://yourapp.domain/payment/success", 
                # ^ In a real app, this should be taken from settings or frontend base URL
            },
            "payment": {
                "payment_due_date": 60 # 60 minutes
            },
            "customer": {
                "id": customer_details.get("email", "unknown_user"),
                "name": customer_details.get("first_name", "Customer"),
                "email": customer_details.get("email", "")
            }
        }

        signature = self._generate_signature(request_id, request_timestamp, target_path, payload)

        headers = {
            "Client-Id": self.client_id,
            "Request-Id": request_id,
            "Request-Timestamp": request_timestamp,
            "Signature": signature,
            "Content-Type": "application/json"
        }

        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code >= 400:
            logger.error(f"DOKU Checkout failed: {response.text}")
            raise Exception(f"DOKU API Error: {response.status_code} - {response.text}")
            
        data = response.json()
        
        redirect_url = data.get("response", {}).get("payment", {}).get("url")
        if not redirect_url:
            raise Exception("No payment URL returned from DOKU")
            
        return {
            "token": data.get("response", {}).get("payment", {}).get("id", ""),
            "redirect_url": redirect_url
        }

    def verify_notification(self, headers: dict, body_bytes: bytes) -> dict:
        """
        Verify incoming Notification/Webhook from DOKU
        """
        client_id_received = headers.get("Client-Id")
        request_id = headers.get("Request-Id")
        request_timestamp = headers.get("Request-Timestamp")
        signature_received = headers.get("Signature")
        
        target_path = headers.get("Request-Target", "/api/v1/transactions/webhook") 
        # Usually we just take it from the original path where we host it

        if not all([client_id_received, request_id, request_timestamp, signature_received]):
            raise ValueError("Missing required DOKU headers")
            
        # 1. Generate Digest
        digest_bytes = hashlib.sha256(body_bytes).digest()
        digest = base64.b64encode(digest_bytes).decode('utf-8')
        
        # 2. String to sign
        string_to_sign = (
            f"Client-Id:{self.client_id}\n"
            f"Request-Id:{request_id}\n"
            f"Request-Timestamp:{request_timestamp}\n"
            f"Request-Target:{target_path}\n"
            f"Digest:{digest}"
        )
        
        # 3. HMAC SHA256 Signature calculate
        signature_hmac = hmac.new(
            self.secret_key.encode('utf-8'),
            string_to_sign.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        signature_calculated = f"HMACSHA256={base64.b64encode(signature_hmac).decode('utf-8')}"
        
        if signature_received != signature_calculated:
            # Note: For testing sometimes domains or target_paths differ. 
            # In some frameworks (FastAPI) Request-Target header might not be sent by Doku, 
            # Doku expects us to use the actual URI path it hit.
            raise ValueError("Signature mismatch")
            
        body_json = json.loads(body_bytes.decode('utf-8'))
        
        return {
            # Webhook payload typically has an "order" object
            "order_id": body_json.get("order", {}).get("invoice_number"),
            "transaction_status": body_json.get("transaction", {}).get("status", "").lower()
        }

doku_service = DokuService()
