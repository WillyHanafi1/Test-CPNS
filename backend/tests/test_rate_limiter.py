from types import SimpleNamespace
import pytest
from backend.core.rate_limiter import _get_client_ip, _is_ip_trusted


@pytest.mark.parametrize(
    "ip_address_str, expected",
    [
        # Trusted IPs based on default TRUSTED_PROXIES ("127.0.0.1/32,172.30.42.2/32")
        ("127.0.0.1", True),
        ("172.30.42.2", True),

        # Untrusted IPs (including stale Droplet subnet 172.19.0.0/16)
        ("8.8.8.8", False),
        ("192.168.1.1", False),
        ("172.19.0.1", False),
        ("172.30.42.3", False),
        ("127.0.0.2", False),

        # Invalid IPs
        ("invalid_ip", False),
        ("", False),
        ("256.256.256.256", False),
        ("172.30.42.2.1", False),
    ],
)
def test_is_ip_trusted(ip_address_str: str, expected: bool):
    """Verify _is_ip_trusted enforces exact trusted proxy CIDRs."""
    assert _is_ip_trusted(ip_address_str) == expected


def _fake_request(client_host: str, xff: str | None = None):
    headers = {"X-Forwarded-For": xff} if xff is not None else {}
    return SimpleNamespace(client=SimpleNamespace(host=client_host), headers=headers)


def test_get_client_ip_walks_xff_right_to_left_to_block_spoofing():
    # Spoofed leftmost IP must be ignored; rightmost untrusted IP wins
    req = _fake_request("172.30.42.2", "1.2.3.4, 203.0.113.55")
    assert _get_client_ip(req) == "203.0.113.55"

    # Chained trusted proxies still resolve the real visitor IP
    req_chain = _fake_request("172.30.42.2", "9.9.9.9, 198.51.100.42, 127.0.0.1")
    assert _get_client_ip(req_chain) == "198.51.100.42"

    # Untrusted direct client cannot spoof X-Forwarded-For at all
    req_direct = _fake_request("198.51.100.77", "1.1.1.1")
    assert _get_client_ip(req_direct) == "198.51.100.77"
