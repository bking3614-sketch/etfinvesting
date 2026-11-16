import app

if __name__ == "__main__":
    print("최신 주가 데이터 업데이트 시작...")
    app._load_or_fetch_data(force_download=True)
    print("업데이트 완료!")