import requests
import re
import time
import sys

# Config
BASE_URL = "https://bike.bucheon.go.kr/site/program/board/basicboard/list?boardtypeid=27128&menuid=154001003002&pagesize=10&currentpage="
KAKAO_APP_KEY = "f2ac53a34a1645a26f54d08c7996779f"
KAKAO_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
KAKAO_ADDR_URL = "https://dapi.kakao.com/v2/local/search/address.json"

SUPABASE_URL = "https://aqapiwyfjrvdfilcodah.supabase.co"
SUPABASE_KEY = "sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K"
TABLE_NAME = "bicycle_pumps"

def geocode_kakao(query):
    headers = {
        "Authorization": f"KakaoAK {KAKAO_APP_KEY}",
        "KA": "sdk/1.0.0 os/javascript lang/ko device/pc origin/http://localhost:5188"
    }
    
    # 1. Keyword search (Best for '굴포천', '송내역' etc)
    try:
        resp = requests.get(KAKAO_SEARCH_URL, headers=headers, params={"query": f"부천 {query}", "size": 1})
        if resp.status_code == 200:
            docs = resp.json().get('documents', [])
            if docs:
                return float(docs[0]['y']), float(docs[0]['x']), docs[0].get('address_name', f"부천 {query}")
    except: pass

    # 2. Extract and try without parentheses (e.g. '굴포천(바이크스테이션)' -> '굴포천')
    if '(' in query:
        clean_query = re.sub(r'\(.*?\)', '', query).strip()
        if clean_query:
            try:
                resp = requests.get(KAKAO_SEARCH_URL, headers=headers, params={"query": f"부천 {clean_query}", "size": 1})
                if resp.status_code == 200:
                    docs = resp.json().get('documents', [])
                    if docs:
                        return float(docs[0]['y']), float(docs[0]['x']), docs[0].get('address_name', f"부천 {clean_query}")
            except: pass

    # 3. Address search fallback (For '소사로107' etc)
    try:
        resp = requests.get(KAKAO_ADDR_URL, headers=headers, params={"query": f"부천 {query}", "size": 1})
        if resp.status_code == 200:
            docs = resp.json().get('documents', [])
            if docs:
                return float(docs[0]['y']), float(docs[0]['x']), docs[0].get('address_name', f"부천 {query}")
    except: pass
    
    return None, None, None

def scrape_bucheon_page(page_no):
    url = f"{BASE_URL}{page_no}"
    try:
        response = requests.get(url)
        html = response.content.decode('euc-kr', errors='ignore')
        matches = re.findall(r'<td class="under">\s*<a[^>]*>(.*?)</a>', html, re.DOTALL)
        return [re.sub(r'<.*?>', '', m).strip() for m in matches if m.strip() and not m.isdigit()]
    except Exception as e:
        print(f"Scrape Error: {e}")
        return []

def main():
    all_locations = []
    for page in range(1, 5):
        locations = scrape_bucheon_page(page)
        all_locations.extend(locations)
        time.sleep(0.5)

    all_locations = list(dict.fromkeys(all_locations))
    print(f"Total entries to geocode: {len(all_locations)}")
    
    normalized_list = []
    for i, loc in enumerate(all_locations):
        lat, lng, addr = geocode_kakao(loc)
        if lat:
            print(f"[{i+1}/{len(all_locations)}] OK: {loc}")
            normalized_list.append({
                "city": "부천", "name": loc, "address": addr,
                "lat": lat, "lng": lng, "source": "부천시청 자전거시설 리스트"
            })
        else:
            print(f"[{i+1}/{len(all_locations)}] FAIL: {loc}")
        time.sleep(0.05)

    if not normalized_list:
        print("Integration failed.")
        return

    print(f"\nUploading {len(normalized_list)} records...")
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}", headers=headers, json=normalized_list)
    if r.status_code in [201, 204]:
        print("Success! Bucheon integrated.")
    else:
        print(f"Error: {r.text}")

if __name__ == "__main__":
    main()
