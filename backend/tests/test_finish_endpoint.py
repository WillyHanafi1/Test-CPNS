import asyncio
import os
import requests

def test_finish():
    # User's token is typically in cookies if HttpOnly, or we can just try hitting it directly.
    # We can't easily get the auth token, but we CAN check if it returns 401 or 500.
    res = requests.post("http://localhost:8001/api/v1/exam/finish/06e79abd-b10c-4153-8940-dd719b8aaf59")
    print("Status:", res.status_code)
    print("Body:", res.text)
    print("Headers:", res.headers)

if __name__ == "__main__":
    test_finish()
