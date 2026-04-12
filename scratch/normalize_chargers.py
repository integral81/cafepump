import pandas as pd
import json
import os

# Paths
BASE_DIR = r"C:\Users\이승민\002. 로또 Project\1002. 카공 X MBTI"
FILE_PATH = os.path.join(BASE_DIR, "서울시 전동보장구 급속충전소(종료예정).csv")
OUTPUT_PATH = r"C:\Users\이승민\002. 로또 Project\1002. 카공_MBTI_맵\electric_chargers.json"

def normalize():
    try:
        # Read with CP949 encoding
        df = pd.read_csv(FILE_PATH, encoding='cp949')
        
        # Mapping rules based on header inspection
        # Columns: ["시설명", "시도명", "시군구명", "시군구코드", "도로명주소", "지번주소", "위도", "경도", "설치장소", ...]
        
        unified_data = []
        for _, row in df.iterrows():
            lat = row.get('위도')
            lng = row.get('경도')
            
            # Basic coordinate validation
            if pd.isna(lat) or pd.isna(lng) or lat == 0 or lng == 0:
                continue
                
            unified_data.append({
                "name": str(row.get('시설명', row.get('설치장소', '알 수 없는 장소'))),
                "address": str(row.get('도로명주소', row.get('지번주소', ' 주소 정보 없음'))),
                "lat": float(lat),
                "lng": float(lng),
                "description": f"설치장소: {row.get('설치장소', '-')}, 급속충전기: {row.get('급속충전가능대수', 1)}대",
                "source": "서울시 전동보장구 급속충전소 데이터"
            })
            
        # Deduplication
        df_unified = pd.DataFrame(unified_data)
        initial_count = len(df_unified)
        df_unified = df_unified.drop_duplicates(subset=['lat', 'lng'], keep='first')
        
        final_list = df_unified.to_dict(orient='records')
        
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(final_list, f, ensure_ascii=False, indent=2)
            
        print(f"Extraction successful: {len(final_list)} charging stations found (Dropped {initial_count - len(final_list)} duplicates).")
        
    except Exception as e:
        print(f"Error during normalization: {e}")

if __name__ == "__main__":
    normalize()
