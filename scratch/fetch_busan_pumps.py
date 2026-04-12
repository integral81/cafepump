import json
import requests
import time
import sys
import re

# Ensure stdout handles UTF-8
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# Config
BUSAN_SERVICE_KEY = "F1yXqr8ihqx8a6dWGzvaefUtHYJZICJK8fkh7gGfKyh2Ov8AqfGpx2aVa30ri0e4Ad5GG3cZQ0gTxevHu%2BGB%2BQ%3D%3D"
BUSAN_API_URL = "http://apis.data.go.kr/6260000/BusanBicycleInfoService/getAirInjectorInfo"

KAKAO_APP_KEY = "f2ac53a34a1645a26f54d08c7996779f"
KAKAO_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
KAKAO_ADDR_URL = "https://dapi.kakao.com/v2/local/search/address.json"

SUPABASE_URL = "https://aqapiwyfjrvdfilcodah.supabase.co"
SUPABASE_KEY = "sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K"
TABLE_NAME = "bicycle_pumps"

def clean_name(name):
    # Remove common descriptive terms that break geocoding
    terms = ["맞은편", "인근", "옆", "하부", "상부", "건너편", "부근", "뒤", "앞", "입구"]
    for term in terms:
        name = name.replace(term, " ")
    # Remove characters inside parentheses
    name = re.sub(r'\(.*?\)', ' ', name)
    return " ".join(name.split())

def fetch_busan_data():
    raw_url = f"{BUSAN_API_URL}?serviceKey={BUSAN_SERVICE_KEY}&numOfRows=200&pageNo=1&resultType=json"
    print(f"Fetching Busan API data...")
    try:
        response = requests.get(raw_url)
        response.encoding = 'utf-8'
        if response.status_code != 200 or "Unauthorized" in response.text:
            print(f"API Error: {response.text}")
            return None
        data = response.json()
        return data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
    except Exception as e:
        print(f"Fetch Error: {e}")
        return None

def geocode_kakao(query, is_address=False):
    headers = {
        "Authorization": f"KakaoAK {KAKAO_APP_KEY}",
        "KA": "sdk/1.0.0 os/javascript lang/ko device/pc origin/http://localhost:5188"
    }
    url = KAKAO_ADDR_URL if is_address else KAKAO_SEARCH_URL
    full_query = f"부산광역시 {query}"
    params = {"query": full_query, "size": 1}
    
    try:
        resp = requests.get(url, headers=headers, params=params)
        if resp.status_code == 200:
            data = resp.json()
            docs = data.get('documents', [])
            if docs:
                return float(docs[0]['y']), float(docs[0]['x']), docs[0].get('address_name', full_query)
        return None, None, None
    except Exception:
        return None, None, None

def main():
    items = fetch_busan_data()
    if not items:
        print("No Busan data found.")
        return

    print(f"Geocoding {len(items)} items via Kakao API...")
    
    normalized_list = []
    for i, item in enumerate(items):
        gugun = item.get('gugun', '')
        spot = item.get('spot', '')
        # Special cleaning
        clean_spot = clean_name(spot)
        query = f"{gugun} {clean_spot}"
        
        # 1. Keyword search (most accurate)
        lat, lng, addr = geocode_kakao(query)
        
        # 2. Address search fallback
        if not lat:
            lat, lng, addr = geocode_kakao(query, is_address=True)
            
        # 3. Fallback to just district if failed (least accurate, but keeps Busan coverage)
        # Actually, let's just skip if we can't find the spot.
            
        if lat:
            print(f"[{i+1}/{len(items)}] OK: {spot}")
            normalized_list.append({
                "city": "부산",
                "name": spot,
                "address": addr,
                "lat": lat,
                "lng": lng,
                "source": "부산광역시_자전거 공기 주입기 정보 서비스"
            })
        else:
            print(f"[{i+1}/{len(items)}] FAIL: {query}")
        
        time.sleep(0.05)

    if not normalized_list:
        print("Geocoding failed for all items.")
        return

    print(f"\nFinal count for upload: {len(normalized_list)}")
    print("Uploading to Supabase...")
    
    supabase_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    supabase_endpoint = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}"
    
    for i in range(0, len(normalized_list), 50):
        batch = normalized_list[i:i+50]
        r = requests.post(supabase_endpoint, headers=supabase_headers, json=batch)
        if r.status_code in [201, 204]:
            print(f"Batch {i//50 + 1} uploaded.")
        else:
            print(f"Error: {r.text}")

if __name__ == "__main__":
    main()
