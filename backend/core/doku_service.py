"""DOKU Checkout Non-SNAP, shared with the We Finally Found Us merchant."""
import base64
import hashlib
import hmac
import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

import requests
from backend.config import DOKU_SUPPORTED_METHODS, settings

NOTIFICATION_PATH = "/api/payments/doku/notifications"
LEGACY_NOTIFICATION_PATH = "/api/v1/transactions/webhook"
PAYMENT_METHODS = DOKU_SUPPORTED_METHODS


class DokuError(ValueError):
    """A safe error code; never includes provider response bodies or credentials."""


def same_value(received: str, expected: str) -> bool:
    return hmac.compare_digest(received.encode('utf-8'), expected.encode('utf-8'))


def exact_amount(value) -> int:
    text = str(value)
    if not re.fullmatch(r"[0-9]{1,12}(?:\.0{1,2})?", text):
        raise DokuError("DOKU_AMOUNT_INVALID")
    amount = int(text.split('.')[0])
    if amount <= 0:
        raise DokuError("DOKU_AMOUNT_INVALID")
    return amount


def payment_status(payload: dict) -> str:
    status = str(payload.get("transaction", {}).get("status") or payload.get("payment", {}).get("status", "")).upper()
    order_status = str(payload.get("order", {}).get("status", "")).upper()
    if status == "SUCCESS":
        return "success"
    if status == "EXPIRED" or order_status in {"ORDER_EXPIRED", "ORDER_CANCELLED", "ORDER_CANCELED"}:
        return "failed"
    return "pending"  # A failed channel attempt can still be retried in Checkout.


def callback_for_order(order_id: str, callback_url: str | None = None) -> str:
    target = urlsplit(callback_url or f"{settings.FRONTEND_URL.rstrip('/')}/payment/success")
    allowed = urlsplit(settings.FRONTEND_URL)
    if (target.scheme, target.netloc) != (allowed.scheme, allowed.netloc) or target.username or target.password:
        raise DokuError("DOKU_CALLBACK_INVALID")
    if target.path != "/payment/success" or target.fragment:
        raise DokuError("DOKU_CALLBACK_INVALID")
    query = dict(parse_qsl(target.query))
    query['order_id'] = order_id
    return urlunsplit(target._replace(query=urlencode(query)))


class DokuService:
    def __init__(self):
        self.client_id = settings.DOKU_CLIENT_ID
        self.secret_key = settings.DOKU_SECRET_KEY
        self.is_production = settings.DOKU_ENVIRONMENT == "production"
        self.base_url = "https://api.doku.com" if self.is_production else "https://api-sandbox.doku.com"

    def _generate_signature(self, request_id, timestamp, target_path, digest=None, *, response=False):
        components = [f"Client-Id:{self.client_id}", f"Request-Id:{request_id}",
                      f"{'Response' if response else 'Request'}-Timestamp:{timestamp}",
                      f"Request-Target:{target_path}"]
        if digest is not None:
            components.append(f"Digest:{digest}")
        signature = hmac.new(self.secret_key.encode(), '\n'.join(components).encode(), hashlib.sha256).digest()
        return "HMACSHA256=" + base64.b64encode(signature).decode()

    @staticmethod
    def _digest(body: bytes) -> str:
        return base64.b64encode(hashlib.sha256(body).digest()).decode()

    def build_checkout_body(self, order_id, amount, item_details, customer_details, callback_url=None):
        methods = settings.doku_payment_methods
        if not settings.doku_checkout_available or not set(methods) <= PAYMENT_METHODS:
            raise DokuError("DOKU_NOT_CONFIGURED")
        callback = callback_for_order(order_id, callback_url)
        items = [{"id": item.get('id', 'ITEM'), "name": item.get('name', 'Item')[:255],
                  "price": exact_amount(item.get('price')), "quantity": item.get('quantity', 1)}
                 for item in item_details]
        if any(type(item['quantity']) is not int or item['quantity'] < 1 for item in items):
            raise DokuError("DOKU_QUANTITY_INVALID")
        if sum(item['price'] * item['quantity'] for item in items) != exact_amount(amount):
            raise DokuError("DOKU_LINE_ITEMS_MISMATCH")
        body = {"order": {"invoice_number": order_id, "amount": exact_amount(amount), "currency": "IDR",
                          "line_items": items, "callback_url": callback, "callback_url_result": callback,
                          "auto_redirect": True, "recover_abandoned_cart": False},
                "payment": {"payment_due_date": settings.DOKU_CHECKOUT_DUE_MINUTES,
                            "payment_method_types": methods},
                "customer": {"email": customer_details['email'], "name": customer_details.get('first_name', 'Peserta')},
                "additional_info": {"override_notification_url": settings.doku_notification_url}}
        return json.dumps(body, separators=(',', ':'), ensure_ascii=False)

    def _call(self, method: str, target: str, body: str | None = None, request_id: str | None = None):
        if not self.client_id or not self.secret_key:
            raise DokuError("DOKU_NOT_CONFIGURED")
        request_id = request_id or str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        encoded = body.encode() if body is not None else None
        headers = {"Client-Id": self.client_id, "Request-Id": request_id, "Request-Timestamp": timestamp,
                   "Content-Type": "application/json",
                   "Signature": self._generate_signature(request_id, timestamp, target,
                                  self._digest(encoded) if encoded is not None else None)}
        try:
            result = requests.request(method, self.base_url + target, data=encoded, headers=headers,
                                      timeout=(5, 15), allow_redirects=False)
        except requests.RequestException as exc:
            raise DokuError("DOKU_CONNECTION_UNCERTAIN") from exc
        if len(result.content) > 262144:
            raise DokuError("DOKU_RESPONSE_TOO_LARGE")
        response_headers = {key.lower(): value for key, value in result.headers.items()}
        response_timestamp = response_headers.get('response-timestamp', '')
        expected = self._generate_signature(request_id, response_timestamp, target,
                   self._digest(result.content) if method == 'POST' else None, response=True)
        if not response_timestamp or not same_value(response_headers.get('signature', ''), expected):
            raise DokuError("DOKU_RESPONSE_SIGNATURE_INVALID")
        if result.status_code not in (200, 201, 409):
            raise DokuError(f"DOKU_HTTP_{result.status_code}")
        try:
            payload = json.loads(result.content)
        except (ValueError, UnicodeDecodeError) as exc:
            raise DokuError("DOKU_RESPONSE_INVALID") from exc
        if not isinstance(payload, dict):
            raise DokuError("DOKU_RESPONSE_INVALID")
        return payload

    def create_transaction(self, order_id, amount, item_details, customer_details, callback_url=None,
                           *, request_id=None, request_body=None):
        body = request_body or self.build_checkout_body(order_id, amount, item_details, customer_details, callback_url)
        payload = self._call('POST', '/checkout/v1/payment', body, request_id)
        response = payload.get('response', {})
        order, payment = response.get('order', {}), response.get('payment', {})
        if ('SUCCESS' not in payload.get('message', []) or order.get('invoice_number') != order_id
                or exact_amount(order.get('amount')) != exact_amount(amount) or order.get('currency', 'IDR') != 'IDR'):
            raise DokuError("DOKU_CHECKOUT_MISMATCH")
        redirect_url = self.checkout_url(payment.get('url'))
        try:
            raw_expiry = payment['expired_date']
            if not re.fullmatch(r'[0-9]{14}', raw_expiry):
                raise ValueError
            expiry = datetime.strptime(raw_expiry, '%Y%m%d%H%M%S').replace(
                tzinfo=ZoneInfo(settings.DOKU_EXPIRY_TIMEZONE)).astimezone(timezone.utc)
        except (KeyError, TypeError, ValueError) as exc:
            raise DokuError("DOKU_EXPIRY_INVALID") from exc
        if expiry <= datetime.now(timezone.utc):
            raise DokuError("DOKU_CHECKOUT_EXPIRED")
        return {'token': str(payment.get('id', '')), 'redirect_url': redirect_url, 'expires_at': expiry}

    def checkout_url(self, value):
        if not isinstance(value, str):
            raise DokuError("DOKU_URL_INVALID")
        target = urlsplit(value)
        hosts = {'jokul.doku.com', 'checkout.doku.com'} if self.is_production else {'sandbox.doku.com'}
        if (target.scheme != 'https' or target.hostname not in hosts or target.username or target.password
                or target.port not in (None, 443)):
            raise DokuError("DOKU_URL_INVALID")
        return value

    def get_status(self, order_id):
        payload = self._call('GET', '/orders/v1/status/' + quote(order_id, safe=''))
        self._validate_status(payload)
        if payload['order']['invoice_number'] != order_id:
            raise DokuError("DOKU_INVOICE_MISMATCH")
        return payload

    @staticmethod
    def _validate_status(payload):
        if not isinstance(payload, dict) or not isinstance(payload.get('order'), dict):
            raise DokuError("DOKU_PAYLOAD_INVALID")
        order = payload['order']
        if not isinstance(order.get('invoice_number'), str) or order.get('currency', 'IDR') != 'IDR':
            raise DokuError("DOKU_ORDER_INVALID")
        exact_amount(order.get('amount'))
        for key in ('transaction', 'payment', 'channel'):
            if key in payload and not isinstance(payload[key], dict):
                raise DokuError("DOKU_PAYLOAD_INVALID")

    def verify_notification(self, headers, body_bytes, target_path=LEGACY_NOTIFICATION_PATH):
        headers = {key.lower(): value for key, value in headers.items()}
        if not self.client_id or not self.secret_key:
            raise DokuError("DOKU_NOT_CONFIGURED")
        if len(body_bytes) > 262144:
            raise DokuError("DOKU_NOTIFICATION_TOO_LARGE")
        request_id, timestamp = headers.get('request-id', ''), headers.get('request-timestamp', '')
        if (not same_value(headers.get('client-id', ''), self.client_id)
                or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', request_id)
                or target_path not in {NOTIFICATION_PATH, LEGACY_NOTIFICATION_PATH}
                or headers.get('request-target', target_path) != target_path):
            raise DokuError("DOKU_NOTIFICATION_HEADERS_INVALID")
        try:
            stamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            if stamp.tzinfo is None or stamp > datetime.now(timezone.utc) + timedelta(minutes=5):
                raise ValueError
        except ValueError as exc:
            raise DokuError("DOKU_TIMESTAMP_INVALID") from exc
        expected = self._generate_signature(request_id, timestamp, target_path, self._digest(body_bytes))
        if not same_value(headers.get('signature', ''), expected):
            raise DokuError("DOKU_SIGNATURE_INVALID")
        try:
            payload = json.loads(body_bytes)
        except (ValueError, UnicodeDecodeError) as exc:
            raise DokuError("DOKU_PAYLOAD_INVALID") from exc
        self._validate_status(payload)
        return {'order_id': payload['order']['invoice_number'], 'amount': exact_amount(payload['order']['amount']),
                'transaction_status': payload.get('transaction', {}).get('status') or payload.get('payment', {}).get('status'),
                'status': payment_status(payload), 'raw_body': payload, 'request_id': request_id,
                'body_hash': hashlib.sha256(body_bytes).hexdigest()}


doku_service = DokuService()
