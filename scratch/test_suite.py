import os
import sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
import app

app._load_or_fetch_data()
client = app.app.test_client()

print('=== 1. Tickers API ===')
r = client.get('/api/tickers')
d = r.get_json()
print('Status:', r.status_code, 'Tickers count:', len(d.get('tickers', [])))

print('\n=== 2. Dynamic Live Signal API (all 6 strategies) ===')
for s in ['BAA', 'HAA', 'LAA', 'RAA', 'GTAA', 'GEM']:
    r = client.get(f'/api/dynamic_live_signal?strategy={s}')
    d = r.get_json()
    sig = d['live_signal']
    picks = [(p['ticker'], p['weight_pct']) for p in sig['portfolio']]
    print(f"[{s:4s}] {sig['regime_badge']} -> {picks}")

print('\n=== 3. Dynamic Allocation Backtest API (BAA, HAA, LAA, RAA, GTAA, GEM) ===')
for s in ['BAA', 'HAA', 'LAA', 'RAA', 'GTAA', 'GEM']:
    r = client.post('/api/dynamic_allocation', json={
        'strategy_id': s,
        'benchmark_id': 'SPY',
        'init_cap': 50000000,
        'monthly_add': 500000,
        'start_date': '1970-01-01',
        'fee_rate': 0.1
    })
    d = r.get_json()
    st = d['metrics']['strategy']
    bm = d['metrics']['benchmark']
    print(f"[{s:4s}] Strat CAGR: {st['cagr_pct']:5.2f}% | MDD: {st['mdd_pct']:6.2f}% | Final: {st['final_value']:>15,d} KRW (BM MDD: {bm['mdd_pct']:6.2f}%)")

print('\n=== 4. Dynamic Allocation with 60/40 Benchmark ===')
r = client.post('/api/dynamic_allocation', json={
    'strategy_id': 'BAA',
    'benchmark_id': '6040',
    'init_cap': 50000000,
    'monthly_add': 500000,
    'start_date': '1970-01-01',
    'fee_rate': 0.1
})
d = r.get_json()
print(f"BAA vs 60/40 -> Strat CAGR: {d['metrics']['strategy']['cagr_pct']}% | BM CAGR: {d['metrics']['benchmark']['cagr_pct']}% | BM MDD: {d['metrics']['benchmark']['mdd_pct']}%")

print('\n=== 5. Verify Tab 1, 2, 3 Still Function Perfectly ===')
r1 = client.post('/api/backtest', json={'etf1': 'SOXL', 'etf2': 'TQQQ', 'start_date': '2010-04-01'})
print('Tab 1 status:', r1.status_code, 'SOXL Buy&Hold multiple:', round(r1.get_json()['metrics']['buy_and_hold']['final_value'] / 50000000, 2), 'x')

r2 = client.post('/api/permanent_portfolio', json={'start_date': '1970-01-01'})
print('Tab 2 status:', r2.status_code, 'Permanent CAGR:', r2.get_json()['metrics']['permanent_portfolio']['cagr_pct'], '%')

r3 = client.post('/api/allweather_portfolio', json={'start_date': '1970-01-01'})
print('Tab 3 status:', r3.status_code, 'All Weather CAGR:', r3.get_json()['metrics']['allweather_portfolio']['cagr_pct'], '%')
