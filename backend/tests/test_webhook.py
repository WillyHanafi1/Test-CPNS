import base64
import hashlib
import json
import pytest
from backend.core.doku_service import DokuService


def notification():
    service = DokuService()
    service.client_id, service.secret_key = "unit-client", "unit-secret"
    body = json.dumps({"order": {"invoice_number": "unit-order", "amount": 50000},
                       "transaction": {"status": "SUCCESS"}}).encode()
    digest = base64.b64encode(hashlib.sha256(body).digest()).decode()
    headers = {"Client-Id": service.client_id, "Request-Id": "unit-request",
               "Request-Timestamp": "2026-11-17T00:00:00Z",
               "Signature": service._generate_signature("unit-request", "2026-11-17T00:00:00Z",
                   "/api/v1/transactions/webhook", digest)}
    return service, body, headers


def test_valid_doku_signature_case_insensitive_headers():
    service, body, headers = notification()
    result = service.verify_notification({k.lower(): v for k,v in headers.items()}, body)
    assert result["order_id"] == "unit-order" and result["transaction_status"] == "SUCCESS"


def test_tampered_body_rejected():
    service, body, headers = notification()
    with pytest.raises(ValueError):
        service.verify_notification(headers, body.replace(b'50000', b'1'))


def test_wrong_client_rejected():
    service, body, headers = notification()
    headers["Client-Id"] = "another-client"
    with pytest.raises(ValueError):
        service.verify_notification(headers, body)


def test_missing_headers_rejected():
    service, body, _ = notification()
    with pytest.raises(ValueError):
        service.verify_notification({}, body)
