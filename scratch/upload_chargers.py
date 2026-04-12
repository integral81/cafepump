import json
import requests
import time

# Config
SUPABASE_URL = "https://aqapiwyfjrvdfilcodah.supabase.co"
SUPABASE_KEY = "sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K"
TABLE_NAME = "electric_chargers"
JSON_PATH = r"C:\Users\이승민\002. 로또 Project\1002. 카공_MBTI_맵\electric_chargers.json"

def upload():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Total records to upload: {len(data)}")
    
    batch_size = 100
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    endpoint = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}"
    
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        try:
            response = requests.post(endpoint, headers=headers, json=batch)
            if response.status_code in [201, 204]:
                print(f"Successfully uploaded batch {i//batch_size + 1}/{len(data)//batch_size + 1}")
            else:
                print(f"Error in batch {i//batch_size + 1}: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Connection error in batch {i//batch_size + 1}: {e}")
        
        time.sleep(0.1)

if __name__ == "__main__":
    upload()
