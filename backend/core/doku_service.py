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

    def _generate_signature(self, request_id: str, request_timestamp: str, target_path: str, digest: str) -> str:
        # 2. Prepare String to Sign
        # Note: No spaces after colons, each field on a new line
        components = [
            f"Client-Id:{self.client_id}",
            f"Request-Id:{request_id}",
            f"Request-Timestamp:{request_timestamp}",
            f"Request-Target:{target_path}",
            f"Digest:{digest}"
        ]
        string_to_sign = "\n".join(components)

        # 3. Generate HMAC-SHA256 signature
        signature_hmac = hmac.new(
            self.secret_key.encode('utf-8'),
            string_to_sign.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        signature_base64 = base64.b64encode(signature_hmac).decode('utf-8')
        
        # Enhanced Logging (Masked)
        logger.debug(f"--- DOKU Signature Debug ---")
        logger.debug(f"Target Path: {target_path}")
        logger.debug(f"Digest: {digest}")
        # Log string to sign but replace actual credentials for security
        masked_string = string_to_sign.replace(self.client_id, "CLIENT_ID_MASKED")
        logger.debug(f"String to Sign:\n{masked_string}")
        
        return f"HMACSHA256={signature_base64}"

    def create_transaction(self, order_id: str, amount: int, item_details: list, customer_details: dict, callback_url: str = None) -> dict:
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
        
        # Mapping item_details to DOKU expectations
        line_items = []
        for item in item_details:
            line_items.append({
                "name": item.get("name", "Item")[:50],
                "price": int(item.get("price", 0)),
                "quantity": int(item.get("quantity", 1))
            })

        payload = {
            "order": {
                "invoice_number": order_id,
                "amount": int(amount),
                "line_items": line_items,
                "callback_url": callback_url or f"{settings.FRONTEND_URL}/payment/success", 
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

        # 1. Generate Digest from Minified JSON
        # CRITICAL: We serialize ONCE to ensure consistency between Digest and Payload
        json_body = json.dumps(payload, separators=(',', ':'))
        body_bytes = json_body.encode('utf-8')
        digest_bytes = hashlib.sha256(body_bytes).digest()
        digest = base64.b64encode(digest_bytes).decode('utf-8')

        signature = self._generate_signature(request_id, request_timestamp, target_path, digest)

        headers = {
            "Client-Id": self.client_id,
            "Request-Id": request_id,
            "Request-Timestamp": request_timestamp,
            "Signature": signature,
            "Digest": digest,  # MANDATORY header for body payload
            "Content-Type": "application/json"
        }

        # Use 'data' instead of 'json' to send the exact string we digested
        response = requests.post(url, data=json_body, headers=headers)
        
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
        Verify incoming Notification/Webhook from DOKU.
        Uses Case-Insensitive header lookup for robustness behind proxies.
        """
        # Normalize header keys to lowercase for robust lookup
        h = {k.lower(): v for k, v in headers.items()}
        
        client_id_received = h.get("client-id")
        request_id = h.get("request-id")
        request_timestamp = h.get("request-timestamp")
        signature_received = h.get("signature")
        target_path = h.get("request-target", "/api/v1/transactions/webhook") 

        if not all([client_id_received, request_id, request_timestamp, signature_received]):
            logger.error(f"DOKU Webhook Missing Headers: {list(h.keys())}")
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
            logger.error("DOKU Signature Mismatch!")
            logger.debug(f"Calculated StringToSign:\n{string_to_sign}")
            logger.debug(f"Received Signature: {signature_received}")
            logger.debug(f"Calculated Signature: {signature_calculated}")
            raise ValueError("Signature mismatch")
            
        try:
            body_json = json.loads(body_bytes.decode('utf-8'))
        except json.JSONDecodeError:
            logger.error("DOKU Webhook body is not valid JSON")
            raise ValueError("Invalid JSON body")
        
        transaction_status = body_json.get("transaction", {}).get("status")
        if not transaction_status:
             transaction_status = body_json.get("payment", {}).get("status")

        return {
            "order_id": body_json.get("order", {}).get("invoice_number"),
            "transaction_status": transaction_status,
            "raw_body": body_json
        }

doku_service = DokuService()
