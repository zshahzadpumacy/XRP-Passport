import xrpl
from xrpl.clients import JsonRpcClient
from xrpl.wallet import Wallet


JSON_RPC_URL = "https://s.altnet.rippletest.net:51234/"
client = JsonRpcClient(JSON_RPC_URL)

# Credentials to be anchored
verifiable_credentials = {
    "name": "John Doe",
    "email": "johndoe@gmail.com",
    "age": 30
}

def Anchor():
    #Prepare Transaction
    transaction = xrpl.models.transactions.Payment(
        account="raBiQyQUWvGiUEt8YW9ThW2WdnM8rajFL3",  
        destination="rBjFFJkrfTvTwSzJGSTw45iGKjxxtoFXGc",  
        amount=xrpl.models.amounts.Amount("1", "XRP"),  
        invoice_id=xrpl.utils.crypto.hash_sha256(str(verifiable_credentials)),  # Hash the credentials as the invoice ID
        fee=xrpl.models.amounts.Amount("12", "drops")  
)

    # Credentials
    test_wallet = Wallet(seed="sEd7AB2cFh5XK8Y5jAXLscPzPGym4VL", sequence=38924475)

    # Signing Transaction
    my_tx_payment_signed = xrpl.transaction.safe_sign_and_autofill_transaction(transaction, test_wallet, client)

    # Submit and send the transaction
    tx_response = xrpl.transaction.send_reliable_submission(my_tx_payment_signed, client)
    print(tx_response)

Anchor()