import pandas as pd
import json
import os

# Paths
BASE_DIR = r"C:\Users\이승민\002. 로또 Project\1002. 카공 X MBTI"
OUTPUT_PATH = r"C:\Users\이승민\002. 로또 Project\1002. 카공_MBTI_맵\bicycle_pumps.json"

FILES = {
    "seoul": os.path.join(BASE_DIR, "서울시 자전거 편의시설.csv"),
    "incheon": os.path.join(BASE_DIR, "인천광역시_인천데이터포털_자전거보관장소 정보_20250627.csv"),
    "suwon": os.path.join(BASE_DIR, "경기도 수원시_자전거 공기주입기_20251230.csv"),
    "national": os.path.join(BASE_DIR, "전국자전거대여소표준데이터.csv")
}

def normalize():
    unified_data = []
    log = []

    # 1. Seoul - High Accuracy Refinement
    try:
        df = pd.read_csv(FILES["seoul"], encoding='cp949')
        # Based on inspection, Column 45 (기능 명칭 10) seems to hold the pump info
        # But let's check ALL "기능 명칭" columns (27, 29, 31, 33, 35, 37, 39, 41, 43, 45)
        feature_indices = [27, 29, 31, 33, 35, 37, 39, 41, 43, 45]
        
        def has_pump(row):
            for i in feature_indices:
                val = str(row.iloc[i]) if i < len(row) else ""
                if "공기주입기" in val:
                    return True
            return False

        mask = df.apply(has_pump, axis=1)
        df_filtered = df[mask].copy()
        for _, row in df_filtered.iterrows():
            unified_data.append({
                "city": "서울",
                "name": str(row.iloc[2]), # 장소명
                "address": str(row.iloc[10] if not pd.isna(row.iloc[10]) else row.iloc[11]), # 도로명/지번
                "lat": float(row.iloc[6]), # y 좌표
                "lng": float(row.iloc[5]), # x 좌표
                "source": "서울시 자전거 편의시설"
            })
        log.append(f"Seoul: {len(df_filtered)} pumps confirmed.")
    except Exception as e:
        log.append(f"Seoul Error: {e}")

    # 2. Incheon
    try:
        df = pd.read_csv(FILES["incheon"], encoding='cp949')
        # Column '공기주입기설치여부' (assuming it's at index 9 based on preview)
        # Let's find it by name or index
        pump_col = [c for c in df.columns if '공기주입기' in str(c)][0]
        df_filtered = df[df[pump_col] == 'Y'].copy()
        for _, row in df_filtered.iterrows():
            unified_data.append({
                "city": "인천",
                "name": str(row.get('보관소명', '')),
                "address": str(row.get('도로명주소', row.get('지번주소', ''))),
                "lat": float(row.get('위도', 0)),
                "lng": float(row.get('경도', 0)),
                "source": "인천시 자전거 보관장소"
            })
        log.append(f"Incheon: {len(df_filtered)} pumps confirmed.")
    except Exception as e:
        log.append(f"Incheon Error: {e}")

    # 3. Suwon
    try:
        df = pd.read_csv(FILES["suwon"], encoding='cp949')
        for _, row in df.iterrows():
            unified_data.append({
                "city": "수원",
                "name": str(row.get('설치지점', '')),
                "address": str(row.get('도로명주소', row.get('지번주소', ''))),
                "lat": float(row.get('위도', 0)),
                "lng": float(row.get('경도', 0)),
                "source": "수원시 자전거 공기주입기"
            })
        log.append(f"Suwon: {len(df)} pumps confirmed.")
    except Exception as e:
        log.append(f"Suwon Error: {e}")

    # 4. National Standard Data
    try:
        df = pd.read_csv(FILES["national"], encoding='cp949')
        pump_col = [c for c in df.columns if '공기주입기' in str(c) and '여부' in str(c)][0]
        df_filtered = df[df[pump_col] == 'Y'].copy()
        for _, row in df_filtered.iterrows():
            unified_data.append({
                "city": "국가표준",
                "name": str(row.get('자전거대여소명', '')),
                "address": str(row.get('도로명주소', row.get('지번주소', ''))),
                "lat": float(row.get('위도', 0)),
                "lng": float(row.get('경도', 0)),
                "source": "전국 자전거 대여소 표준 데이터"
            })
        log.append(f"National: {len(df_filtered)} pumps confirmed.")
    except Exception as e:
        log.append(f"National Error: {e}")

    # --- POST PROCESSING ---
    
    df_unified = pd.DataFrame(unified_data)
    initial_count = len(df_unified)
    
    # 1. Coordinate Validation
    df_unified = df_unified[(df_unified['lat'] > 33) & (df_unified['lat'] < 39) & 
                            (df_unified['lng'] > 124) & (df_unified['lng'] < 132)]
    log.append(f"Coordinate Validation: Dropped {initial_count - len(df_unified)} records.")

    # 2. Strict Deduplication
    # Round to 4 decimal places for spatial clustering
    df_unified['lat_round'] = df_unified['lat'].round(4)
    df_unified['lng_round'] = df_unified['lng'].round(4)
    
    # Priority: Regional > National
    source_priority = {"수원시 자전거 공기주입기": 0, "인천시 자전거 보관장소": 1, "서울시 자전거 편의시설": 2, "전국 자전거 대여소 표준 데이터": 3}
    df_unified['priority'] = df_unified['source'].map(source_priority)
    df_unified = df_unified.sort_values('priority')
    
    pre_dedup = len(df_unified)
    df_unified = df_unified.drop_duplicates(subset=['lat_round', 'lng_round'], keep='first')
    log.append(f"Deduplication (Spatial): Dropped {pre_dedup - len(df_unified)} redundant records.")

    # Final Total
    final_data = df_unified.drop(columns=['lat_round', 'lng_round', 'priority']).to_dict(orient='records')
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)
    
    log.append(f"Final Count (100% Accuracy Target): {len(final_data)}")
    
    for l in log:
        print(l)

if __name__ == "__main__":
    normalize()
