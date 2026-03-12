import midtransclient
from backend.config import settings

class MidtransService:
    def __init__(self):
        self.snap = midtransclient.Snap(
            is_production=settings.MIDTRANS_IS_PRODUCTION,
            server_key=settings.MIDTRANS_SERVER_KEY,
            client_key=settings.MIDTRANS_CLIENT_KEY
        )

    def create_transaction(self, order_id: str, amount: int, item_details: list, customer_details: dict):
        """
        Create a Snap transaction and return the snap_token.
        """
        param = {
            "transaction_details": {
                "order_id": order_id,
                "gross_amount": amount
            },
            "item_details": item_details,
            "customer_details": customer_details,
            "usage_limit": 1
        }
        
        transaction = self.snap.create_transaction(param)
        return transaction  # contains 'token' and 'redirect_url'

    def verify_notification(self, notification_body: dict):
        """
        Verify the notification from Midtrans using the server key.
        """
        # midtrans-client handles signature verification usually via status check or helper
        status_response = self.snap.transactions.notification(notification_body)
        return status_response

midtrans_service = MidtransService()
