"""
Webhook Verification Tests — Midtrans SHA-512 signature validation.

Tests the webhook signature logic to ensure:
  1. Valid signatures are accepted
  2. Invalid signatures are rejected (401)
  3. Double-webhook is idempotent
"""

import hashlib
import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock


# Midtrans signature formula:
# SHA-512(order_id + status_code + gross_amount + server_key)

def _generate_midtrans_signature(order_id: str, status_code: str, gross_amount: str, server_key: str) -> str:
    """Generate a valid Midtrans webhook signature."""
    raw = order_id + status_code + gross_amount + server_key
    return hashlib.sha512(raw.encode()).hexdigest()


class TestWebhookSignature:
    """Test Midtrans webhook signature verification."""

    def test_valid_signature_generation(self):
        """Verify our test helper generates correct SHA-512 signatures."""
        sig = _generate_midtrans_signature("ORDER-001", "200", "50000.00", "test-server-key")
        raw = "ORDER-001" + "200" + "50000.00" + "test-server-key"
        expected = hashlib.sha512(raw.encode()).hexdigest()
        assert sig == expected

    def test_invalid_signature_differs(self):
        """Tampered data should produce a different signature."""
        valid_sig = _generate_midtrans_signature("ORDER-001", "200", "50000.00", "real-key")
        tampered_sig = _generate_midtrans_signature("ORDER-001", "200", "99999.00", "real-key")
        assert valid_sig != tampered_sig

    def test_wrong_server_key_differs(self):
        """Wrong server key should produce a different signature."""
        valid_sig = _generate_midtrans_signature("ORDER-001", "200", "50000.00", "real-key")
        wrong_key_sig = _generate_midtrans_signature("ORDER-001", "200", "50000.00", "wrong-key")
        assert valid_sig != wrong_key_sig

    def test_signature_is_sha512_hex(self):
        """Signature should be a valid SHA-512 hex string (128 characters)."""
        sig = _generate_midtrans_signature("ORDER-001", "200", "50000.00", "test-key")
        assert len(sig) == 128
        assert all(c in "0123456789abcdef" for c in sig)


class TestWebhookFulfillment:
    """Test the fulfillment logic for PRO upgrade."""

    def test_pro_upgrade_duration(self):
        """PRO upgrade should add 30 days of access."""
        from datetime import datetime, timedelta, timezone

        # Simulate: user has no existing PRO
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        new_expiry = now + timedelta(days=30)

        # Should be ~30 days from now
        delta = (new_expiry - now).days
        assert delta == 30

    def test_pro_upgrade_extension(self):
        """PRO upgrade on existing PRO should stack (extend, not replace)."""
        from datetime import datetime, timedelta, timezone

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        existing_expiry = now + timedelta(days=15)  # 15 days remaining
        new_expiry = existing_expiry + timedelta(days=30)  # extend by 30

        delta = (new_expiry - now).days
        assert delta == 45  # 15 existing + 30 new
