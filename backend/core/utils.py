"""
Shared utility functions for the CPNS backend.
"""
import re


def sanitize_search(query: str, max_length: int = 100) -> str:
    """
    Escape SQL LIKE wildcards (%, _, \\) from user search input
    to prevent wildcard exploitation in ilike() queries.
    
    Also caps input length to prevent expensive ILIKE '%...%' queries
    that can't use any index. Default max is 100 characters.
    
    Without this, a user could send search="%" to match all records
    or use "_" to brute-force character positions, or send a 10,000
    character string to generate an index-bypassing query.
    """
    if not query:
        return query
    query = query[:max_length]
    return re.sub(r'([%_\\])', r'\\\1', query)
