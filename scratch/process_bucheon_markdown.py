import requests
import re
import time
import os

# Config
KAKAO_APP_KEY = "f2ac53a34a1645a26f54d08c7996779f"
SUPABASE_URL = "https://aqapiwyfjrvdfilcodah.supabase.co"
SUPABASE_KEY = "sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K"
TABLE_NAME = "bicycle_pumps"

FILE_PATHS = [
    r"C:\Users\이승민\.gemini\antigravity\brain\b56cedae-a7f5-47eb-8710-1b80ad88897e\.system_generated\steps\520\content.md",
    r"C:\Users\이승민\.gemini\antigravity\brain\b56cedae-a7f5-47eb-8710-1b80ad88897e\.system_generated\steps\605\content.md",
    r"C:\Users\이승민\.gemini\antigravity\brain\b56cedae-a7f5-47eb-8710-1b80ad88897e\.system_generated\steps\610\content.md",
    r"C:\Users\이승민\.gemini\antigravity\brain\b56cedae-a7f5-47eb-8710-1b80ad88897e\.system_generated\steps\613\content.md"
]

def geocode_kakao(query):
    headers = {
        "Authorization": f"KakaoAK {KAKAO_APP_KEY}",
        "KA": "sdk/1.0.0 os/javascript lang/ko device/pc origin/http://localhost:5188"
    }
    
    # Tier 1: Keyword search (Best for spots)
    try:
        resp = requests.get("https://dapi.kakao.com/v2/local/search/keyword.json", 
                            headers=headers, params={"query": f"부천시 {query}", "size": 1})
        docs = resp.json().get('documents', [])
        if docs:
            return float(docs[0]['y']), float(docs[0]['x']), docs[0].get('address_name', query)
    except: pass

    # Tier 2: Search without parentheses
    clean_query = re.sub(r'\(.*?\)', '', query).strip()
    if clean_query and clean_query != query:
        try:
            resp = requests.get("https://dapi.kakao.com/v2/local/search/keyword.json", 
                                headers=headers, params={"query": f"부천시 {clean_query}", "size": 1})
            docs = resp.json().get('documents', [])
            if docs:
                return float(docs[0]['y']), float(docs[0]['x']), docs[0].get('address_name', query)
        except: pass

    # Tier 3: Address search fallback
    try:
        resp = requests.get("https://dapi.kakao.com/v2/local/search/address.json", 
                            headers=headers, params={"query": f"부천시 {query}", "size": 1})
        docs = resp.json().get('documents', [])
        if docs:
            return float(docs[0]['y']), float(docs[0]['x']), docs[0].get('address_name', query)
    except: pass

    return None, None, None

def main():
    all_names = []
    for path in FILE_PATHS:
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            # Find [Name](https://bike.bucheon.go.kr/...)
            # The list items start with a number and colon in the cleaned view, 
            # but in the raw markdown they look like: [송내역(바이크스테이션)](...)
            matches = re.findall(r'\[(.*?)\]\(https://bike\.bucheon\.go\.kr/.*?\)', content)
            # Filter out navigational links
            for m in matches:
                if m not in ["상단메뉴 바로가기", "본문 내용 바로가기", "부천시홈", "로그인", "회원가입", "전체 메뉴 보기", "처음", "이전", "다음", "마지막", "밴드", "개인정보처리방침", "이메일수집거부정책", "저작권정책", "찾아오시는 길", "목록"]:
                    all_names.append(m)
    
    all_names = list(dict.fromkeys(all_names))
    print(f"Extracted {len(all_names)} unique names from markdown files.")
    
    final_data = []
    for i, name in enumerate(all_names):
        lat, lng, addr = geocode_kakao(name)
        if lat:
            print(f"[{i+1}/{len(all_names)}] OK: {name}")
            final_data.append({
                "city": "부천", "name": name, "address": addr,
                "lat": lat, "lng": lng, "source": "부천시청 자전거시설 리스트"
            })
        else:
            print(f"[{i+1}/{len(all_names)}] FAIL: {name}")
        time.sleep(0.05)

    if not final_data:
        print("No data to upload.")
        return

    print(f"\nUploading {len(final_data)} records...")
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}", headers=headers, json=final_data)
    if r.status_code in [201, 204]:
        print("Integration Success!")
    else:
        print(f"Error: {r.text}")

if __name__ == "__main__":
    main()
