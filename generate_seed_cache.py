import datetime
import numpy as np
import pandas as pd

# 2010-01-01부터 오늘까지의 거래일 생성
dates = pd.date_range(start="2010-01-01", end=datetime.date.today(), freq='B')
n = len(dates)

np.random.seed(42)

# 현실적인 자산 일일 수익률 파라미터 (연평균 수익률, 변동성)
params = {
    "SPY":       (0.12, 0.17),
    "QQQ":       (0.18, 0.20),
    "QLD":       (0.32, 0.40),
    "TQQQ":      (0.42, 0.60),
    "SOXX":      (0.22, 0.25),
    "SOXL":      (0.48, 0.72),
    "SOXS":      (-0.35, 0.72),
    "SQQQ":      (-0.32, 0.60),
    "GLD":       (0.07, 0.15),
    "SLV":       (0.06, 0.25),
    "KORU":      (0.08, 0.45),
    "BIL":       (0.015, 0.005),
    "SGOV":      (0.018, 0.005),
    "005930.KS": (0.15, 0.26),  # 삼성전자
    "000660.KS": (0.24, 0.38),  # SK하이닉스
}

# 계절성 효과 시뮬레이션: 11~4월은 강세, 8~9월은 약세
months = dates.month
seasonal_drift = np.where(np.isin(months, [1, 2, 3, 4, 11, 12]), 0.0006, -0.0003)

data = {}
for ticker, (ann_ret, ann_vol) in params.items():
    daily_drift = (ann_ret / 252.0)
    if ticker not in ["BIL", "SGOV"]:
        daily_drift += seasonal_drift
    daily_vol = ann_vol / np.sqrt(252.0)
    daily_rets = np.random.normal(daily_drift, daily_vol, n)
    
    # 누적 가격
    if ticker in ["005930.KS"]:
        init_price = 16000.0 # 2010년 액면분할 환산 주가 기준
    elif ticker in ["000660.KS"]:
        init_price = 23000.0
    else:
        init_price = 100.0

    price_series = init_price * np.exp(np.cumsum(daily_rets))
    data[ticker] = price_series

df = pd.DataFrame(data, index=dates)
df.to_csv("d:/투자/Quant/etf-seasonality-dashboard/data_cache.csv")
print(f"삼성전자, SK하이닉스 포함 캐시 생성 완료: {len(df)} 행, 컬럼: {list(df.columns)}")
