import datetime
import os
import threading
import warnings
import numpy as np
import pandas as pd
import yfinance as yf
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

warnings.filterwarnings('ignore')

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# ── 상수 및 ETF 메타데이터 ──────────────────────────────────────
TICKER_INFO = {
    "SOXL": {"name": "SOXL", "name_kr": "필라델피아 반도체 3X", "category": "레버리지 ETF", "color": "#3b82f6", "inception": "2010-03-11"},
    "TQQQ": {"name": "TQQQ", "name_kr": "나스닥100 3X", "category": "레버리지 ETF", "color": "#ec4899", "inception": "2010-02-11"},
    "SOXX": {"name": "SOXX", "name_kr": "iShares 반도체 1X", "category": "지수 ETF", "color": "#60a5fa", "inception": "2001-07-10"},
    "QLD":  {"name": "QLD",  "name_kr": "나스닥100 2X", "category": "레버리지 ETF", "color": "#a855f7", "inception": "2006-06-21"},
    "QQQ":  {"name": "QQQ",  "name_kr": "Invesco 나스닥100 1X", "category": "지수 ETF", "color": "#06b6d4", "inception": "1999-03-10"},
    "SPY":  {"name": "SPY",  "name_kr": "S&P 500 1X", "category": "지수 ETF", "color": "#10b981", "inception": "1993-01-22"},
    "GLD":  {"name": "GLD",  "name_kr": "SPDR 금 현물", "category": "원자재 ETF", "color": "#f59e0b", "inception": "2004-11-18"},
    "SLV":  {"name": "SLV",  "name_kr": "iShares 은 현물", "category": "원자재 ETF", "color": "#94a3b8", "inception": "2006-04-21"},
    "KORU": {"name": "KORU", "name_kr": "MSCI 한국 3X", "category": "레버리지 ETF", "color": "#f97316", "inception": "2013-04-10"},
    "SOXS": {"name": "SOXS", "name_kr": "반도체 인버스 3X", "category": "인버스 ETF", "color": "#ef4444", "inception": "2010-03-11"},
    "SQQQ": {"name": "SQQQ", "name_kr": "나스닥100 인버스 3X", "category": "인버스 ETF", "color": "#dc2626", "inception": "2010-02-11"},
    "BIL":  {"name": "BIL",  "name_kr": "초단기 국채 1-3M (안전자산)", "category": "초단기채 ETF", "color": "#14b8a6", "inception": "2007-05-30"},
    "SGOV": {"name": "SGOV", "name_kr": "초단기 국채 0-3M (안전자산)", "category": "초단기채 ETF", "color": "#0ea5e9", "inception": "2020-05-26"},
    "TLT":  {"name": "TLT",  "name_kr": "미국 20년+ 장기국채", "category": "장기채 ETF", "color": "#8b5cf6", "inception": "2002-07-22"},
    "IEF":  {"name": "IEF",  "name_kr": "미국 7-10년 중기국채", "category": "중기채 ETF", "color": "#06b6d4", "inception": "2002-07-22"},
    "DBC":  {"name": "DBC",  "name_kr": "Invesco DB 원자재 지수", "category": "원자재 ETF", "color": "#eab308", "inception": "2006-02-03"},
    "005930.KS": {"name": "005930.KS", "name_kr": "삼성전자", "category": "국내주식", "color": "#1d4ed8", "inception": "1975-06-11"},
    "000660.KS": {"name": "000660.KS", "name_kr": "SK하이닉스", "category": "국내주식", "color": "#dc2626", "inception": "1996-12-26"},
    "VEA":  {"name": "VEA",  "name_kr": "Vanguard 선진국 주식 (ex-US)", "category": "해외주식 ETF", "color": "#2563eb", "inception": "2007-07-26"},
    "VWO":  {"name": "VWO",  "name_kr": "Vanguard 신흥국 주식", "category": "해외주식 ETF", "color": "#db2777", "inception": "2005-03-10"},
    "BND":  {"name": "BND",  "name_kr": "Vanguard 미국 종합채권", "category": "채권 ETF", "color": "#4f46e5", "inception": "2007-04-10"},
    "EFA":  {"name": "EFA",  "name_kr": "iShares 선진국 주식 (EAFE)", "category": "해외주식 ETF", "color": "#38bdf8", "inception": "2001-08-27"},
    "EEM":  {"name": "EEM",  "name_kr": "iShares 신흥국 주식 (MSCI)", "category": "해외주식 ETF", "color": "#f43f5e", "inception": "2003-04-14"},
    "AGG":  {"name": "AGG",  "name_kr": "iShares 미국 종합채권", "category": "채권 ETF", "color": "#6366f1", "inception": "2003-09-29"},
    "LQD":  {"name": "LQD",  "name_kr": "iShares 미국 투자등급 회사채", "category": "채권 ETF", "color": "#8b5cf6", "inception": "2002-07-30"},
    "TIP":  {"name": "TIP",  "name_kr": "iShares 미국 물가연동채 (TIPS)", "category": "채권 ETF", "color": "#10b981", "inception": "2003-12-05"},
    "IWM":  {"name": "IWM",  "name_kr": "iShares 러셀 2000 소형주", "category": "지수 ETF", "color": "#ea580c", "inception": "2000-05-26"},
    "VNQ":  {"name": "VNQ",  "name_kr": "Vanguard 미국 리츠/부동산", "category": "부동산 ETF", "color": "#d97706", "inception": "2004-09-29"},
    "SHY":  {"name": "SHY",  "name_kr": "iShares 미국 단기국채 1-3Y", "category": "단기채 ETF", "color": "#14b8a6", "inception": "2002-07-30"}
}

ALL_TICKERS = list(TICKER_INFO.keys())
PROXIES = ['^NDX', '^SOX', '^GSPC', '^TYX', '^TNX', '^IRX', 'GC=F', 'CL=F']
ALL_DOWNLOAD_TICKERS = sorted(list(set(ALL_TICKERS + PROXIES)))
SAFE_PROXY = "BIL"
BUNDLED_CACHE_FILE = os.path.join(os.path.dirname(__file__), "data_cache.csv")
CACHE_FILE = "/tmp/data_cache.csv" if os.environ.get("VERCEL") else BUNDLED_CACHE_FILE

# ── 전역 상태 ──────────────────────────────────────────────
_data: pd.DataFrame | None = None
_data_status = {
    "ready": False,
    "loading": False,
    "error": None,
    "source": "Yahoo Finance",
    "updated_at": None,
    "start_date": None,
    "end_date": None,
    "row_count": 0
}
_lock = threading.Lock()


# ── 동적 종목 다운로드 및 캐시 통합 ────────────────────────────
def _ensure_tickers_loaded(tickers: list[str]):
    """
    주어진 티커 목록 중 _data에 없는 티커가 있다면 Yahoo Finance에서 다운로드하여
    _data에 병합하고 data_cache.csv를 갱신합니다.
    """
    global _data
    with _lock:
        if _data is None:
            return
        current_cols = set(_data.columns)
        missing = [t.upper().strip() for t in tickers if t.upper().strip() not in current_cols]
    
    if not missing:
        return

    print(f"[YAHOO FINANCE] 추가 티커 동적 다운로드 진행: {missing}")
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    try:
        raw = yf.download(
            tickers=missing,
            start="2007-01-01",
            end=today_str,
            auto_adjust=True,
            progress=False
        )
        if isinstance(raw.columns, pd.MultiIndex):
            if 'Close' in raw.columns.levels[0]:
                new_df = raw['Close'].copy()
            else:
                new_df = raw.xs('Close', axis=1, level=0).copy()
        else:
            new_df = raw.copy()

        # 만약 단일 티커라 Series인 경우 DataFrame 변환
        if isinstance(new_df, pd.Series):
            new_df = new_df.to_frame(name=missing[0])
        elif len(missing) == 1 and len(new_df.columns) == 1:
            new_df.columns = missing

        new_df.index = pd.to_datetime(new_df.index)
        new_df.ffill(inplace=True)

        with _lock:
            for col in new_df.columns:
                col_name = str(col).strip()
                _data[col_name] = new_df[col]
            _data.ffill(inplace=True)
            _data.to_csv(CACHE_FILE)
            print(f"[CACHE] 추가 티커 반영 및 CSV 저장 완료. 전체 컬럼: {list(_data.columns)}")
    except Exception as e:
        print(f"[ERROR] 추가 티커 다운로드 중 오류: {e}")
        # 오류가 나더라도 이미 캐시에 존재하는 티커는 사용 가능하게 함


# ── 레버리지 ETF 및 자산 배분 ETF 상장 전 가상 데이터 합성 (Synthetic Stitching) ──
def _synthesize_leverage_etfs(df: pd.DataFrame) -> pd.DataFrame:
    """
    Yahoo Finance 기초 지수(^NDX, ^SOX, ^GSPC, ^TYX, ^TNX, ^IRX)를 활용하여
    상장 이전(Pre-Inception) 과거 결측치 구간에 대해 가상 일일 수익률을 역산(Backward Compounding) 결합합니다.
    - 2010년 이후 실제 주가(Real Post-Inception Data)는 100% 원본 그대로 보존합니다.
    - QQQ, QLD, TQQQ, SQQQ: ^NDX 일일 수익률 기반 (*1, *2, *3, *-3), 1985년 이전은 ^GSPC 기반
    - SOXX, SOXL, SOXS: ^SOX 일일 수익률 기반 (*1, *3, *-3), 1994년 이전은 ^NDX/^GSPC 기반
    - SPY: ^GSPC 일일 수익률 기반 (*1.0)
    - TLT / IEF: ^TYX(30년물, D~17) 및 ^TNX(10년물, D~7.5) 금리 변동 역산
    - GLD / DBC / SLV: 금/원자재 선물 및 헤지 프록시 역산
    - SGOV / BIL: ^IRX(13주 단기국채 금리) 기준 일일 무위험 수익률 역산
    """
    df = df.copy()

    def _backward_compound(s_col: str, r_series: pd.Series, mult: float = 1.0, clamp_min: float = -0.99):
        if s_col not in df.columns:
            return
        # Yahoo Finance 배당/감자 보정 오류로 발생한 0 이하(음수) 가격을 결측치(NaN)로 초기화
        df.loc[df[s_col] <= 0, s_col] = np.nan
        first_idx = df[s_col].first_valid_index()
        if first_idx is None:
            return
        loc = df.index.get_loc(first_idx)
        for i in range(loc - 1, -1, -1):
            r = r_series.iloc[i + 1] if i + 1 < len(r_series) else 0.0
            if pd.isna(r) or np.isinf(r):
                df.loc[df.index[i], s_col] = df.loc[df.index[i + 1], s_col]
            else:
                r_eff = max(clamp_min, r * mult)
                df.loc[df.index[i], s_col] = df.loc[df.index[i + 1], s_col] / (1.0 + r_eff)

    # 0. S&P 500 마스터 지수
    gspc_r = df['^GSPC'].pct_change() if '^GSPC' in df.columns else None

    # 1. ^NDX (1985 이전 구간 ^GSPC 역산)
    if '^NDX' in df.columns and gspc_r is not None:
        _backward_compound('^NDX', gspc_r, mult=1.1)
    ndx_r = df['^NDX'].pct_change() if '^NDX' in df.columns else gspc_r

    # 2. ^SOX (1994 이전 구간 ^NDX 역산)
    if '^SOX' in df.columns and ndx_r is not None:
        _backward_compound('^SOX', ndx_r, mult=1.2)
    sox_r = df['^SOX'].pct_change() if '^SOX' in df.columns else ndx_r

    # 3. 미국 주식 및 나스닥 레버리지 ETF
    if gspc_r is not None:
        _backward_compound('SPY', gspc_r, mult=1.0)
    if ndx_r is not None:
        _backward_compound('QQQ', ndx_r, mult=1.0)
        _backward_compound('QLD', ndx_r, mult=2.0)
        _backward_compound('TQQQ', ndx_r, mult=3.0)
        _backward_compound('SQQQ', ndx_r, mult=-3.0)

    # 4. 반도체 레버리지 ETF
    if sox_r is not None:
        _backward_compound('SOXX', sox_r, mult=1.0)
        _backward_compound('SOXL', sox_r, mult=3.0)
        _backward_compound('SOXS', sox_r, mult=-3.0)

    # 5. 안전자산 BIL & SGOV (^IRX 13주 단기국채 금리 역산)
    if '^IRX' in df.columns:
        irx = df['^IRX'].ffill().bfill() / 100.0
        daily_safe_r = (1.0 + np.maximum(0.0001, irx)) ** (1.0 / 252.0) - 1.0
        _backward_compound('BIL', daily_safe_r, mult=1.0)
    elif 'BIL' in df.columns:
        daily_safe_r = pd.Series((1.0 + 0.028) ** (1.0 / 252.0) - 1.0, index=df.index)
        _backward_compound('BIL', daily_safe_r, mult=1.0)

    if 'BIL' in df.columns:
        bil_r = df['BIL'].pct_change()
        _backward_compound('SGOV', bil_r, mult=1.0)

    # 6. 국채 ETF (TLT, IEF)
    if '^TYX' in df.columns:
        tyx = df['^TYX'].ffill().bfill() / 100.0
        tlt_synth_r = -17.0 * tyx.diff() + (tyx.shift(1) / 252.0)
        _backward_compound('TLT', tlt_synth_r, mult=1.0)
    elif '^TNX' in df.columns:
        tnx = df['^TNX'].ffill().bfill() / 100.0
        tlt_synth_r = -17.0 * tnx.diff() + (tnx.shift(1) / 252.0)
        _backward_compound('TLT', tlt_synth_r, mult=1.0)

    if '^TNX' in df.columns:
        tnx = df['^TNX'].ffill().bfill() / 100.0
        ief_synth_r = -7.5 * tnx.diff() + (tnx.shift(1) / 252.0)
        _backward_compound('IEF', ief_synth_r, mult=1.0)

    # 7. 원자재 & 대체자산 (GLD, DBC, SLV, KORU)
    if 'GC=F' in df.columns:
        _backward_compound('GLD', df['GC=F'].pct_change(), mult=1.0)
    if gspc_r is not None:
        _backward_compound('GLD', gspc_r, mult=0.2)
    if 'CL=F' in df.columns:
        _backward_compound('DBC', df['CL=F'].pct_change(), mult=0.6)
    if gspc_r is not None:
        _backward_compound('DBC', gspc_r, mult=0.5)
    if 'GLD' in df.columns:
        _backward_compound('SLV', df['GLD'].pct_change(), mult=1.2)
    if gspc_r is not None:
        _backward_compound('KORU', gspc_r, mult=3.0)

    # 8. 국내 주식
    if gspc_r is not None:
        _backward_compound('005930.KS', gspc_r, mult=1.2)
    if sox_r is not None:
        _backward_compound('000660.KS', sox_r, mult=1.3)

    return df


# ── 데이터 로드 & 전처리 (Yahoo Finance 연동) ────────────────
def _load_or_fetch_data(force_download=False):
    global _data
    with _lock:
        if _data_status["loading"]:
            return
        _data_status["loading"] = True
        _data_status["error"] = None

    try:
        df = None
        # 1. 로컬 캐시 확인 (Vercel 임시 캐시 -> 내장 캐시 순으로 읽기)
        cache_path = CACHE_FILE if os.path.exists(CACHE_FILE) else BUNDLED_CACHE_FILE
        if not force_download and os.path.exists(cache_path):
            try:
                df = pd.read_csv(cache_path, index_col=0, parse_dates=True)
                # 주요 티커 컬럼이 존재하는지 검증
                if all(t in df.columns for t in ['TQQQ', 'SOXL', 'BIL']):
                    if (df <= 0).any().any():
                        df = _synthesize_leverage_etfs(df)
                        try:
                            df.to_csv(CACHE_FILE)
                        except Exception:
                            pass
                    print(f"[CACHE] 로컬 캐시에서 데이터 로드 완료 ({len(df)} 행)")
                else:
                    df = None
            except Exception as e:
                print(f"[CACHE] 캐시 파일 읽기 실패: {e}")
                df = None

        # 2. 없거나 강제 다운로드 시 Yahoo Finance API 직접 수집 (1970-01-01부터)
        if df is None:
            print(f"[YAHOO FINANCE] yfinance 라이브러리를 통해 {len(ALL_DOWNLOAD_TICKERS)}개 ETF/종목 다운로드 시작 (1970-01-01 ~ 현재)...")
            today_str = datetime.date.today().strftime('%Y-%m-%d')
            
            raw = yf.download(
                tickers=ALL_DOWNLOAD_TICKERS,
                start="1970-01-01",
                end=today_str,
                auto_adjust=True,
                progress=False
            )

            if isinstance(raw.columns, pd.MultiIndex):
                if 'Close' in raw.columns.levels[0]:
                    df = raw['Close'].copy()
                else:
                    df = raw.xs('Close', axis=1, level=0).copy()
            else:
                df = raw.copy()

            # 전방향 보간 (휴일 처리)
            df.ffill(inplace=True)

            # 레버리지 ETF 상장 전 가상 데이터 역산 및 합성
            df = _synthesize_leverage_etfs(df)

            # CSV 캐시 저장
            try:
                df.to_csv(CACHE_FILE)
                print(f"[CACHE] Yahoo Finance 데이터 CSV 저장 완료: {CACHE_FILE}")
            except Exception as e:
                print(f"[CACHE] CSV 저장 실패: {e}")

        # 정렬 및 인덱스 정리
        df.index = pd.to_datetime(df.index)
        df.sort_index(inplace=True)

        with _lock:
            _data = df
            _data_status["ready"] = True
            _data_status["loading"] = False
            _data_status["source"] = "Yahoo Finance (Synthetic & Auto Adjusted)"
            _data_status["updated_at"] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            _data_status["start_date"] = df.index[0].strftime('%Y-%m-%d')
            _data_status["end_date"] = df.index[-1].strftime('%Y-%m-%d')
            _data_status["row_count"] = len(df)

        print(f"[READY] Yahoo Finance 데이터 로드 완료: {_data_status['start_date']} ~ {_data_status['end_date']} (총 {len(df)} 거래일)")

    except Exception as e:
        with _lock:
            _data_status["ready"] = False
            _data_status["loading"] = False
            _data_status["error"] = str(e)
        print(f"[ERROR] Yahoo Finance 데이터 수집 실패: {e}")


# ── 연도별 MDD 및 최악의 해 계산 ─────────────────────────────
def _calc_worst_year_mdd(values: np.ndarray, dates: pd.DatetimeIndex):
    """
    각 연도별로 독립적인 MDD를 산출하여, 가장 낙폭이 심했던 최악의 해(Worst Year)와 그 해의 MDD를 반환
    """
    df_temp = pd.DataFrame({'val': values}, index=dates)
    years = sorted(list(set(dates.year)))
    
    worst_year = None
    worst_mdd = 0.0
    yearly_mdds = {}

    for yr in years:
        yr_vals = df_temp[df_temp.index.year == yr]['val'].values
        if len(yr_vals) < 2:
            continue
        peaks = np.maximum.accumulate(yr_vals)
        dd = (yr_vals - peaks) / peaks
        yr_mdd = float(np.min(dd)) * 100.0
        yearly_mdds[yr] = round(yr_mdd, 2)
        if yr_mdd < worst_mdd:
            worst_mdd = yr_mdd
            worst_year = yr

    return worst_year, round(worst_mdd, 2), yearly_mdds


# ── 보조 퀀트 지표 연산 (TR, CAGR, MDD, MAR, 최악의 해의 MDD) ─────
def _calc_perf_metrics(values: np.ndarray, invested: np.ndarray, dates: pd.DatetimeIndex, daily_ret: np.ndarray):
    n = len(values)
    if n < 2:
        return {}

    final_val = float(values[-1])
    total_inv = float(invested[-1])
    net_profit = final_val - total_inv
    
    # 1. TR (Total Return, 총 누적 수익률 %)
    total_ret_pct = (net_profit / total_inv) * 100.0 if total_inv > 0 else 0.0

    days = (dates[-1] - dates[0]).days
    years = max(days / 365.25, 0.08)

    # 2. CAGR (연평균 복리 수익률 %) - TWRR 연환산 기하평균 (장기 시계열 부동소수점 언더플로 방지를 위해 log-sum 사용)
    mean_daily = np.mean(daily_ret)
    std_daily = np.std(daily_ret)
    log_growth = np.sum(np.log(np.maximum(1e-12, 1.0 + daily_ret)))
    prod_growth = float(np.exp(log_growth))
    twrr_cagr = (prod_growth ** (252.0 / n) - 1.0) * 100.0 if n > 0 and prod_growth > 0 else 0.0

    # 3. MDD (전체 기간 최대 낙폭 %)
    peaks = np.maximum.accumulate(values)
    dd = (values - peaks) / peaks
    mdd_pct = float(np.min(dd)) * 100.0

    # 4. MAR Ratio (CAGR / |MDD|)
    mar_ratio = abs(twrr_cagr / mdd_pct) if abs(mdd_pct) > 0.01 else 0.0

    # 5. 최악의 해의 MDD (Worst Year MDD)
    worst_year, worst_year_mdd, yearly_mdds = _calc_worst_year_mdd(values, dates)

    # 6. 연율화 변동성 & 위험조정지수
    vol_ann = float(std_daily * np.sqrt(252.0)) * 100.0
    rf_daily = 0.025 / 252.0
    excess_ret = daily_ret - rf_daily
    excess_std = np.std(excess_ret)
    sharpe = float(np.mean(excess_ret) / excess_std * np.sqrt(252.0)) if excess_std > 1e-8 else 0.0

    downside_ret = np.where(excess_ret < 0, excess_ret, 0)
    downside_std = np.std(downside_ret)
    sortino = float(np.mean(excess_ret) / downside_std * np.sqrt(252.0)) if downside_std > 1e-8 else 0.0

    return {
        "final_value": round(final_val),
        "total_invested": round(total_inv),
        "net_profit": round(net_profit),
        "tr_pct": round(total_ret_pct, 2),            # TR (Total Return)
        "total_return_pct": round(total_ret_pct, 2),  # 호환성 유지
        "cagr_pct": round(twrr_cagr, 2),              # 연평균 CAGR
        "mdd_pct": round(mdd_pct, 2),                # 전체 MDD
        "worst_year": worst_year,                     # 최악의 해 (예: 2022)
        "worst_year_mdd_pct": worst_year_mdd,        # 최악의 해의 MDD (%)
        "mar_ratio": round(mar_ratio, 2),             # MAR (CAGR / |MDD|)
        "volatility_pct": round(vol_ann, 2),
        "sharpe": round(sharpe, 2),
        "sharpe_ratio": round(sharpe, 2),
        "sortino": round(sortino, 2),
        "years": round(years, 1),
        "yearly_mdds": yearly_mdds
    }


# ── 영구 포트폴리오 (Harry Browne Permanent Portfolio) 백테스트 엔진 ──
def _run_permanent_portfolio_backtest(
    w_spy: float = 0.25,
    w_tlt: float = 0.25,
    w_gld: float = 0.25,
    w_bil: float = 0.25,
    init_cap: float = 50000000,
    monthly_add: float = 500000,
    rebal_months: int = 12,
    season_months: list[int] = None,
    start_date: str = None,
    end_date: str = None,
    fee_rate: float = 0.001
):
    if _data is None:
        raise ValueError("데이터셋이 아직 준비되지 않았습니다.")

    if season_months is None:
        season_months = list(range(1, 13))
    else:
        season_months = [int(m) for m in season_months]

    req_tickers = ['SPY', 'TLT', 'GLD', 'BIL']
    for t in req_tickers:
        if t not in _data.columns:
            raise ValueError(f"영구 포트폴리오 필수 티커 {t} 가 데이터셋에 없습니다.")

    sub_df = _data[req_tickers].dropna().copy()
    if len(sub_df) < 20:
        raise ValueError("분석에 필요한 충분한 데이터가 없습니다.")

    avail_min = sub_df.index[0]
    avail_max = sub_df.index[-1]

    # 시작일 필터링 (1970년 1월 1일부터 지원)
    if start_date:
        s_ts = pd.Timestamp(start_date)
        if s_ts > avail_max:
            raise ValueError(f"시작일({start_date})이 데이터 마지막 날({avail_max.strftime('%Y-%m-%d')})보다 늦습니다.")
        if s_ts < avail_min:
            s_ts = avail_min
        sub_df = sub_df[sub_df.index >= s_ts]

    # 종료일 필터링
    if end_date:
        e_ts = pd.Timestamp(end_date)
        if e_ts < sub_df.index[0]:
            raise ValueError(f"종료일({end_date})이 시작일({sub_df.index[0].strftime('%Y-%m-%d')})보다 빠릅니다.")
        sub_df = sub_df[sub_df.index <= e_ts]

    n = len(sub_df)
    if n < 15:
        raise ValueError(f"선택한 기간 내 거래일이 너무 적습니다 (최소 15 거래일 필요, 현재 {n}일).")

    dates = sub_df.index
    months = dates.month

    # 비중 정규화 (합이 1이 되도록)
    total_w = w_spy + w_tlt + w_gld + w_bil
    if total_w <= 0:
        w_spy, w_tlt, w_gld, w_bil = 0.25, 0.25, 0.25, 0.25
        total_w = 1.0
    w_spy /= total_w
    w_tlt /= total_w
    w_gld /= total_w
    w_bil /= total_w

    p_spy = sub_df['SPY'].values
    p_tlt = sub_df['TLT'].values
    p_gld = sub_df['GLD'].values
    p_bil = sub_df['BIL'].values

    r_spy = np.zeros(n)
    r_tlt = np.zeros(n)
    r_gld = np.zeros(n)
    r_bil = np.zeros(n)

    r_spy[1:] = (p_spy[1:] / p_spy[:-1]) - 1.0
    r_tlt[1:] = (p_tlt[1:] / p_tlt[:-1]) - 1.0
    r_gld[1:] = (p_gld[1:] / p_gld[:-1]) - 1.0
    r_bil[1:] = (p_bil[1:] / p_bil[:-1]) - 1.0

    # 포트폴리오 자산별 가치 추적
    # 1. 영구 포트폴리오 (계절성 반영: 매수월 vs 파킹월)
    is_init_bull = (months[0] in season_months)
    if is_init_bull:
        v_spy = init_cap * w_spy
        v_tlt = init_cap * w_tlt
        v_gld = init_cap * w_gld
        v_bil = init_cap * w_bil
        v_safe = 0.0
        prev_mode = "BULL"
    else:
        v_spy, v_tlt, v_gld, v_bil = 0.0, 0.0, 0.0, 0.0
        v_safe = init_cap
        prev_mode = "SAFE"

    # 2. 벤치마크 1: S&P 500 (SPY 100%)
    v_bm_spy = init_cap

    # 3. 벤치마크 2: 전통 60/40 (SPY 60% + TLT 40%)
    v_6040_spy = init_cap * 0.6
    v_6040_tlt = init_cap * 0.4

    port_val = np.zeros(n)
    bm_spy_val = np.zeros(n)
    bm_6040_val = np.zeros(n)
    invested = np.zeros(n)

    port_daily_r = np.zeros(n)
    bm_spy_daily_r = np.zeros(n)
    bm_6040_daily_r = np.zeros(n)

    curr_inv = init_cap
    port_val[0] = v_spy + v_tlt + v_gld + v_bil + v_safe
    bm_spy_val[0] = v_bm_spy
    bm_6040_val[0] = v_6040_spy + v_6040_tlt
    invested[0] = curr_inv

    curr_month = months[0]
    months_elapsed_perm = 0
    months_elapsed_6040 = 0
    total_rebalances_perm = 0

    for i in range(1, n):
        m = months[i]

        # ── 월 첫 거래일 처리 (적립금 투입 + 계절성 스위칭 + 리밸런싱 판별) ──
        if m != curr_month:
            curr_month = m
            curr_inv += monthly_add

            # 벤치마크 적립금
            v_bm_spy += monthly_add
            v_6040_spy += monthly_add * 0.6
            v_6040_tlt += monthly_add * 0.4

            # 60/40 리밸런싱
            months_elapsed_6040 += 1
            if months_elapsed_6040 >= rebal_months:
                tot_6040 = v_6040_spy + v_6040_tlt
                turnover_6040 = abs(v_6040_spy - tot_6040 * 0.6)
                tot_6040_after = tot_6040 - turnover_6040 * fee_rate
                v_6040_spy = tot_6040_after * 0.6
                v_6040_tlt = tot_6040_after * 0.4
                months_elapsed_6040 = 0

            # 영구 포트폴리오 계절성 판별
            is_bull_m = (m in season_months)
            next_mode = "BULL" if is_bull_m else "SAFE"

            if next_mode == "BULL":
                if prev_mode == "SAFE":
                    # 파킹 -> 4대 자산 스위칭 매수
                    tot_prev = (v_safe + monthly_add) * (1.0 - fee_rate)
                    v_spy = tot_prev * w_spy
                    v_tlt = tot_prev * w_tlt
                    v_gld = tot_prev * w_gld
                    v_bil = tot_prev * w_bil
                    v_safe = 0.0
                    prev_mode = "BULL"
                    months_elapsed_perm = 0
                else:
                    # 연속 보유: 적립금 투입
                    v_spy += monthly_add * w_spy
                    v_tlt += monthly_add * w_tlt
                    v_gld += monthly_add * w_gld
                    v_bil += monthly_add * w_bil
                    months_elapsed_perm += 1

                    if months_elapsed_perm >= rebal_months:
                        tot_p = v_spy + v_tlt + v_gld + v_bil
                        target_spy = tot_p * w_spy
                        target_tlt = tot_p * w_tlt
                        target_gld = tot_p * w_gld
                        target_bil = tot_p * w_bil

                        turnover = (abs(v_spy - target_spy) + abs(v_tlt - target_tlt) + abs(v_gld - target_gld) + abs(v_bil - target_bil)) / 2.0
                        fee = turnover * fee_rate
                        tot_p_after = tot_p - fee

                        v_spy = tot_p_after * w_spy
                        v_tlt = tot_p_after * w_tlt
                        v_gld = tot_p_after * w_gld
                        v_bil = tot_p_after * w_bil

                        months_elapsed_perm = 0
                        total_rebalances_perm += 1
            else:
                if prev_mode == "BULL":
                    # 4대 자산 전량 매도 -> 안전자산 100% 파킹
                    tot_prev = (v_spy + v_tlt + v_gld + v_bil) * (1.0 - fee_rate) + monthly_add
                    v_safe = tot_prev
                    v_spy, v_tlt, v_gld, v_bil = 0.0, 0.0, 0.0, 0.0
                    prev_mode = "SAFE"
                    months_elapsed_perm = 0
                else:
                    v_safe += monthly_add

        # ── 일일 가격 변동 반영 ──
        prev_p = v_spy + v_tlt + v_gld + v_bil + v_safe
        if prev_mode == "BULL":
            v_spy *= (1.0 + r_spy[i])
            v_tlt *= (1.0 + r_tlt[i])
            v_gld *= (1.0 + r_gld[i])
            v_bil *= (1.0 + r_bil[i])
        else:
            v_safe *= (1.0 + r_bil[i])
        curr_p = v_spy + v_tlt + v_gld + v_bil + v_safe

        port_val[i] = curr_p
        port_daily_r[i] = (curr_p / prev_p - 1.0) if prev_p > 0 else 0.0

        prev_bm = v_bm_spy
        v_bm_spy *= (1.0 + r_spy[i])
        bm_spy_val[i] = v_bm_spy
        bm_spy_daily_r[i] = (v_bm_spy / prev_bm - 1.0) if prev_bm > 0 else 0.0

        prev_6040 = v_6040_spy + v_6040_tlt
        v_6040_spy *= (1.0 + r_spy[i])
        v_6040_tlt *= (1.0 + r_tlt[i])
        curr_6040 = v_6040_spy + v_6040_tlt
        bm_6040_val[i] = curr_6040
        bm_6040_daily_r[i] = (curr_6040 / prev_6040 - 1.0) if prev_6040 > 0 else 0.0

        invested[i] = curr_inv

    # 성과 지표 산출
    port_metrics = _calc_perf_metrics(port_val, invested, dates, port_daily_r[1:])
    bm_spy_metrics = _calc_perf_metrics(bm_spy_val, invested, dates, bm_spy_daily_r[1:])
    bm_6040_metrics = _calc_perf_metrics(bm_6040_val, invested, dates, bm_6040_daily_r[1:])

    # MDD 시계열
    p_peaks = np.maximum.accumulate(port_val)
    port_dd = ((port_val - p_peaks) / p_peaks) * 100.0

    spy_peaks = np.maximum.accumulate(bm_spy_val)
    spy_dd = ((bm_spy_val - spy_peaks) / spy_peaks) * 100.0

    f6040_peaks = np.maximum.accumulate(bm_6040_val)
    f6040_dd = ((bm_6040_val - f6040_peaks) / f6040_peaks) * 100.0

    # ── 역사적 위기 구간(Crisis Periods) 하이라이트 & 방어력 분석 ──
    crisis_defs = [
        {"name": "1973 1차 오일쇼크", "desc": "스태그플레이션 & 주식 폭락", "start": "1973-10-01", "end": "1974-12-31"},
        {"name": "1987 블랙먼데이", "desc": "사상 최대 일일 주가 폭락", "start": "1987-10-01", "end": "1987-11-30"},
        {"name": "2000 닷컴 버블 붕괴", "desc": "나스닥 -80% 대폭락", "start": "2000-03-24", "end": "2002-10-09"},
        {"name": "2008 글로벌 금융위기", "desc": "서브프라임 & 리먼 파산", "start": "2007-10-09", "end": "2009-03-09"},
        {"name": "2020 코로나 쇼크", "desc": "팬데믹 단기 패닉셀", "start": "2020-02-19", "end": "2020-03-23"},
        {"name": "2022 긴축 약세장", "desc": "주식·채권 동반 하락", "start": "2022-01-03", "end": "2022-10-13"}
    ]

    df_series = pd.DataFrame({
        'port': port_val,
        'spy': bm_spy_val,
        'f6040': bm_6040_val
    }, index=dates)

    crisis_results = []
    for c in crisis_defs:
        s_d = pd.Timestamp(c['start'])
        e_d = pd.Timestamp(c['end'])
        if s_d >= dates[0] and e_d <= dates[-1]:
            c_sub = df_series.loc[(df_series.index >= s_d) & (df_series.index <= e_d)]
            if len(c_sub) > 1:
                p_ret = (c_sub['port'].iloc[-1] / c_sub['port'].iloc[0] - 1.0) * 100.0
                spy_ret = (c_sub['spy'].iloc[-1] / c_sub['spy'].iloc[0] - 1.0) * 100.0
                f6040_ret = (c_sub['f6040'].iloc[-1] / c_sub['f6040'].iloc[0] - 1.0) * 100.0

                p_pk = np.maximum.accumulate(c_sub['port'].values)
                p_mdd = float(np.min((c_sub['port'].values - p_pk) / p_pk)) * 100.0

                s_pk = np.maximum.accumulate(c_sub['spy'].values)
                s_mdd = float(np.min((c_sub['spy'].values - s_pk) / s_pk)) * 100.0

                f_pk = np.maximum.accumulate(c_sub['f6040'].values)
                f_mdd = float(np.min((c_sub['f6040'].values - f_pk) / f_pk)) * 100.0

                crisis_results.append({
                    "name": c['name'],
                    "desc": c['desc'],
                    "start": c['start'],
                    "end": c['end'],
                    "port_ret_pct": round(p_ret, 2),
                    "spy_ret_pct": round(spy_ret, 2),
                    "f6040_ret_pct": round(f6040_ret, 2),
                    "port_mdd_pct": round(p_mdd, 2),
                    "spy_mdd_pct": round(s_mdd, 2),
                    "f6040_mdd_pct": round(f_mdd, 2),
                    "defense_alpha": round(p_ret - spy_ret, 2)
                })

    # 다운샘플링 (차트 렌더링용)
    step = max(1, n // 800)
    chart_indices = list(range(0, n, step))
    if chart_indices[-1] != n - 1:
        chart_indices.append(n - 1)

    chart_dates = [dates[idx].strftime('%Y-%m-%d') for idx in chart_indices]
    chart_port_val = [round(port_val[idx]) for idx in chart_indices]
    chart_spy_val = [round(bm_spy_val[idx]) for idx in chart_indices]
    chart_6040_val = [round(bm_6040_val[idx]) for idx in chart_indices]
    chart_invested = [round(invested[idx]) for idx in chart_indices]

    chart_port_dd = [round(float(port_dd[idx]), 2) for idx in chart_indices]
    chart_spy_dd = [round(float(spy_dd[idx]), 2) for idx in chart_indices]
    chart_6040_dd = [round(float(f6040_dd[idx]), 2) for idx in chart_indices]

    return {
        "status": "success",
        "info": {
            "w_spy": round(w_spy * 100, 1),
            "w_tlt": round(w_tlt * 100, 1),
            "w_gld": round(w_gld * 100, 1),
            "w_bil": round(w_bil * 100, 1),
            "season_months": sorted(season_months),
            "rebal_months": rebal_months,
            "total_rebalances": total_rebalances_perm,
            "start_date": dates[0].strftime('%Y-%m-%d'),
            "end_date": dates[-1].strftime('%Y-%m-%d'),
            "trading_days": n,
            "fee_rate_pct": round(fee_rate * 100, 2),
            "has_synthetic": True,
            "synthetic_notice": "⚠️ 1970~2000년대 데이터는 S&P 500(^GSPC), 30년 국채수익률(^TYX), 금 선물(GC=F), 3개월 국채수익률(^IRX)을 활용해 역산 합성된 가상 데이터(Synthetic Data)입니다."
        },
        "metrics": {
            "permanent_portfolio": port_metrics,
            "sp500": bm_spy_metrics,
            "portfolio_6040": bm_6040_metrics
        },
        "chart": {
            "dates": chart_dates,
            "port_val": chart_port_val,
            "spy_val": chart_spy_val,
            "f6040_val": chart_6040_val,
            "invested": chart_invested,
            "port_dd": chart_port_dd,
            "spy_dd": chart_spy_dd,
            "f6040_dd": chart_6040_dd
        },
        "crisis_analysis": crisis_results
    }

# ── 올웨더 포트폴리오 (Ray Dalio All Weather Portfolio) 백테스트 엔진 ──
def _run_allweather_portfolio_backtest(
    w_spy: float = 0.30,
    w_tlt: float = 0.40,
    w_ief: float = 0.15,
    w_gld: float = 0.075,
    w_dbc: float = 0.075,
    init_cap: float = 50000000,
    monthly_add: float = 500000,
    rebal_months: int = 12,
    season_months: list[int] = None,
    start_date: str = None,
    end_date: str = None,
    fee_rate: float = 0.001
):
    if _data is None:
        raise ValueError("데이터셋이 아직 준비되지 않았습니다.")

    if season_months is None:
        season_months = list(range(1, 13))
    else:
        season_months = [int(m) for m in season_months]

    req_tickers = ['SPY', 'TLT', 'IEF', 'GLD', 'DBC', 'BIL']
    for t in req_tickers:
        if t not in _data.columns:
            raise ValueError(f"올웨더 포트폴리오 필수 티커 {t} 가 데이터셋에 없습니다.")

    sub_df = _data[req_tickers].dropna().copy()
    if len(sub_df) < 20:
        raise ValueError("분석에 필요한 충분한 데이터가 없습니다.")

    avail_min = sub_df.index[0]
    avail_max = sub_df.index[-1]

    # 시작일 필터링 (1970-01-01부터)
    if start_date:
        s_ts = pd.Timestamp(start_date)
        if s_ts > avail_max:
            raise ValueError(f"시작일({start_date})이 데이터 마지막 날({avail_max.strftime('%Y-%m-%d')})보다 늦습니다.")
        if s_ts < avail_min:
            s_ts = avail_min
        sub_df = sub_df[sub_df.index >= s_ts]

    # 종료일 필터링
    if end_date:
        e_ts = pd.Timestamp(end_date)
        if e_ts < sub_df.index[0]:
            raise ValueError(f"종료일({end_date})이 시작일({sub_df.index[0].strftime('%Y-%m-%d')})보다 빠릅니다.")
        sub_df = sub_df[sub_df.index <= e_ts]

    n = len(sub_df)
    if n < 15:
        raise ValueError(f"선택한 기간 내 거래일이 너무 적습니다 (최소 15 거래일 필요, 현재 {n}일).")

    dates = sub_df.index
    months = dates.month

    # 비중 정규화
    total_w = w_spy + w_tlt + w_ief + w_gld + w_dbc
    if total_w <= 0:
        w_spy, w_tlt, w_ief, w_gld, w_dbc = 0.30, 0.40, 0.15, 0.075, 0.075
        total_w = 1.0
    w_spy /= total_w
    w_tlt /= total_w
    w_ief /= total_w
    w_gld /= total_w
    w_dbc /= total_w

    p_spy = sub_df['SPY'].values
    p_tlt = sub_df['TLT'].values
    p_ief = sub_df['IEF'].values
    p_gld = sub_df['GLD'].values
    p_dbc = sub_df['DBC'].values
    p_bil = sub_df['BIL'].values

    r_spy = np.zeros(n)
    r_tlt = np.zeros(n)
    r_ief = np.zeros(n)
    r_gld = np.zeros(n)
    r_dbc = np.zeros(n)
    r_bil = np.zeros(n)

    r_spy[1:] = (p_spy[1:] / p_spy[:-1]) - 1.0
    r_tlt[1:] = (p_tlt[1:] / p_tlt[:-1]) - 1.0
    r_ief[1:] = (p_ief[1:] / p_ief[:-1]) - 1.0
    r_gld[1:] = (p_gld[1:] / p_gld[:-1]) - 1.0
    r_dbc[1:] = (p_dbc[1:] / p_dbc[:-1]) - 1.0
    r_bil[1:] = (p_bil[1:] / p_bil[:-1]) - 1.0

    # 포트폴리오 가치 추적 (계절성 스위칭 반영)
    is_init_bull = (months[0] in season_months)
    if is_init_bull:
        v_spy = init_cap * w_spy
        v_tlt = init_cap * w_tlt
        v_ief = init_cap * w_ief
        v_gld = init_cap * w_gld
        v_dbc = init_cap * w_dbc
        v_safe = 0.0
        prev_mode = "BULL"
    else:
        v_spy, v_tlt, v_ief, v_gld, v_dbc = 0.0, 0.0, 0.0, 0.0, 0.0
        v_safe = init_cap
        prev_mode = "SAFE"

    v_bm_spy = init_cap
    v_6040_spy = init_cap * 0.6
    v_6040_tlt = init_cap * 0.4

    port_val = np.zeros(n)
    bm_spy_val = np.zeros(n)
    bm_6040_val = np.zeros(n)
    invested = np.zeros(n)

    port_daily_r = np.zeros(n)
    bm_spy_daily_r = np.zeros(n)
    bm_6040_daily_r = np.zeros(n)

    curr_inv = init_cap
    port_val[0] = v_spy + v_tlt + v_ief + v_gld + v_dbc + v_safe
    bm_spy_val[0] = v_bm_spy
    bm_6040_val[0] = v_6040_spy + v_6040_tlt
    invested[0] = curr_inv

    curr_month = months[0]
    months_elapsed_all = 0
    months_elapsed_6040 = 0
    total_rebalances_all = 0

    for i in range(1, n):
        m = months[i]

        if m != curr_month:
            curr_month = m
            curr_inv += monthly_add

            v_bm_spy += monthly_add
            v_6040_spy += monthly_add * 0.6
            v_6040_tlt += monthly_add * 0.4

            months_elapsed_6040 += 1
            if months_elapsed_6040 >= rebal_months:
                tot_6040 = v_6040_spy + v_6040_tlt
                turnover_6040 = abs(v_6040_spy - tot_6040 * 0.6)
                tot_6040_after = tot_6040 - turnover_6040 * fee_rate
                v_6040_spy = tot_6040_after * 0.6
                v_6040_tlt = tot_6040_after * 0.4
                months_elapsed_6040 = 0

            # 올웨더 계절성 판별
            is_bull_m = (m in season_months)
            next_mode = "BULL" if is_bull_m else "SAFE"

            if next_mode == "BULL":
                if prev_mode == "SAFE":
                    tot_prev = (v_safe + monthly_add) * (1.0 - fee_rate)
                    v_spy = tot_prev * w_spy
                    v_tlt = tot_prev * w_tlt
                    v_ief = tot_prev * w_ief
                    v_gld = tot_prev * w_gld
                    v_dbc = tot_prev * w_dbc
                    v_safe = 0.0
                    prev_mode = "BULL"
                    months_elapsed_all = 0
                else:
                    v_spy += monthly_add * w_spy
                    v_tlt += monthly_add * w_tlt
                    v_ief += monthly_add * w_ief
                    v_gld += monthly_add * w_gld
                    v_dbc += monthly_add * w_dbc
                    months_elapsed_all += 1

                    if months_elapsed_all >= rebal_months:
                        tot_a = v_spy + v_tlt + v_ief + v_gld + v_dbc
                        target_spy = tot_a * w_spy
                        target_tlt = tot_a * w_tlt
                        target_ief = tot_a * w_ief
                        target_gld = tot_a * w_gld
                        target_dbc = tot_a * w_dbc

                        turnover = (abs(v_spy - target_spy) + abs(v_tlt - target_tlt) + abs(v_ief - target_ief) + abs(v_gld - target_gld) + abs(v_dbc - target_dbc)) / 2.0
                        fee = turnover * fee_rate
                        tot_a_after = tot_a - fee

                        v_spy = tot_a_after * w_spy
                        v_tlt = tot_a_after * w_tlt
                        v_ief = tot_a_after * w_ief
                        v_gld = tot_a_after * w_gld
                        v_dbc = tot_a_after * w_dbc

                        months_elapsed_all = 0
                        total_rebalances_all += 1
            else:
                if prev_mode == "BULL":
                    tot_prev = (v_spy + v_tlt + v_ief + v_gld + v_dbc) * (1.0 - fee_rate) + monthly_add
                    v_safe = tot_prev
                    v_spy, v_tlt, v_ief, v_gld, v_dbc = 0.0, 0.0, 0.0, 0.0, 0.0
                    prev_mode = "SAFE"
                    months_elapsed_all = 0
                else:
                    v_safe += monthly_add

        # 일일 가격 변동 반영
        prev_p = v_spy + v_tlt + v_ief + v_gld + v_dbc + v_safe
        if prev_mode == "BULL":
            v_spy *= (1.0 + r_spy[i])
            v_tlt *= (1.0 + r_tlt[i])
            v_ief *= (1.0 + r_ief[i])
            v_gld *= (1.0 + r_gld[i])
            v_dbc *= (1.0 + r_dbc[i])
        else:
            v_safe *= (1.0 + r_bil[i])
        curr_p = v_spy + v_tlt + v_ief + v_gld + v_dbc + v_safe

        port_val[i] = curr_p
        port_daily_r[i] = (curr_p / prev_p - 1.0) if prev_p > 0 else 0.0

        prev_bm = v_bm_spy
        v_bm_spy *= (1.0 + r_spy[i])
        bm_spy_val[i] = v_bm_spy
        bm_spy_daily_r[i] = (v_bm_spy / prev_bm - 1.0) if prev_bm > 0 else 0.0

        prev_6040 = v_6040_spy + v_6040_tlt
        v_6040_spy *= (1.0 + r_spy[i])
        v_6040_tlt *= (1.0 + r_tlt[i])
        curr_6040 = v_6040_spy + v_6040_tlt
        bm_6040_val[i] = curr_6040
        bm_6040_daily_r[i] = (curr_6040 / prev_6040 - 1.0) if prev_6040 > 0 else 0.0

        invested[i] = curr_inv

    # 성과 지표 산출
    port_metrics = _calc_perf_metrics(port_val, invested, dates, port_daily_r[1:])
    bm_spy_metrics = _calc_perf_metrics(bm_spy_val, invested, dates, bm_spy_daily_r[1:])
    bm_6040_metrics = _calc_perf_metrics(bm_6040_val, invested, dates, bm_6040_daily_r[1:])

    p_peaks = np.maximum.accumulate(port_val)
    port_dd = ((port_val - p_peaks) / p_peaks) * 100.0

    spy_peaks = np.maximum.accumulate(bm_spy_val)
    spy_dd = ((bm_spy_val - spy_peaks) / spy_peaks) * 100.0

    f6040_peaks = np.maximum.accumulate(bm_6040_val)
    f6040_dd = ((bm_6040_val - f6040_peaks) / f6040_peaks) * 100.0

    # 6대 위기 구간 방어력 분석
    crisis_defs = [
        {"name": "1973 1차 오일쇼크", "desc": "스태그플레이션 & 주식 폭락", "start": "1973-10-01", "end": "1974-12-31"},
        {"name": "1987 블랙먼데이", "desc": "사상 최대 일일 주가 폭락", "start": "1987-10-01", "end": "1987-11-30"},
        {"name": "2000 닷컴 버블 붕괴", "desc": "나스닥 -80% 대폭락", "start": "2000-03-24", "end": "2002-10-09"},
        {"name": "2008 글로벌 금융위기", "desc": "서브프라임 & 리먼 파산", "start": "2007-10-09", "end": "2009-03-09"},
        {"name": "2020 코로나 쇼크", "desc": "팬데믹 단기 패닉셀", "start": "2020-02-19", "end": "2020-03-23"},
        {"name": "2022 긴축 약세장", "desc": "주식·채권 동반 하락", "start": "2022-01-03", "end": "2022-10-13"}
    ]

    df_series = pd.DataFrame({
        'port': port_val,
        'spy': bm_spy_val,
        'f6040': bm_6040_val
    }, index=dates)

    crisis_results = []
    for c in crisis_defs:
        s_d = pd.Timestamp(c['start'])
        e_d = pd.Timestamp(c['end'])
        if s_d >= dates[0] and e_d <= dates[-1]:
            c_sub = df_series.loc[(df_series.index >= s_d) & (df_series.index <= e_d)]
            if len(c_sub) > 1:
                p_ret = (c_sub['port'].iloc[-1] / c_sub['port'].iloc[0] - 1.0) * 100.0
                spy_ret = (c_sub['spy'].iloc[-1] / c_sub['spy'].iloc[0] - 1.0) * 100.0
                f6040_ret = (c_sub['f6040'].iloc[-1] / c_sub['f6040'].iloc[0] - 1.0) * 100.0

                p_pk = np.maximum.accumulate(c_sub['port'].values)
                p_mdd = float(np.min((c_sub['port'].values - p_pk) / p_pk)) * 100.0

                s_pk = np.maximum.accumulate(c_sub['spy'].values)
                s_mdd = float(np.min((c_sub['spy'].values - s_pk) / s_pk)) * 100.0

                f_pk = np.maximum.accumulate(c_sub['f6040'].values)
                f_mdd = float(np.min((c_sub['f6040'].values - f_pk) / f_pk)) * 100.0

                crisis_results.append({
                    "name": c['name'],
                    "desc": c['desc'],
                    "start": c['start'],
                    "end": c['end'],
                    "port_ret_pct": round(p_ret, 2),
                    "spy_ret_pct": round(spy_ret, 2),
                    "f6040_ret_pct": round(f6040_ret, 2),
                    "port_mdd_pct": round(p_mdd, 2),
                    "spy_mdd_pct": round(s_mdd, 2),
                    "f6040_mdd_pct": round(f_mdd, 2),
                    "defense_alpha": round(p_ret - spy_ret, 2)
                })

    step = max(1, n // 800)
    chart_indices = list(range(0, n, step))
    if chart_indices[-1] != n - 1:
        chart_indices.append(n - 1)

    chart_dates = [dates[idx].strftime('%Y-%m-%d') for idx in chart_indices]
    chart_port_val = [round(port_val[idx]) for idx in chart_indices]
    chart_spy_val = [round(bm_spy_val[idx]) for idx in chart_indices]
    chart_6040_val = [round(bm_6040_val[idx]) for idx in chart_indices]
    chart_invested = [round(invested[idx]) for idx in chart_indices]

    chart_port_dd = [round(float(port_dd[idx]), 2) for idx in chart_indices]
    chart_spy_dd = [round(float(spy_dd[idx]), 2) for idx in chart_indices]
    chart_6040_dd = [round(float(f6040_dd[idx]), 2) for idx in chart_indices]

    return {
        "status": "success",
        "info": {
            "w_spy": round(w_spy * 100, 1),
            "w_tlt": round(w_tlt * 100, 1),
            "w_ief": round(w_ief * 100, 1),
            "w_gld": round(w_gld * 100, 1),
            "w_dbc": round(w_dbc * 100, 1),
            "season_months": sorted(season_months),
            "rebal_months": rebal_months,
            "total_rebalances": total_rebalances_all,
            "start_date": dates[0].strftime('%Y-%m-%d'),
            "end_date": dates[-1].strftime('%Y-%m-%d'),
            "trading_days": n,
            "fee_rate_pct": round(fee_rate * 100, 2),
            "has_synthetic": True,
            "synthetic_notice": "⚠️ 1970~2000년대 데이터는 S&P 500(^GSPC), 30년 국채금리(^TYX), 10년 국채금리(^TNX), 금 선물(GC=F), 블룸버그/GSCI 원자재 지수를 활용해 역산 합성된 가상 데이터(Synthetic Data)입니다."
        },
        "metrics": {
            "allweather_portfolio": port_metrics,
            "sp500": bm_spy_metrics,
            "portfolio_6040": bm_6040_metrics
        },
        "chart": {
            "dates": chart_dates,
            "port_val": chart_port_val,
            "spy_val": chart_spy_val,
            "f6040_val": chart_6040_val,
            "invested": chart_invested,
            "port_dd": chart_port_dd,
            "spy_dd": chart_spy_dd,
            "f6040_dd": chart_6040_dd
        },
        "crisis_analysis": crisis_results
    }


# ── 동적 자산 배분 (Dynamic Asset Allocation) 라이브 시그널 산출 ──
def _get_dynamic_live_signal(strategy_id="BAA", target_date=None):
    if _data is None:
        raise ValueError("데이터셋이 아직 준비되지 않았습니다.")
    
    # 월말 종가 시계열 구성 + 최신 거래일 포함
    m_ends = _data.resample('ME').last()
    latest_dt = _data.index[-1]
    if latest_dt > m_ends.index[-1]:
        m_ends.loc[latest_dt] = _data.iloc[-1]
    
    idx = len(m_ends) - 1
    as_of_str = latest_dt.strftime('%Y-%m-%d')

    def r_k(t, k):
        return float(m_ends[t].iloc[idx] / m_ends[t].iloc[max(0, idx - k)] - 1.0)

    def score_13612w(t):
        p0 = m_ends[t].iloc[idx]
        return float(
            12.0 * (p0 / m_ends[t].iloc[max(0, idx - 1)] - 1.0) +
            4.0 * (p0 / m_ends[t].iloc[max(0, idx - 3)] - 1.0) +
            2.0 * (p0 / m_ends[t].iloc[max(0, idx - 6)] - 1.0) +
            1.0 * (p0 / m_ends[t].iloc[max(0, idx - 12)] - 1.0)
        )

    def score_haa(t):
        p0 = m_ends[t].iloc[idx]
        return float(
            (p0 / m_ends[t].iloc[max(0, idx - 1)] - 1.0) +
            (p0 / m_ends[t].iloc[max(0, idx - 3)] - 1.0) +
            (p0 / m_ends[t].iloc[max(0, idx - 6)] - 1.0) +
            (p0 / m_ends[t].iloc[max(0, idx - 12)] - 1.0)
        ) / 4.0

    def sma_rel(t, w=12):
        p0 = m_ends[t].iloc[idx]
        sma = float(m_ends[t].iloc[max(0, idx - w + 1) : idx + 1].mean())
        return float(p0 / sma - 1.0) if sma > 0 else 0.0

    strat_info = {
        "BAA": {"name": "Bold Asset Allocation (BAA)", "author": "Wouter Keller", "type": "카나리아 4종 모멘텀 공방 전환"},
        "HAA": {"name": "Hybrid Asset Allocation (HAA)", "author": "Wouter Keller", "type": "TIP 카나리아 하이브리드 동적 배분"},
        "LAA": {"name": "Lethargic Asset Allocation (LAA)", "author": "Wouter Keller", "type": "영구 75% + SPY 200일선 25%"},
        "RAA": {"name": "Robust Asset Allocation (RAA)", "author": "Wesley Gray", "type": "절대 모멘텀 & 12M 추세 필터"},
        "GTAA": {"name": "Global Tactical Asset Allocation (GTAA-5)", "author": "Meb Faber", "type": "5대 자산군 10M 이평 추세 추종"},
        "GEM": {"name": "Dual Momentum (GEM)", "author": "Gary Antonacci", "type": "절대 모멘텀(vs BIL) & 상대 모멘텀"}
    }

    info = strat_info.get(strategy_id, strat_info["BAA"])
    canaries = []
    regime = "RISK_ON"
    regime_badge = "🟢 공격 모드 (Risk-On)"
    rationale = ""
    portfolio = []
    target_weights = {}

    if strategy_id == "BAA":
        canary_tickers = ["SPY", "VEA", "VWO", "BND"]
        c_scores = {}
        for c in canary_tickers:
            sc = score_13612w(c)
            c_scores[c] = sc
            passed = (sc > 0)
            canaries.append({
                "ticker": c,
                "name_kr": TICKER_INFO.get(c, {}).get("name_kr", c),
                "score": round(sc, 3),
                "score_str": f"{sc:+.1%}" if abs(sc) < 10 else f"{sc:+.2f}",
                "status": "PASS" if passed else "FAIL"
            })
        
        is_risk_on = all(s > 0 for s in c_scores.values())
        if is_risk_on:
            regime = "RISK_ON"
            regime_badge = "🟢 공격 모드 (Risk-On)"
            rationale = "4대 카나리아 자산(SPY, VEA, VWO, BND)의 13612W 모멘텀이 모두 양수(> 0)이므로 공격 모드를 유지합니다."
            universe = ["QQQ", "EFA", "EEM", "AGG"]
            moms = [(t, sma_rel(t, 12)) for t in universe]
            top2 = sorted(moms, key=lambda x: x[1], reverse=True)[:2]
            target_weights = {top2[0][0]: 0.5, top2[1][0]: 0.5}
            for t, m in top2:
                portfolio.append({
                    "ticker": t,
                    "name_kr": TICKER_INFO.get(t, {}).get("name_kr", t),
                    "weight_pct": 50.0,
                    "current_price": round(float(_data[t].iloc[-1]), 2),
                    "momentum_score": f"{m:+.2%}",
                    "momentum_label": "12M 상대 모멘텀",
                    "role": "공격 자산",
                    "color": TICKER_INFO.get(t, {}).get("color", "#3b82f6")
                })
        else:
            regime = "RISK_OFF"
            regime_badge = "🛡️ 방어 모드 (Risk-Off)"
            failed_canaries = [c for c, sc in c_scores.items() if sc <= 0]
            rationale = f"카나리아 자산 중 {', '.join(failed_canaries)}의 13612W 스코어가 0 이하로 하락하여 방어 모드가 발동되었습니다."
            universe = ["TIP", "DBC", "BIL", "IEF", "TLT", "LQD", "AGG"]
            moms = [(t, sma_rel(t, 12)) for t in universe]
            bil_m = next(m for t, m in moms if t == "BIL")
            top3 = sorted(moms, key=lambda x: x[1], reverse=True)[:3]
            for t, m in top3:
                chosen = t if m >= bil_m else "BIL"
                target_weights[chosen] = target_weights.get(chosen, 0.0) + (1.0 / 3.0)
            for t, w in sorted(target_weights.items(), key=lambda x: x[1], reverse=True):
                m_val = next((m for tt, m in moms if tt == t), 0.0)
                portfolio.append({
                    "ticker": t,
                    "name_kr": TICKER_INFO.get(t, {}).get("name_kr", t),
                    "weight_pct": round(w * 100.0, 1),
                    "current_price": round(float(_data[t].iloc[-1]), 2),
                    "momentum_score": f"{m_val:+.2%}",
                    "momentum_label": "12M 상대 모멘텀",
                    "role": "방어 자산" if t != "BIL" else "현금 파킹",
                    "color": TICKER_INFO.get(t, {}).get("color", "#14b8a6")
                })

    elif strategy_id == "HAA":
        tip_s = score_haa("TIP")
        canaries.append({
            "ticker": "TIP",
            "name_kr": TICKER_INFO.get("TIP", {}).get("name_kr", "TIP"),
            "score": round(tip_s, 4),
            "score_str": f"{tip_s:+.2%}",
            "status": "PASS" if tip_s > 0 else "FAIL"
        })
        is_risk_on = (tip_s > 0)
        if is_risk_on:
            regime = "RISK_ON"
            regime_badge = "🟢 공격 모드 (Risk-On)"
            rationale = f"카나리아 TIP의 모멘텀 스코어({tip_s:+.2%})가 양수이므로 시장을 낙관적으로 판정하여 공격 자산에 투자합니다."
            universe = ["SPY", "IWM", "EFA", "EEM", "VNQ", "DBC", "IEF", "TLT"]
            scores = [(t, score_haa(t)) for t in universe]
            bil_s = score_haa("BIL")
            top4 = sorted(scores, key=lambda x: x[1], reverse=True)[:4]
            for t, s in top4:
                chosen = t if s >= bil_s else "BIL"
                target_weights[chosen] = target_weights.get(chosen, 0.0) + 0.25
            for t, w in sorted(target_weights.items(), key=lambda x: x[1], reverse=True):
                s_val = next((s for tt, s in scores if tt == t), bil_s)
                portfolio.append({
                    "ticker": t,
                    "name_kr": TICKER_INFO.get(t, {}).get("name_kr", t),
                    "weight_pct": round(w * 100.0, 1),
                    "current_price": round(float(_data[t].iloc[-1]), 2),
                    "momentum_score": f"{s_val:+.2%}",
                    "momentum_label": "HAA 1-12M 스코어",
                    "role": "공격 자산" if t != "BIL" else "현금 파킹",
                    "color": TICKER_INFO.get(t, {}).get("color", "#3b82f6")
                })
        else:
            regime = "RISK_OFF"
            regime_badge = "🛡️ 방어 모드 (Risk-Off)"
            rationale = f"카나리아 TIP의 모멘텀 스코어({tip_s:+.2%})가 0 이하로 인플레이션/실질금리 압박 신호가 감지되어 방어 모드로 전환했습니다."
            ief_s = score_haa("IEF")
            bil_s = score_haa("BIL")
            chosen = "IEF" if ief_s >= bil_s else "BIL"
            target_weights = {chosen: 1.0}
            c_score = ief_s if chosen == "IEF" else bil_s
            portfolio.append({
                "ticker": chosen,
                "name_kr": TICKER_INFO.get(chosen, {}).get("name_kr", chosen),
                "weight_pct": 100.0,
                "current_price": round(float(_data[chosen].iloc[-1]), 2),
                "momentum_score": f"{c_score:+.2%}",
                "momentum_label": "HAA 모멘텀 스코어",
                "role": "방어 채권" if chosen == "IEF" else "초단기 현금",
                "color": TICKER_INFO.get(chosen, {}).get("color", "#14b8a6")
            })

    elif strategy_id == "LAA":
        spy_curr = float(_data["SPY"].iloc[-1])
        spy_sma200 = float(_data["SPY"].iloc[-200:].mean())
        is_above = (spy_curr > spy_sma200)
        timing_pick = "QQQ" if is_above else "SHY"
        regime = "RISK_ON" if is_above else "RISK_OFF"
        regime_badge = "🟢 성장 가속 (QQQ)" if is_above else "🛡️ 방어 모드 (SHY)"
        diff_pct = (spy_curr / spy_sma200 - 1.0) * 100.0
        rationale = f"SPY 종가(${spy_curr:.2f})가 200일 이동평균선(${spy_sma200:.2f}, {diff_pct:+.2f}%) 위에 있어 타이밍 자산으로 QQQ(25%)를 보유합니다." if is_above else f"SPY 종가(${spy_curr:.2f})가 200일 이동평균선(${spy_sma200:.2f}, {diff_pct:+.2f}%) 아래로 하락하여 타이밍 자산으로 SHY(25%)를 보유합니다."
        target_weights = {"SPY": 0.25, "GLD": 0.25, "IEF": 0.25, timing_pick: 0.25}
        for t, w in target_weights.items():
            role_str = "타이밍 자산" if t == timing_pick else "핵심 영구 자산"
            portfolio.append({
                "ticker": t,
                "name_kr": TICKER_INFO.get(t, {}).get("name_kr", t),
                "weight_pct": 25.0,
                "current_price": round(float(_data[t].iloc[-1]), 2),
                "momentum_score": f"{r_k(t, 12):+.2%}",
                "momentum_label": "12M 수익률",
                "role": role_str,
                "color": TICKER_INFO.get(t, {}).get("color", "#3b82f6")
            })

    elif strategy_id == "RAA":
        universe = ["SPY", "EFA", "EEM", "VNQ", "DBC", "IEF", "TLT"]
        bil_12 = r_k("BIL", 12)
        target_weights = {}
        bil_alloc = 0.0
        base_w = 1.0 / 7.0
        half_w = base_w * 0.5
        pass_counts = 0
        for t in universe:
            r12 = r_k(t, 12)
            sma12 = float(m_ends[t].iloc[max(0, idx - 11) : idx + 1].mean())
            p0 = float(m_ends[t].iloc[idx])
            pass_abs = (r12 > bil_12)
            pass_trend = (p0 > sma12)
            w = (half_w if pass_abs else 0.0) + (half_w if pass_trend else 0.0)
            if w > 0:
                target_weights[t] = w
                pass_counts += 1
            bil_alloc += (base_w - w)
        if bil_alloc > 0:
            target_weights["BIL"] = target_weights.get("BIL", 0.0) + bil_alloc

        regime = "RISK_ON" if pass_counts >= 4 else "RISK_OFF"
        regime_badge = "⚖️ 다중 필터 분산" if pass_counts >= 4 else "🛡️ 방어적 분산"
        rationale = f"7개 자산군 중 {pass_counts}개 자산이 절대 모멘텀(vs BIL) 및 12개월 추세 필터를 통과하여 자금을 분산 배분하고, 미달 비중({bil_alloc*100:.1f}%)은 현금(BIL)에 파킹합니다."
        for t, w in sorted(target_weights.items(), key=lambda x: x[1], reverse=True):
            portfolio.append({
                "ticker": t,
                "name_kr": TICKER_INFO.get(t, {}).get("name_kr", t),
                "weight_pct": round(w * 100.0, 1),
                "current_price": round(float(_data[t].iloc[-1]), 2),
                "momentum_score": f"{r_k(t, 12):+.2%}" if t != "BIL" else f"{bil_12:+.2%}",
                "momentum_label": "12M 수익률",
                "role": "추세 자산" if t != "BIL" else "현금 파킹",
                "color": TICKER_INFO.get(t, {}).get("color", "#3b82f6")
            })

    elif strategy_id == "GTAA":
        universe = ["SPY", "EFA", "IEF", "DBC", "VNQ"]
        target_weights = {}
        bil_w = 0.0
        pass_assets = []
        for t in universe:
            sma10 = float(m_ends[t].iloc[max(0, idx - 9) : idx + 1].mean())
            p0 = float(m_ends[t].iloc[idx])
            if p0 > sma10:
                target_weights[t] = 0.2
                pass_assets.append(t)
            else:
                bil_w += 0.2
        if bil_w > 0:
            target_weights["BIL"] = bil_w

        regime = "RISK_ON" if len(pass_assets) >= 3 else "RISK_OFF"
        regime_badge = "📈 10M 추세 추종" if len(pass_assets) >= 3 else "🛡️ 추세 하회 방어"
        rationale = f"5대 글로벌 자산군 중 {len(pass_assets)}개 자산({', '.join(pass_assets) if pass_assets else '없음'})이 10개월 이동평균선을 상회하여 20%씩 보유하고, 하회 자산 비중({bil_w*100:.0f}%)은 현금(BIL)에 안전 보관합니다."
        for t, w in sorted(target_weights.items(), key=lambda x: x[1], reverse=True):
            portfolio.append({
                "ticker": t,
                "name_kr": TICKER_INFO.get(t, {}).get("name_kr", t),
                "weight_pct": round(w * 100.0, 1),
                "current_price": round(float(_data[t].iloc[-1]), 2),
                "momentum_score": f"{r_k(t, 10):+.2%}" if t != "BIL" else f"{r_k('BIL', 12):+.2%}",
                "momentum_label": "10M 모멘텀",
                "role": "추세 자산" if t != "BIL" else "현금 파킹",
                "color": TICKER_INFO.get(t, {}).get("color", "#3b82f6")
            })

    elif strategy_id == "GEM":
        spy_12 = r_k("SPY", 12)
        bil_12 = r_k("BIL", 12)
        efa_12 = r_k("EFA", 12)
        if spy_12 > bil_12:
            is_risk_on = True
            chosen = "SPY" if spy_12 >= efa_12 else "EFA"
            regime = "RISK_ON"
            regime_badge = "🟢 주식 집중 (Risk-On)"
            winner = "미국 대형주(SPY)" if chosen == "SPY" else "선진국 주식(EFA)"
            rationale = f"SPY 12개월 수익률({spy_12:+.2%})이 무위험 금리 BIL({bil_12:+.2%})을 초과하여 절대 모멘텀을 통과했으며, 상대 모멘텀 우위인 {winner}에 100% 집중 투자합니다."
            target_weights = {chosen: 1.0}
            c_score = spy_12 if chosen == "SPY" else efa_12
            portfolio.append({
                "ticker": chosen,
                "name_kr": TICKER_INFO.get(chosen, {}).get("name_kr", chosen),
                "weight_pct": 100.0,
                "current_price": round(float(_data[chosen].iloc[-1]), 2),
                "momentum_score": f"{c_score:+.2%}",
                "momentum_label": "12M 상대 모멘텀",
                "role": "주식 1위 자산",
                "color": TICKER_INFO.get(chosen, {}).get("color", "#3b82f6")
            })
        else:
            is_risk_on = False
            regime = "RISK_OFF"
            regime_badge = "🛡️ 안전채권 대피 (Risk-Off)"
            rationale = f"SPY 12개월 수익률({spy_12:+.2%})이 무위험 금리 BIL({bil_12:+.2%}) 이하로 주식시장 하락 신호가 발생하여 안전자산 AGG(100%)로 대피합니다."
            target_weights = {"AGG": 1.0}
            agg_12 = r_k("AGG", 12)
            portfolio.append({
                "ticker": "AGG",
                "name_kr": TICKER_INFO.get("AGG", {}).get("name_kr", "AGG"),
                "weight_pct": 100.0,
                "current_price": round(float(_data["AGG"].iloc[-1]), 2),
                "momentum_score": f"{agg_12:+.2%}",
                "momentum_label": "12M 수익률",
                "role": "안전자산 채권",
                "color": TICKER_INFO.get("AGG", {}).get("color", "#6366f1")
            })

    donut_labels = [p["ticker"] for p in portfolio]
    donut_weights = [p["weight_pct"] for p in portfolio]
    donut_colors = [p["color"] for p in portfolio]

    return {
        "as_of_date": as_of_str,
        "strategy_id": strategy_id,
        "strategy_name": info["name"],
        "strategy_author": info["author"],
        "strategy_type": info["type"],
        "regime": regime,
        "regime_badge": regime_badge,
        "regime_rationale": rationale,
        "canaries": canaries,
        "portfolio": portfolio,
        "donut_data": {
            "labels": donut_labels,
            "weights": donut_weights,
            "colors": donut_colors
        }
    }


# ── 동적 자산 배분 (Dynamic Asset Allocation) 백테스트 엔진 ───────
def _run_dynamic_allocation_backtest(
    strategy_id: str = "BAA",
    benchmark_id: str = "SPY",
    init_cap: float = 50000000,
    monthly_add: float = 500000,
    start_date: str = "1970-01-01",
    end_date: str = None,
    fee_rate: float = 0.001
):
    if _data is None:
        raise ValueError("데이터셋이 아직 준비되지 않았습니다.")

    sub_df = _data.copy()
    avail_min = sub_df.index[0]
    avail_max = sub_df.index[-1]

    s_ts = pd.Timestamp(start_date) if start_date else avail_min
    if s_ts < avail_min:
        s_ts = avail_min
    if s_ts > avail_max:
        raise ValueError("시작일이 데이터 마지막 날보다 늦습니다.")

    e_ts = pd.Timestamp(end_date) if end_date else avail_max
    if e_ts > avail_max:
        e_ts = avail_max

    sub_df = sub_df[(sub_df.index >= s_ts) & (sub_df.index <= e_ts)]
    if len(sub_df) < 20:
        raise ValueError("분석에 필요한 충분한 데이터가 없습니다.")

    dates = sub_df.index
    n = len(dates)
    months = dates.month

    # 전체 데이터셋 기준 월말 종가 시계열 (12개월 이전 룩백 보장)
    m_ends_all = _data.resample('ME').last()

    def r_k(t, idx, k):
        return float(m_ends_all[t].iloc[idx] / m_ends_all[t].iloc[max(0, idx - k)] - 1.0)
    
    def score_13612w(t, idx):
        p0 = m_ends_all[t].iloc[idx]
        return float(
            12.0 * (p0 / m_ends_all[t].iloc[max(0, idx - 1)] - 1.0) +
            4.0 * (p0 / m_ends_all[t].iloc[max(0, idx - 3)] - 1.0) +
            2.0 * (p0 / m_ends_all[t].iloc[max(0, idx - 6)] - 1.0) +
            1.0 * (p0 / m_ends_all[t].iloc[max(0, idx - 12)] - 1.0)
        )
        
    def score_haa(t, idx):
        p0 = m_ends_all[t].iloc[idx]
        return float(
            (p0 / m_ends_all[t].iloc[max(0, idx - 1)] - 1.0) +
            (p0 / m_ends_all[t].iloc[max(0, idx - 3)] - 1.0) +
            (p0 / m_ends_all[t].iloc[max(0, idx - 6)] - 1.0) +
            (p0 / m_ends_all[t].iloc[max(0, idx - 12)] - 1.0)
        ) / 4.0

    def sma_rel(t, idx, w=12):
        p0 = m_ends_all[t].iloc[idx]
        sma = float(m_ends_all[t].iloc[max(0, idx - w + 1) : idx + 1].mean())
        return float(p0 / sma - 1.0) if sma > 0 else 0.0

    # 시뮬레이션 배열
    strat_val = np.zeros(n)
    bench_val = np.zeros(n)
    invested = np.zeros(n)
    strat_daily_r = np.zeros(n)
    bench_daily_r = np.zeros(n)

    curr_strat = init_cap
    curr_bench = init_cap
    curr_inv = init_cap

    strat_val[0] = curr_strat
    bench_val[0] = curr_bench
    invested[0] = curr_inv

    # 벤치마크 초기 포지션
    is_bm_6040 = (benchmark_id == "6040")
    if is_bm_6040:
        bm_v_spy = init_cap * 0.6
        bm_v_ief = init_cap * 0.4
    else:
        bm_v_spy = init_cap
        bm_v_ief = 0.0

    curr_weights = {"BIL": 1.0}
    weights_history_records = []
    total_rebalances = 0

    curr_m = dates[0].month

    for i in range(1, n):
        d = dates[i]
        m = months[i]

        # 월 첫 거래일 처리: 리밸런싱 판별 & 적립금 투입
        if m != curr_m:
            curr_m = m
            curr_inv += monthly_add
            curr_strat += monthly_add
            curr_bench += monthly_add

            if is_bm_6040:
                bm_v_spy += monthly_add * 0.6
                bm_v_ief += monthly_add * 0.4
            else:
                bm_v_spy += monthly_add

            # 전월 말 시점의 m_ends_all 인덱스 찾기
            m_idx = m_ends_all.index.searchsorted(d) - 1
            target_w = {}

            if m_idx >= 12:
                if strategy_id == "BAA":
                    canaries = ["SPY", "VEA", "VWO", "BND"]
                    c_scores = [score_13612w(c, m_idx) for c in canaries]
                    if all(s > 0 for s in c_scores):
                        universe = ["QQQ", "EFA", "EEM", "AGG"]
                        moms = [(t, sma_rel(t, m_idx, 12)) for t in universe]
                        top2 = sorted(moms, key=lambda x: x[1], reverse=True)[:2]
                        target_w = {top2[0][0]: 0.5, top2[1][0]: 0.5}
                    else:
                        universe = ["TIP", "DBC", "BIL", "IEF", "TLT", "LQD", "AGG"]
                        moms = [(t, sma_rel(t, m_idx, 12)) for t in universe]
                        bil_m = next(mm for tt, mm in moms if tt == "BIL")
                        top3 = sorted(moms, key=lambda x: x[1], reverse=True)[:3]
                        for t, mm in top3:
                            chosen = t if mm >= bil_m else "BIL"
                            target_w[chosen] = target_w.get(chosen, 0.0) + (1.0 / 3.0)

                elif strategy_id == "HAA":
                    tip_s = score_haa("TIP", m_idx)
                    if tip_s > 0:
                        universe = ["SPY", "IWM", "EFA", "EEM", "VNQ", "DBC", "IEF", "TLT"]
                        scores = [(t, score_haa(t, m_idx)) for t in universe]
                        bil_s = score_haa("BIL", m_idx)
                        top4 = sorted(scores, key=lambda x: x[1], reverse=True)[:4]
                        for t, s in top4:
                            chosen = t if s >= bil_s else "BIL"
                            target_w[chosen] = target_w.get(chosen, 0.0) + 0.25
                    else:
                        ief_s = score_haa("IEF", m_idx)
                        bil_s = score_haa("BIL", m_idx)
                        target_w = {"IEF": 1.0} if ief_s >= bil_s else {"BIL": 1.0}

                elif strategy_id == "LAA":
                    spy_curr = float(_data["SPY"].iloc[_data.index.get_loc(dates[i - 1])])
                    loc_d = _data.index.get_loc(dates[i - 1])
                    spy_sma200 = float(_data["SPY"].iloc[max(0, loc_d - 200) : loc_d].mean())
                    timing = "QQQ" if spy_curr > spy_sma200 else "SHY"
                    target_w = {"SPY": 0.25, "GLD": 0.25, "IEF": 0.25, timing: 0.25}

                elif strategy_id == "RAA":
                    univ = ["SPY", "EFA", "EEM", "VNQ", "DBC", "IEF", "TLT"]
                    bil_12 = r_k("BIL", m_idx, 12)
                    bil_alloc = 0.0
                    base_w = 1.0 / 7.0
                    half_w = base_w * 0.5
                    for t in univ:
                        pass_abs = (r_k(t, m_idx, 12) > bil_12)
                        pass_sma = (m_ends_all[t].iloc[m_idx] > m_ends_all[t].iloc[max(0, m_idx - 11) : m_idx + 1].mean())
                        w = (half_w if pass_abs else 0.0) + (half_w if pass_sma else 0.0)
                        if w > 0:
                            target_w[t] = w
                        bil_alloc += (base_w - w)
                    if bil_alloc > 0:
                        target_w["BIL"] = target_w.get("BIL", 0.0) + bil_alloc

                elif strategy_id == "GTAA":
                    univ = ["SPY", "EFA", "IEF", "DBC", "VNQ"]
                    bil_w = 0.0
                    for t in univ:
                        sma10 = float(m_ends_all[t].iloc[max(0, m_idx - 9) : m_idx + 1].mean())
                        if m_ends_all[t].iloc[m_idx] > sma10:
                            target_w[t] = 0.2
                        else:
                            bil_w += 0.2
                    if bil_w > 0:
                        target_w["BIL"] = bil_w

                elif strategy_id == "GEM":
                    spy_12 = r_k("SPY", m_idx, 12)
                    bil_12 = r_k("BIL", m_idx, 12)
                    efa_12 = r_k("EFA", m_idx, 12)
                    if spy_12 > bil_12:
                        best = "SPY" if spy_12 >= efa_12 else "EFA"
                        target_w = {best: 1.0}
                    else:
                        target_w = {"AGG": 1.0}
            else:
                target_w = {"BIL": 1.0}

            # 비중 정규화
            sum_tw = sum(target_w.values())
            if sum_tw > 0:
                target_w = {k: v / sum_tw for k, v in target_w.items()}
            else:
                target_w = {"BIL": 1.0}

            # 회전율(Turnover) 계산 및 1회 수수료 차감
            all_t = set(curr_weights.keys()).union(target_w.keys())
            turnover = 0.5 * sum(abs(target_w.get(t, 0.0) - curr_weights.get(t, 0.0)) for t in all_t)
            fee = curr_strat * turnover * fee_rate
            curr_strat -= fee
            curr_weights = target_w
            total_rebalances += 1

            # 월간 비중 히스토리 기록
            weights_history_records.append({
                "date": d.strftime('%Y-%m'),
                "weights": {k: round(v * 100.0, 1) for k, v in curr_weights.items()}
            })

        # 일일 가격 변동 반영
        st_prev = curr_strat
        port_r = sum(curr_weights.get(t, 0.0) * (sub_df[t].iloc[i] / sub_df[t].iloc[i - 1] - 1.0) for t in curr_weights)
        curr_strat *= (1.0 + port_r)
        strat_val[i] = curr_strat
        strat_daily_r[i] = (curr_strat / st_prev - 1.0) if st_prev > 0 else 0.0

        # 벤치마크 일일 변동 반영
        bm_prev = curr_bench
        r_spy_d = sub_df["SPY"].iloc[i] / sub_df["SPY"].iloc[i - 1] - 1.0
        r_ief_d = sub_df["IEF"].iloc[i] / sub_df["IEF"].iloc[i - 1] - 1.0
        if is_bm_6040:
            bm_v_spy *= (1.0 + r_spy_d)
            bm_v_ief *= (1.0 + r_ief_d)
            curr_bench = bm_v_spy + bm_v_ief
        else:
            bm_v_spy *= (1.0 + r_spy_d)
            curr_bench = bm_v_spy

        bench_val[i] = curr_bench
        bench_daily_r[i] = (curr_bench / bm_prev - 1.0) if bm_prev > 0 else 0.0
        invested[i] = curr_inv

    # 핵심 성과 지표 산출
    strat_metrics = _calc_perf_metrics(strat_val, invested, dates, strat_daily_r[1:])
    bench_metrics = _calc_perf_metrics(bench_val, invested, dates, bench_daily_r[1:])

    # MDD 시계열
    st_peaks = np.maximum.accumulate(strat_val)
    st_dd = ((strat_val - st_peaks) / st_peaks) * 100.0
    bm_peaks = np.maximum.accumulate(bench_val)
    bm_dd = ((bench_val - bm_peaks) / bm_peaks) * 100.0

    # 차트 포인트 다운샘플링 (~500개)
    step = max(1, n // 500)
    c_indices = list(range(0, n, step))
    if (n - 1) not in c_indices:
        c_indices.append(n - 1)

    chart_dates = [dates[k].strftime('%Y-%m-%d') for k in c_indices]
    chart_strat_val = [round(strat_val[k]) for k in c_indices]
    chart_bench_val = [round(bench_val[k]) for k in c_indices]
    chart_invested = [round(invested[k]) for k in c_indices]
    chart_strat_dd = [round(st_dd[k], 2) for k in c_indices]
    chart_bench_dd = [round(bm_dd[k], 2) for k in c_indices]

    # 비중 히스토리 스택드 에어리어 차트 데이터 포맷팅
    unique_tickers = sorted(list({t for rec in weights_history_records for t in rec["weights"].keys()}))
    wh_dates = [rec["date"] for rec in weights_history_records]
    wh_series = []
    for t in unique_tickers:
        wh_series.append({
            "ticker": t,
            "name_kr": TICKER_INFO.get(t, {}).get("name_kr", t),
            "color": TICKER_INFO.get(t, {}).get("color", "#3b82f6"),
            "data": [rec["weights"].get(t, 0.0) for rec in weights_history_records]
        })

    # 역사적 위기 구간 방어력 분석
    crisis_periods = [
        {"name": "1973년 1차 오일쇼크", "start": "1973-10-01", "end": "1974-12-31", "desc": "스태그플레이션 & 주식 급락"},
        {"name": "1987년 블랙 먼데이", "start": "1987-10-01", "end": "1987-11-30", "desc": "사상 최대 일일 낙폭"},
        {"name": "2000년 닷컴 버블 붕괴", "start": "2000-03-24", "end": "2002-10-09", "desc": "기술주 대폭락 (-80%)"},
        {"name": "2008년 글로벌 금융위기", "start": "2007-10-09", "end": "2009-03-09", "desc": "리만 파산 & S&P -55%"},
        {"name": "2020년 코로나 팬데믹", "start": "2020-02-19", "end": "2020-03-23", "desc": "최단기 급락 충격"},
        {"name": "2022년 금리인상 약세장", "start": "2022-01-03", "end": "2022-10-13", "desc": "주식-채권 동반 폭락"}
    ]

    crisis_results = []
    for cp in crisis_periods:
        c_start = pd.Timestamp(cp["start"])
        c_end = pd.Timestamp(cp["end"])
        mask = (dates >= c_start) & (dates <= c_end)
        if mask.sum() >= 5:
            c_strat = strat_val[mask]
            c_bench = bench_val[mask]
            strat_ret = (c_strat[-1] / c_strat[0] - 1.0) * 100.0
            bench_ret = (c_bench[-1] / c_bench[0] - 1.0) * 100.0
            st_p = np.maximum.accumulate(c_strat)
            st_m = float(np.min((c_strat - st_p) / st_p)) * 100.0
            bm_p = np.maximum.accumulate(c_bench)
            bm_m = float(np.min((c_bench - bm_p) / bm_p)) * 100.0
            alpha = strat_ret - bench_ret
            crisis_results.append({
                "name": cp["name"],
                "period": f"{cp['start']} ~ {cp['end']}",
                "desc": cp["desc"],
                "strat_ret": round(strat_ret, 2),
                "bench_ret": round(bench_ret, 2),
                "strat_mdd": round(st_m, 2),
                "bench_mdd": round(bm_m, 2),
                "alpha": round(alpha, 2)
            })

    live_sig = _get_dynamic_live_signal(strategy_id)

    return {
        "status": "success",
        "info": {
            "strategy_id": strategy_id,
            "strategy_name": live_sig["strategy_name"],
            "strategy_author": live_sig["strategy_author"],
            "strategy_type": live_sig["strategy_type"],
            "benchmark_id": benchmark_id,
            "benchmark_name": "S&P 500 (SPY 100%)" if not is_bm_6040 else "전통 60/40 (SPY 60% + IEF 40%)",
            "start_date": dates[0].strftime('%Y-%m-%d'),
            "end_date": dates[-1].strftime('%Y-%m-%d'),
            "trading_days": n,
            "total_rebalances": total_rebalances,
            "fee_rate_pct": round(fee_rate * 100, 2),
            "as_of_date": live_sig["as_of_date"]
        },
        "live_signal": live_sig,
        "metrics": {
            "strategy": strat_metrics,
            "benchmark": bench_metrics
        },
        "chart": {
            "dates": chart_dates,
            "strat_val": chart_strat_val,
            "bench_val": chart_bench_val,
            "invested": chart_invested,
            "strat_dd": chart_strat_dd,
            "bench_dd": chart_bench_dd
        },
        "weights_history": {
            "dates": wh_dates,
            "tickers": unique_tickers,
            "series": wh_series
        },
        "crisis_analysis": crisis_results
    }


# ── 백테스트 시뮬레이션 엔진 ────────────────────────────────
def _run_seasonality_backtest(
    etf1: str,
    etf2: str,
    etf1_ratio: float,       # 0.0 ~ 1.0 (예: 0.5)
    init_cap: float,
    monthly_add: float,
    season_months: list[int],
    rebal_months: int = 1,   # 리밸런싱 주기 (1 ~ 360개월)
    start_date: str = None,
    end_date: str = None,
    fee_rate: float = 0.001  # 기본 0.1% 거래비용/슬리피지
):
    if _data is None:
        raise ValueError("Yahoo Finance 데이터가 아직 로드되지 않았습니다.")

    rebal_months = max(1, min(360, int(rebal_months)))
    etf2_ratio = 1.0 - etf1_ratio
    safe_ticker = SAFE_PROXY

    req_tickers = list({etf1, etf2, safe_ticker})
    for t in req_tickers:
        if t not in _data.columns:
            raise ValueError(f"티커 {t} 가 데이터셋에 없습니다.")

    # 3개 자산이 모두 존재하는 공통 기간 추출
    sub_df = _data[req_tickers].dropna().copy()
    if len(sub_df) < 20:
        raise ValueError("분석에 필요한 충분한 데이터가 없습니다.")

    avail_min = sub_df.index[0]
    avail_max = sub_df.index[-1]

    # 시작일 필터링 (사용자 지정 날짜 우선, 미지정 시 가용 최소 시작일)
    if start_date:
        s_ts = pd.Timestamp(start_date)
        if s_ts > avail_max:
            raise ValueError(f"시작일({start_date})이 데이터 마지막 날({avail_max.strftime('%Y-%m-%d')})보다 늦습니다.")
        if s_ts < avail_min:
            s_ts = avail_min
        sub_df = sub_df[sub_df.index >= s_ts]

    # 종료일 필터링
    if end_date:
        e_ts = pd.Timestamp(end_date)
        if e_ts < sub_df.index[0]:
            raise ValueError(f"종료일({end_date})이 시작일({sub_df.index[0].strftime('%Y-%m-%d')})보다 빠릅니다.")
        sub_df = sub_df[sub_df.index <= e_ts]

    n = len(sub_df)
    if n < 15:
        raise ValueError(f"선택한 기간 내 거래일이 너무 적습니다 (최소 15 거래일 필요, 현재 {n}일).")
    dates = sub_df.index
    months = dates.month

    # 2010년 이전 데이터 포함 여부 (기초 지수 ^NDX, ^SOX 기반 가상 합성 데이터 사용 여부 판별)
    has_synthetic = (dates[0] < pd.Timestamp("2010-01-01"))
    synthetic_notice = (
        "⚠️ 2010년 이전 데이터는 기초 지수(^NDX, ^SOX)를 바탕으로 레버리지 배수를 곱해 합성된 가상 데이터(Synthetic Data)입니다. 롤오버 비용이 제외되어 실제보다 낙관적일 수 있습니다."
        if has_synthetic else None
    )

    p1 = sub_df[etf1].values
    p2 = sub_df[etf2].values
    ps = sub_df[safe_ticker].values

    r1 = np.zeros(n)
    r2 = np.zeros(n)
    rs = np.zeros(n)
    r1[1:] = (p1[1:] / p1[:-1]) - 1.0
    r2[1:] = (p2[1:] / p2[:-1]) - 1.0
    rs[1:] = (ps[1:] / ps[:-1]) - 1.0

    strat_val = np.zeros(n)
    bh_val = np.zeros(n)
    invested = np.zeros(n)
    strat_daily_r = np.zeros(n)
    bh_daily_r = np.zeros(n)
    is_bull_arr = np.zeros(n, dtype=bool)

    # ── 포트폴리오 자산별 금액 추적 모델 ──
    # Buy & Hold 자산 금액 (초기 투자금 배분)
    bh_v1 = init_cap * etf1_ratio
    bh_v2 = init_cap * etf2_ratio

    # 계절성 스위칭 자산 금액
    is_init_bull = (months[0] in season_months)
    if is_init_bull:
        strat_v1 = init_cap * etf1_ratio
        strat_v2 = init_cap * etf2_ratio
        strat_v_safe = 0.0
        prev_mode = "BULL"
    else:
        strat_v1 = 0.0
        strat_v2 = 0.0
        strat_v_safe = init_cap
        prev_mode = "SAFE"

    curr_inv = init_cap
    strat_val[0] = strat_v1 + strat_v2 + strat_v_safe
    bh_val[0] = bh_v1 + bh_v2
    invested[0] = curr_inv
    is_bull_arr[0] = is_init_bull

    curr_month = months[0]
    bh_months_count = 0
    strat_bull_months_count = 0
    total_rebalances_strat = 0
    total_rebalances_bh = 0

    for i in range(1, n):
        m = months[i]

        # ── 월 첫 거래일 처리 (적립금 투입 + 리밸런싱 / 스위칭 판별) ──
        if m != curr_month:
            curr_month = m
            curr_inv += monthly_add

            # 1. Buy & Hold: 월 적립금 목표 비중 투입 및 N개월 주기 리밸런싱
            bh_v1 += monthly_add * etf1_ratio
            bh_v2 += monthly_add * etf2_ratio
            bh_months_count += 1

            if bh_months_count >= rebal_months:
                bh_total = bh_v1 + bh_v2
                target_bh_v1 = bh_total * etf1_ratio
                # 리밸런싱 거래량에 따른 수수료 차감
                trade_amt = abs(bh_v1 - target_bh_v1)
                rebal_fee = trade_amt * fee_rate
                bh_total_after_fee = bh_total - rebal_fee
                bh_v1 = bh_total_after_fee * etf1_ratio
                bh_v2 = bh_total_after_fee * etf2_ratio
                bh_months_count = 0
                total_rebalances_bh += 1

            # 2. 계절성 스위칭: 월 계절성 판별
            is_bull_month = (m in season_months)
            next_mode = "BULL" if is_bull_month else "SAFE"

            if next_mode == "BULL":
                # 현재 달이 강세월인 경우
                if prev_mode == "SAFE":
                    # 안전자산 -> 위험자산 스위칭 매수 (수수료 차감 후 목표 비중 배분)
                    total_strat_prev = (strat_v_safe + monthly_add) * (1.0 - fee_rate)
                    strat_v1 = total_strat_prev * etf1_ratio
                    strat_v2 = total_strat_prev * etf2_ratio
                    strat_v_safe = 0.0
                    prev_mode = "BULL"
                    strat_bull_months_count = 0
                else:
                    # 연속 위험자산 보유 달: 적립금 투입
                    strat_v1 += monthly_add * etf1_ratio
                    strat_v2 += monthly_add * etf2_ratio
                    strat_bull_months_count += 1

                    # 위험자산 연속 보유 구간 내에서 N개월 주기 리밸런싱 도래 시
                    if strat_bull_months_count >= rebal_months:
                        st_total = strat_v1 + strat_v2
                        target_st_v1 = st_total * etf1_ratio
                        trade_amt_st = abs(strat_v1 - target_st_v1)
                        rebal_fee_st = trade_amt_st * fee_rate
                        st_total_after = st_total - rebal_fee_st
                        strat_v1 = st_total_after * etf1_ratio
                        strat_v2 = st_total_after * etf2_ratio
                        strat_bull_months_count = 0
                        total_rebalances_strat += 1
            else:
                # 현재 달이 비강세월 (안전자산 파킹달)
                if prev_mode == "BULL":
                    # 위험자산 전량 매도 -> 안전자산 100% 매수 파킹 (수수료 차감)
                    total_strat_prev = (strat_v1 + strat_v2) * (1.0 - fee_rate) + monthly_add
                    strat_v_safe = total_strat_prev
                    strat_v1 = 0.0
                    strat_v2 = 0.0
                    prev_mode = "SAFE"
                    strat_bull_months_count = 0
                else:
                    # 연속 안전자산 파킹달: 적립금 안전자산에 추가
                    strat_v_safe += monthly_add

        is_bull_arr[i] = (prev_mode == "BULL")

        # ── 일일 가격 변동 반영 ──
        # Buy & Hold
        bh_prev_day = bh_v1 + bh_v2
        bh_v1 *= (1.0 + r1[i])
        bh_v2 *= (1.0 + r2[i])
        bh_curr_day = bh_v1 + bh_v2
        bh_val[i] = bh_curr_day
        bh_daily_r[i] = (bh_curr_day / bh_prev_day - 1.0) if bh_prev_day > 0 else 0.0

        # 계절성 스위칭
        strat_prev_day = strat_v1 + strat_v2 + strat_v_safe
        if prev_mode == "BULL":
            strat_v1 *= (1.0 + r1[i])
            strat_v2 *= (1.0 + r2[i])
        else:
            strat_v_safe *= (1.0 + rs[i])

        strat_curr_day = strat_v1 + strat_v2 + strat_v_safe
        strat_val[i] = strat_curr_day
        strat_daily_r[i] = (strat_curr_day / strat_prev_day - 1.0) if strat_prev_day > 0 else 0.0

        invested[i] = curr_inv

    # 지표 산출
    strat_metrics = _calc_perf_metrics(strat_val, invested, dates, strat_daily_r[1:])
    bh_metrics = _calc_perf_metrics(bh_val, invested, dates, bh_daily_r[1:])

    # MDD 시계열
    strat_peaks = np.maximum.accumulate(strat_val)
    strat_dd = ((strat_val - strat_peaks) / strat_peaks) * 100.0

    bh_peaks = np.maximum.accumulate(bh_val)
    bh_dd = ((bh_val - bh_peaks) / bh_peaks) * 100.0

    # 월간 집계
    df_perf = pd.DataFrame({
        'Date': dates,
        'Year': dates.year,
        'Month': dates.month,
        'Strat_Val': strat_val,
        'BH_Val': bh_val,
        'Invested': invested
    })
    df_perf.set_index('Date', inplace=True)

    m_ends = df_perf.resample('ME').last()
    m_ends['Strat_Month_Ret'] = m_ends['Strat_Val'].pct_change() * 100.0
    m_ends['BH_Month_Ret'] = m_ends['BH_Val'].pct_change() * 100.0
    if len(m_ends) > 0 and len(df_perf) > 0:
        m_ends.iloc[0, m_ends.columns.get_loc('Strat_Month_Ret')] = (m_ends.iloc[0]['Strat_Val'] / init_cap - 1.0) * 100.0
        m_ends.iloc[0, m_ends.columns.get_loc('BH_Month_Ret')] = (m_ends.iloc[0]['BH_Val'] / init_cap - 1.0) * 100.0

    strat_win_months = int((m_ends['Strat_Month_Ret'] > 0).sum())
    bh_win_months = int((m_ends['BH_Month_Ret'] > 0).sum())
    total_months = max(len(m_ends), 1)

    strat_metrics["win_rate_pct"] = round((strat_win_months / total_months) * 100.0, 1)
    bh_metrics["win_rate_pct"] = round((bh_win_months / total_months) * 100.0, 1)
    strat_metrics["best_month_pct"] = round(float(m_ends['Strat_Month_Ret'].max()), 2) if len(m_ends) else 0.0
    strat_metrics["worst_month_pct"] = round(float(m_ends['Strat_Month_Ret'].min()), 2) if len(m_ends) else 0.0
    bh_metrics["best_month_pct"] = round(float(m_ends['BH_Month_Ret'].max()), 2) if len(m_ends) else 0.0
    bh_metrics["worst_month_pct"] = round(float(m_ends['BH_Month_Ret'].min()), 2) if len(m_ends) else 0.0

    safe_months_count = int(np.sum(~is_bull_arr))
    safe_time_pct = round((safe_months_count / max(n, 1)) * 100.0, 1)
    strat_metrics["safe_time_pct"] = safe_time_pct
    bh_metrics["safe_time_pct"] = 0.0

    # 연도별 수익률 집계
    y_ends = df_perf.resample('YE').last()
    annual_results = []

    for yr, row in y_ends.iterrows():
        year_int = yr.year
        s_val = row['Strat_Val']
        b_val = row['BH_Val']
        inv_val = row['Invested']

        yr_sub = df_perf[df_perf['Year'] == year_int]
        if len(yr_sub) > 1:
            y_s_ret = (yr_sub['Strat_Val'].iloc[-1] / yr_sub['Strat_Val'].iloc[0] - 1.0) * 100.0
            y_b_ret = (yr_sub['BH_Val'].iloc[-1] / yr_sub['BH_Val'].iloc[0] - 1.0) * 100.0
        else:
            y_s_ret = 0.0
            y_b_ret = 0.0

        s_yr_mdd = strat_metrics.get("yearly_mdds", {}).get(year_int, 0.0)
        b_yr_mdd = bh_metrics.get("yearly_mdds", {}).get(year_int, 0.0)

        annual_results.append({
            "year": int(year_int),
            "strat_ret_pct": round(float(y_s_ret), 2),
            "bh_ret_pct": round(float(y_b_ret), 2),
            "strat_mdd_pct": s_yr_mdd,
            "bh_mdd_pct": b_yr_mdd,
            "strat_final_val": round(float(s_val)),
            "bh_final_val": round(float(b_val)),
            "invested": round(float(inv_val))
        })

    # 다운샘플링 (차트용 데이터 생성)
    step = max(1, n // 700)
    chart_indices = list(range(0, n, step))
    if chart_indices[-1] != n - 1:
        chart_indices.append(n - 1)

    chart_dates = [dates[idx].strftime('%Y-%m-%d') for idx in chart_indices]
    chart_strat_val = [round(strat_val[idx]) for idx in chart_indices]
    chart_bh_val = [round(bh_val[idx]) for idx in chart_indices]
    chart_invested = [round(invested[idx]) for idx in chart_indices]
    chart_strat_dd = [round(float(strat_dd[idx]), 2) for idx in chart_indices]
    chart_bh_dd = [round(float(bh_dd[idx]), 2) for idx in chart_indices]
    chart_is_bull = [bool(is_bull_arr[idx]) for idx in chart_indices]

    # 1월~12월 계절성 통계
    sub_df['Month'] = sub_df.index.month
    monthly_stats = []
    for m in range(1, 13):
        m_rows = sub_df[sub_df['Month'] == m]
        m_r1 = (m_rows[etf1].pct_change().fillna(0).mean() * 21) * 100.0
        m_r2 = (m_rows[etf2].pct_change().fillna(0).mean() * 21) * 100.0
        port_m_ret = etf1_ratio * m_r1 + etf2_ratio * m_r2
        is_selected = (m in season_months)
        monthly_stats.append({
            "month": m,
            "etf1_avg_ret": round(float(m_r1), 2),
            "etf2_avg_ret": round(float(m_r2), 2),
            "port_avg_ret": round(float(port_m_ret), 2),
            "is_selected": is_selected
        })

    # ── 백테스트 결과 자동 요약 (Executive Summary) 생성 ──────────
    alpha_final = strat_metrics["final_value"] - bh_metrics["final_value"]
    mdd_defense = bh_metrics["mdd_pct"] - strat_metrics["mdd_pct"]

    rebal_text = (
        f"리밸런싱 주기: {rebal_months}개월 단위로 정기 비중 재조정(계절성 전략 {total_rebalances_strat}회, Buy & Hold {total_rebalances_bh}회 리밸런싱 실행)을 거쳤으며, 자산 쏠림 방지 및 변동성 제어 효과를 거두었습니다."
    )

    summary_bullets = [
        f"수익성 (TR & CAGR): 계절성 스위칭 전략은 총 수익률(TR) {strat_metrics['tr_pct']:+,.2f}%, 연평균 CAGR {strat_metrics['cagr_pct']:+.2f}%를 기록하여 Buy & Hold 대비 {strat_metrics['cagr_pct'] - bh_metrics['cagr_pct']:+.2f}%p의 연복리 성과를 보였습니다. 최종 자산은 약 {abs(alpha_final):,d}원 {'초과 달성' if alpha_final >= 0 else '부족'}하였습니다.",
        f"리스크 방어 (전체 MDD): 전체 기간 최대 낙폭(MDD)은 Buy & Hold {bh_metrics['mdd_pct']:.2f}% 대비 {strat_metrics['mdd_pct']:.2f}%로, 하방 리스크를 {abs(mdd_defense):.1f}%p {'대폭 완화' if mdd_defense > 0 else '유지'}했습니다.",
        f"최악의 해 방어력: Buy & Hold 기준 가장 가혹했던 해({bh_metrics['worst_year']}년 MDD {bh_metrics['worst_year_mdd_pct']:.2f}%)와 대비하여, 계절성 전략의 최악의 해는 {strat_metrics['worst_year']}년(MDD {strat_metrics['worst_year_mdd_pct']:.2f}%)으로 약세장 방어 효과를 입증했습니다.",
        f"자본 효율성 (MAR): 감수한 최대 낙폭 대비 복리 수익을 나타내는 MAR 비율은 계절성 전략이 {strat_metrics['mar_ratio']}로 Buy & Hold({bh_metrics['mar_ratio']}) 대비 {'우수한' if strat_metrics['mar_ratio'] >= bh_metrics['mar_ratio'] else '유사한'} 자본 효율성을 기록했습니다.",
        rebal_text,
        f"계절성 자산배분: 전체 투자의 {strat_metrics['safe_time_pct']}% 기간 동안 안전자산(초단기채)에 파킹하여 위험 노출을 억제하면서도 {strat_metrics['win_rate_pct']}%의 월간 승률을 달성했습니다."
    ]

    return {
        "status": "success",
        "info": {
            "etf1": etf1,
            "etf2": etf2,
            "etf1_ratio": round(etf1_ratio * 100, 1),
            "etf2_ratio": round(etf2_ratio * 100, 1),
            "safe_asset": safe_ticker,
            "rebal_months": rebal_months,
            "total_rebalances_strat": total_rebalances_strat,
            "total_rebalances_bh": total_rebalances_bh,
            "fee_rate_pct": round(fee_rate * 100, 2),
            "start_date": dates[0].strftime('%Y-%m-%d'),
            "end_date": dates[-1].strftime('%Y-%m-%d'),
            "trading_days": n,
            "season_months": sorted(season_months),
            "has_synthetic": has_synthetic,
            "synthetic_notice": synthetic_notice,
            "source": _data_status.get("source", "Yahoo Finance (Synthetic & Auto Adjusted)")
        },
        "metrics": {
            "strategy": strat_metrics,
            "buy_and_hold": bh_metrics
        },
        "summary": {
            "alpha_final": alpha_final,
            "mdd_defense": round(mdd_defense, 2),
            "bullets": summary_bullets
        },
        "chart": {
            "dates": chart_dates,
            "strat_val": chart_strat_val,
            "bh_val": chart_bh_val,
            "invested": chart_invested,
            "strat_dd": chart_strat_dd,
            "bh_dd": chart_bh_dd,
            "is_bull": chart_is_bull
        },
        "annual_results": annual_results,
        "monthly_seasonality": monthly_stats
    }


# ── API 엔드포인트 ──────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/api/search_ticker', methods=['GET'])
def search_ticker():
    query = request.args.get('q', '').strip()
    if not query:
        # 검색어가 없을 때는 기본 추천 목록 반환
        popular = []
        for sym, d in TICKER_INFO.items():
            if sym not in ['BIL', 'SGOV']:
                popular.append({
                    "symbol": sym,
                    "name": d.get("name_kr", sym),
                    "category": d.get("category", "ETF"),
                    "type": "ETF" if "ETF" in d.get("category", "") else "EQUITY"
                })
        return jsonify({"status": "success", "results": popular})

    q_lower = query.lower()
    results = []
    seen = set()

    # 1. 내장 TICKER_INFO 사전 매칭 (한글명 및 티커 우선)
    for sym, d in TICKER_INFO.items():
        if sym in ['BIL', 'SGOV']:
            continue
        name_kr = d.get("name_kr", "")
        if q_lower in sym.lower() or q_lower in name_kr.lower():
            results.append({
                "symbol": sym,
                "name": name_kr,
                "category": d.get("category", "ETF"),
                "type": "ETF" if "ETF" in d.get("category", "") else "EQUITY"
            })
            seen.add(sym)

    # 2. Yahoo Finance Search API를 통한 동적 종목/ETF 검색
    try:
        # yf.Search에 타임아웃 방지 및 안전 예외처리
        yf_search = yf.Search(query, max_results=8)
        quotes = getattr(yf_search, 'quotes', []) or []
        for item in quotes:
            sym = item.get('symbol', '').upper()
            if not sym or sym in seen:
                continue
            seen.add(sym)
            short_name = item.get('shortname') or item.get('longname') or sym
            quote_type = item.get('quoteType', 'ETF')
            exch = item.get('exchDisp') or item.get('exchange') or ''
            results.append({
                "symbol": sym,
                "name": f"{short_name} ({exch})",
                "category": quote_type,
                "type": quote_type
            })
    except Exception as e:
        pass

    # 만약 직접 티커를 입력한 경우(예: 직접 알파벳 입력) 결과 최상단 보장
    query_sym = query.upper()
    if query_sym not in seen and len(query_sym) <= 10:
        results.insert(0, {
            "symbol": query_sym,
            "name": f"직접 입력 티커: {query_sym}",
            "category": "직접입력",
            "type": "CUSTOM"
        })

    return jsonify({"status": "success", "results": results[:12]})


@app.route('/api/status', methods=['GET'])
def get_status():
    with _lock:
        st = dict(_data_status)
    return jsonify(st)


@app.route('/api/tickers', methods=['GET'])
def get_tickers():
    return jsonify({
        "tickers": ALL_TICKERS,
        "details": TICKER_INFO,
        "default_etf1": "SOXL",
        "default_etf2": "TQQQ",
        "default_etf1_ratio": 50,
        "default_etf2_ratio": 50,
        "default_season_months": [1, 2, 3, 4, 11, 12]
    })


@app.route('/api/refresh_data', methods=['POST'])
def refresh_data():
    t = threading.Thread(target=_load_or_fetch_data, kwargs={"force_download": True})
    t.daemon = True
    t.start()
    return jsonify({"message": "Yahoo Finance로부터 최신 데이터 다운로드를 시작했습니다."})


@app.route('/api/date_range', methods=['GET'])
def get_date_range():
    with _lock:
        if not _data_status["ready"] or _data is None:
            return jsonify({"status": "error", "message": "데이터 준비 중"}), 400

    etf1 = request.args.get('etf1', 'SOXL').strip().upper()
    etf2 = request.args.get('etf2', 'TQQQ').strip().upper()

    # 필요 시 동적 다운로드
    _ensure_tickers_loaded([etf1, etf2])

    req = list({etf1, etf2, SAFE_PROXY})

    with _lock:
        for t in req:
            if t not in _data.columns:
                return jsonify({"status": "error", "message": f"{t} 티커 없음"}), 400

        sub = _data[req].dropna()
        if len(sub) == 0:
            return jsonify({"status": "error", "message": "공통 데이터 없음"}), 400

        min_d = sub.index[0].strftime('%Y-%m-%d')
        max_d = sub.index[-1].strftime('%Y-%m-%d')
    # 시작 날짜는 1970-01-01부터 선택 가능, 기본 시작일은 2001-01-01 또는 가용 시작일
    def_s = max(min_d, "2001-01-01") if min_d <= "2001-01-01" else min_d

    return jsonify({
        "status": "success",
        "min_date": "1970-01-01",
        "data_min_date": min_d,
        "max_date": max_d,
        "default_start": def_s,
        "default_end": max_d
    })


@app.route('/api/permanent_portfolio', methods=['POST'])
def permanent_portfolio():
    with _lock:
        if not _data_status["ready"]:
            return jsonify({
                "status": "error",
                "message": "데이터가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요."
            }), 400

    data = request.get_json() or {}
    w_spy = float(data.get('w_spy', 25)) / 100.0
    w_tlt = float(data.get('w_tlt', 25)) / 100.0
    w_gld = float(data.get('w_gld', 25)) / 100.0
    w_bil = float(data.get('w_bil', 25)) / 100.0

    init_cap = float(data.get('init_cap', 50000000))
    monthly_add = float(data.get('monthly_add', 500000))
    rebal_months = int(data.get('rebal_months', 12))
    season_months = data.get('season_months', list(range(1, 13)))
    start_date = data.get('start_date', '1970-01-01')
    end_date = data.get('end_date')
    raw_fee = float(data.get('fee_rate', 0.1))
    fee_rate = raw_fee / 100.0 if raw_fee > 0.01 else raw_fee

    try:
        result = _run_permanent_portfolio_backtest(
            w_spy=w_spy,
            w_tlt=w_tlt,
            w_gld=w_gld,
            w_bil=w_bil,
            init_cap=init_cap,
            monthly_add=monthly_add,
            rebal_months=rebal_months,
            season_months=season_months,
            start_date=start_date,
            end_date=end_date,
            fee_rate=fee_rate
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400



    strategy_id = request.args.get('strategy', 'BAA').strip().upper()
    try:
        sig = _get_dynamic_live_signal(strategy_id)
        return jsonify({
            "status": "success",
            "live_signal": sig
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400



    data = request.get_json() or {}
    strategy_id = str(data.get('strategy_id', 'BAA')).strip().upper()
    benchmark_id = str(data.get('benchmark_id', 'SPY')).strip().upper()

    init_cap = float(data.get('init_cap', 50000000))
    monthly_add = float(data.get('monthly_add', 500000))
    start_date = data.get('start_date', '1970-01-01')
    end_date = data.get('end_date')
    raw_fee = float(data.get('fee_rate', 0.1))
    fee_rate = raw_fee / 100.0 if raw_fee > 0.01 else raw_fee

    try:
        result = _run_dynamic_allocation_backtest(
            strategy_id=strategy_id,
            benchmark_id=benchmark_id,
            init_cap=init_cap,
            monthly_add=monthly_add,
            start_date=start_date,
            end_date=end_date,
            fee_rate=fee_rate
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400


@app.route('/api/allweather_portfolio', methods=['POST'])
def allweather_portfolio():
    with _lock:
        if not _data_status["ready"]:
            return jsonify({
                "status": "error",
                "message": "데이터가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요."
            }), 400

    data = request.get_json() or {}
    w_spy = float(data.get('w_spy', 30)) / 100.0
    w_tlt = float(data.get('w_tlt', 40)) / 100.0
    w_ief = float(data.get('w_ief', 15)) / 100.0
    w_gld = float(data.get('w_gld', 7.5)) / 100.0
    w_dbc = float(data.get('w_dbc', 7.5)) / 100.0

    init_cap = float(data.get('init_cap', 50000000))
    monthly_add = float(data.get('monthly_add', 500000))
    rebal_months = int(data.get('rebal_months', 12))
    season_months = data.get('season_months', list(range(1, 13)))
    start_date = data.get('start_date', '1970-01-01')
    end_date = data.get('end_date')
    raw_fee = float(data.get('fee_rate', 0.1))
    fee_rate = raw_fee / 100.0 if raw_fee > 0.01 else raw_fee

    try:
        result = _run_allweather_portfolio_backtest(
            w_spy=w_spy,
            w_tlt=w_tlt,
            w_ief=w_ief,
            w_gld=w_gld,
            w_dbc=w_dbc,
            init_cap=init_cap,
            monthly_add=monthly_add,
            rebal_months=rebal_months,
            season_months=season_months,
            start_date=start_date,
            end_date=end_date,
            fee_rate=fee_rate
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400



    strategy_id = request.args.get('strategy', 'BAA').strip().upper()
    try:
        sig = _get_dynamic_live_signal(strategy_id)
        return jsonify({
            "status": "success",
            "live_signal": sig
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400



    data = request.get_json() or {}
    strategy_id = str(data.get('strategy_id', 'BAA')).strip().upper()
    benchmark_id = str(data.get('benchmark_id', 'SPY')).strip().upper()

    init_cap = float(data.get('init_cap', 50000000))
    monthly_add = float(data.get('monthly_add', 500000))
    start_date = data.get('start_date', '1970-01-01')
    end_date = data.get('end_date')
    raw_fee = float(data.get('fee_rate', 0.1))
    fee_rate = raw_fee / 100.0 if raw_fee > 0.01 else raw_fee

    try:
        result = _run_dynamic_allocation_backtest(
            strategy_id=strategy_id,
            benchmark_id=benchmark_id,
            init_cap=init_cap,
            monthly_add=monthly_add,
            start_date=start_date,
            end_date=end_date,
            fee_rate=fee_rate
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400


@app.route('/api/backtest', methods=['POST'])
def backtest():
    with _lock:
        if not _data_status["ready"]:
            return jsonify({
                "status": "error",
                "message": "데이터가 아직 준비되지 않았습니다. Yahoo Finance 수집 완료 후 다시 시도해주세요."
            }), 400

    data = request.get_json() or {}
    etf1 = str(data.get('etf1', 'SOXL')).strip().upper()
    etf2 = str(data.get('etf2', 'TQQQ')).strip().upper()
    
    # 신규 티커가 있을 경우 온디맨드로 데이터 로드
    _ensure_tickers_loaded([etf1, etf2])

    # ETF 1과 ETF 2의 비중 처리
    etf1_ratio_pct = float(data.get('etf1_ratio', 50))
    if 'etf2_ratio' in data and 'etf1_ratio' not in data:
        etf1_ratio_pct = 100.0 - float(data.get('etf2_ratio', 50))

    init_cap = float(data.get('init_cap', 50000000))
    monthly_add = float(data.get('monthly_add', 500000))
    season_months = data.get('season_months', [1, 2, 3, 4, 11, 12])
    rebal_months = int(data.get('rebal_months', 1))
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    raw_fee = float(data.get('fee_rate', 0.1))
    fee_rate = raw_fee / 100.0 if raw_fee > 0.01 else raw_fee

    try:
        etf1_ratio = max(0.0, min(1.0, etf1_ratio_pct / 100.0))
        result = _run_seasonality_backtest(
            etf1=etf1,
            etf2=etf2,
            etf1_ratio=etf1_ratio,
            init_cap=init_cap,
            monthly_add=monthly_add,
            season_months=[int(m) for m in season_months],
            rebal_months=rebal_months,
            start_date=start_date,
            end_date=end_date,
            fee_rate=fee_rate
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400



    strategy_id = request.args.get('strategy', 'BAA').strip().upper()
    try:
        sig = _get_dynamic_live_signal(strategy_id)
        return jsonify({
            "status": "success",
            "live_signal": sig
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400



    data = request.get_json() or {}
    strategy_id = str(data.get('strategy_id', 'BAA')).strip().upper()
    benchmark_id = str(data.get('benchmark_id', 'SPY')).strip().upper()

    init_cap = float(data.get('init_cap', 50000000))
    monthly_add = float(data.get('monthly_add', 500000))
    start_date = data.get('start_date', '1970-01-01')
    end_date = data.get('end_date')
    raw_fee = float(data.get('fee_rate', 0.1))
    fee_rate = raw_fee / 100.0 if raw_fee > 0.01 else raw_fee

    try:
        result = _run_dynamic_allocation_backtest(
            strategy_id=strategy_id,
            benchmark_id=benchmark_id,
            init_cap=init_cap,
            monthly_add=monthly_add,
            start_date=start_date,
            end_date=end_date,
            fee_rate=fee_rate
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400


@app.route('/api/dynamic_live_signal', methods=['GET'])
def dynamic_live_signal():
    with _lock:
        if not _data_status["ready"]:
            return jsonify({
                "status": "error",
                "message": "데이터가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요."
            }), 400

    strategy_id = request.args.get('strategy', 'BAA').strip().upper()
    try:
        sig = _get_dynamic_live_signal(strategy_id)
        return jsonify({
            "status": "success",
            "live_signal": sig
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400


@app.route('/api/dynamic_allocation', methods=['POST'])
def dynamic_allocation():
    with _lock:
        if not _data_status["ready"]:
            return jsonify({
                "status": "error",
                "message": "데이터가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요."
            }), 400

    data = request.get_json() or {}
    strategy_id = str(data.get('strategy_id', 'BAA')).strip().upper()
    benchmark_id = str(data.get('benchmark_id', 'SPY')).strip().upper()

    init_cap = float(data.get('init_cap', 50000000))
    monthly_add = float(data.get('monthly_add', 500000))
    start_date = data.get('start_date', '1970-01-01')
    end_date = data.get('end_date')
    raw_fee = float(data.get('fee_rate', 0.1))
    fee_rate = raw_fee / 100.0 if raw_fee > 0.01 else raw_fee

    try:
        result = _run_dynamic_allocation_backtest(
            strategy_id=strategy_id,
            benchmark_id=benchmark_id,
            init_cap=init_cap,
            monthly_add=monthly_add,
            start_date=start_date,
            end_date=end_date,
            fee_rate=fee_rate
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400


# Vercel 서버 시작 시 즉시 내장 캐시 데이터를 메모리에 적재
if os.environ.get("VERCEL"):
    _load_or_fetch_data()

if __name__ == '__main__':
    loader_thread = threading.Thread(target=_load_or_fetch_data)
    loader_thread.daemon = True
    loader_thread.start()

    print("=" * 60)
    print(" [ETF 계절성 스위칭 백테스트 터미널 (Yahoo Finance)]")
    print(" 로컬 웹 서버 주소: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=False)
