"""
Shared utility functions for the CPNS backend.
"""
import re


def sanitize_search(query: str) -> str:
    """
    Escape SQL LIKE wildcards (%, _, \\) from user search input
    to prevent wildcard exploitation in ilike() queries.
    
    Without this, a user could send search="%" to match all records
    or use "_" to brute-force character positions.
    """
    if not query:
        return query
    return re.sub(r'([%_\\])', r'\\\1', query)
