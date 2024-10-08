import os
import requests
import base64
import firebase_admin
from firebase_admin import db

file_path = os.path.abspath(__file__)

# Print the full file path
print("Full file path:", file_path)
cred = firebase_admin.credentials.Certificate("/code/app/dependencies/serviceAccountKey.json")
firebase_admin.initialize_app(cred, {'databaseURL': 'https://shepherd-app-382114-default-rtdb.firebaseio.com'})

# Get a reference to the database

database = firebase_admin.db


async def get_fermata_customer_id(firebase_id: str) -> str:
    """
    Asynchronously retrieves the Fermata customer ID from the database.

    Args:
        firebase_id (str): The Firebase ID of the user.

    Returns:
        str: The Fermata customer ID if found, None otherwise.
    """

    try:
        fermata_customer_ref = database.reference(f"user-subscriptions/{firebase_id}/fermataCustomerId")
        snapshot =  fermata_customer_ref.get()
        return snapshot
    except (firebase_admin.exceptions.FirebaseError, ValueError) as error:
        print(f"Error fetching Fermata customer ID: {error}")
        return None
    
def get_account_balance(
    account_id: str, denomination: str, company_id: str, api_key: str
) -> int:
    """
    Fetches the account balance from the Fermata API.

    Args:
        account_id (str): The Fermata account ID.
        denomination (str): The denomination of the balance (e.g., "USD").
        company_id (str): The Fermata company ID.
        api_key (str): The Fermata API key.

    Returns:
        int: The account balance (amount) if successful, None otherwise.
    """

    url = f"https://api.gofermata.com/v1/accounts/{account_id}/balance/{denomination}"
    print("url is", url)
    # Encode credentials 
    print("Credentials", f"{company_id}:{api_key}")
    credentials = f"{company_id}:{api_key}".encode("utf-8")
    encoded_credentials = base64.b64encode(credentials).decode("utf-8")
    auth_header = f"Basic {encoded_credentials}"

    headers = {"Content-Type": "application/json", "Authorization": auth_header}
    print("headers are", headers)
    session = requests.Session()  
    response = session.get(url, headers=headers)
    print("response", response)
    print(response.status_code)
    if response.status_code == 500:
        return None
    if response.ok:
        data = response.json()
        print("data is:",data)
        balance_data = data.get("data")  
        if balance_data:
            return balance_data.get("amount")  
        else:
            return None  # Return None if "data" is missing
    else:
        print(f"Error fetching account balance: {response.text()}")
        return None
    
def push_event(account_id: str, event_type: str, event_cost: int, event_denomination: str, company_id: str, api_key: str) -> dict:
    url = f"https://api.gofermata.com/v1/accounts/{account_id}/events"
    payload = {
        'type': event_type,
        'cost_override_amount': event_cost,
        'cost_override_denomination': event_denomination,
        'gate_on_balance': True
    }
    credentials = f"{company_id}:{api_key}".encode("utf-8")
    encoded_credentials = base64.b64encode(credentials).decode("utf-8")
    auth_header = f"Basic {encoded_credentials}"

    headers = {
        'Content-Type': 'application/json',
        'Authorization': auth_header
    }
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json().get('data')

async def get_docchat_balance(firebase_id: str) -> bool:
    """
    Asynchronously checks if the user has sufficient docchat balance.

    Args:
        firebase_id (str): The Firebase ID of the user.

    Returns:
        bool: False if there's an error, True if the user has insufficient docchat balance.
    """
    fermata_customer_id = await get_fermata_customer_id(firebase_id)
    if not fermata_customer_id or (fermata_customer_id and not isinstance(fermata_customer_id, str)):
        raise ValueError('fermataCustomerId is null')
    try:
            chat_limit = get_account_balance(fermata_customer_id, 'docchats', os.getenv('FERMATA_COMPANY_ID'), os.getenv('FERMATA_API_KEY'))
            return not chat_limit or chat_limit < 1
    except Exception as e:
            print(f'Error getting docchat balance: {e}')
            return True


async def set_docchat_balance(firebase_id: str) -> int:
    fermata_customer_id = await get_fermata_customer_id(firebase_id)
    if not fermata_customer_id or (fermata_customer_id and not isinstance(fermata_customer_id, str)):
        raise ValueError('fermataCustomerId is null')
    try:
            chat_limit = push_event(fermata_customer_id, 'CHAT', 1, 'docchats', os.getenv('FERMATA_COMPANY_ID'), os.getenv('FERMATA_API_KEY'))
            return chat_limit.get('balance', {}).get('amount', 0)
    except Exception as e:
            print(f'Error setting docchat balance: {e}')
            return 0
    

async def get_aitutor_chat_balance(firebase_id: str) -> bool:
    """
    Asynchronously checks if the user has sufficient AI Chat (maths) balance.

    Args:
        firebase_id (str): The Firebase ID of the user.

    Returns:
        bool: True if there's an error, True if the user has insufficient AI Chat (maths) balance.
    """
    print("firebase ID from body", firebase_id)
    fermata_customer_id = await get_fermata_customer_id(firebase_id)
    if not fermata_customer_id or (fermata_customer_id and not isinstance(fermata_customer_id, str)):
        raise ValueError('fermataCustomerId is null')
    try:
            chat_limit = get_account_balance(fermata_customer_id, 'aitutorchats', os.getenv('FERMATA_COMPANY_ID'), os.getenv('FERMATA_API_KEY'))
            return not chat_limit or chat_limit < 1
    except Exception as e:
            print(f'Error getting aitutor chat balance: {e}')
            return True


async def set_aitutor_chat_balance(firebase_id: str) -> int:
    fermata_customer_id = await get_fermata_customer_id(firebase_id)
    if not fermata_customer_id or (fermata_customer_id and not isinstance(fermata_customer_id, str)):
        raise ValueError('fermataCustomerId is null')
    try:
            chat_limit = push_event(fermata_customer_id, 'CHAT', 1, 'aitutorchats', os.getenv('FERMATA_COMPANY_ID'), os.getenv('FERMATA_API_KEY'))
            return chat_limit.get('balance', {}).get('amount', 0)
    except Exception as e:
            print(f'Error setting aitutor chat balance: {e}')
            return 0


