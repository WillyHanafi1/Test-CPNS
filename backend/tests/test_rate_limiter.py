import pytest
from backend.core.rate_limiter import _is_ip_trusted, TRUSTED_PROXIES

@pytest.mark.parametrize(
    "ip_address_str, expected",
    [
        # Trusted IPs based on TRUSTED_PROXIES ("127.0.0.1/32", "172.19.0.0/16")
        ("127.0.0.1", True),
        ("172.19.0.1", True),
        ("172.19.255.254", True),

        # Untrusted IPs
        ("8.8.8.8", False),
        ("192.168.1.1", False),
        ("172.20.0.1", False), # Outside of 172.19.0.0/16
        ("127.0.0.2", False),  # Outside of 127.0.0.1/32

        # Invalid IPs
        ("invalid_ip", False),
        ("", False),
        ("256.256.256.256", False),
        ("172.19.0.1.1", False),
    ]
)
def test_is_ip_trusted(ip_address_str: str, expected: bool):
    """
    Test that _is_ip_trusted correctly identifies trusted, untrusted,
    and invalid IP addresses according to the TRUSTED_PROXIES configuration.
    """
    assert _is_ip_trusted(ip_address_str) == expected
