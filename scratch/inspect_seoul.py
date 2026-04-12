import pandas as pd

def inspect_seoul():
    path = r"C:\Users\이승민\002. 로또 Project\1002. 카공 X MBTI\서울시 자전거 편의시설.csv"
    # Use standard encoding and show hex of characters if needed, but let's just use indices
    df = pd.read_csv(path, encoding='cp949')
    
    # Print columns with indices
    for i, col in enumerate(df.columns):
        print(f"[{i}] {col}")

    # Check first few rows for categories
    # Column 4 is usually '상세분류'
    if len(df.columns) > 4:
        col4_name = df.columns[4]
        print(f"\nColumn 4 Name: {col4_name}")
        print("Unique values in Column 4:")
        print(df.iloc[:, 4].unique())

    # Check '기능 명칭' columns (Columns 27, 29, 31, 33, 35, 37, 39, 41, 43, 45)
    for i in [27, 29, 31, 33, 35, 37, 39, 41, 43, 45]:
        if i < len(df.columns):
             print(f"\nUnique values in Column {i} ({df.columns[i]}):")
             print(df.iloc[:, i].unique())

if __name__ == "__main__":
    inspect_seoul()
