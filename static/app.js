/**
 * ETF 계절성 스위칭 백테스트 터미널 - 프론트엔드 컨트롤러
 * Dynamic Seasonality Switching Strategy Dashboard
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── 전역 상태 ──
  const state = {
    currentTab: 'seasonality', // 'seasonality' | 'permanent' | 'allweather'
    etf1: 'SOXL',
    etf2: 'TQQQ',
    etf1_ratio: 50,
    etf2_ratio: 50,
    init_cap: 50000000,
    monthly_add: 500000,
    season_months: [1, 2, 3, 4, 11, 12],
    rebal_months: 1,
    start_date: '2001-01-01',
    end_date: '',
    min_date: '1970-01-01',
    max_date: '',
    fee_rate: 0.1,
    scale_type: 'log',
    tickerDetails: {},
    isDataReady: false,
    charts: {
      equity: null,
      drawdown: null,
      seasonality: null,
      annual: null,
      permEquity: null,
      permDrawdown: null,
      awEquity: null,
      awDrawdown: null
    },
    latestResult: null,

    // 🌟 영구 포트폴리오 상태 🌟
    perm: {
      w_spy: 25,
      w_tlt: 25,
      w_gld: 25,
      w_bil: 25,
      init_cap: 50000000,
      monthly_add: 500000,
      rebal_months: 12,
      season_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      start_date: '1970-01-02',
      end_date: '',
      fee_rate: 0.1,
      scale_type: 'log',
      latestResult: null
    },

    // 🌟 올웨더 포트폴리오 상태 (Ray Dalio) 🌟
    aw: {
      w_spy: 30,
      w_tlt: 40,
      w_ief: 15,
      w_gld: 7.5,
      w_dbc: 7.5,
      init_cap: 50000000,
      monthly_add: 500000,
      rebal_months: 12,
      season_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      start_date: '1970-01-02',
      end_date: '',
      fee_rate: 0.1,
      scale_type: 'log',
      latestResult: null
    },

    // 🌟 [Tab 4] 동적 자산 배분 상태 (Dynamic Asset Allocation) 🌟
    dynamic: {
      strategy: 'BAA',
      benchmark: 'SPY',
      init_cap: 50000000,
      monthly_add: 500000,
      start_date: '1970-01-01',
      end_date: '',
      fee_rate: 0.1,
      scale_type: 'log',
      latestResult: null,
      latestSignal: null
    }
  };

  // ── DOM 엘리먼트 ──
  const el = {
    dataStatusBadge: document.getElementById('dataStatusBadge'),
    dataStatusText: document.getElementById('dataStatusText'),
    btnRefreshData: document.getElementById('btnRefreshData'),

    initCap: document.getElementById('initCap'),
    initCapPreview: document.getElementById('initCapPreview'),
    monthlyAdd: document.getElementById('monthlyAdd'),
    monthlyAddPreview: document.getElementById('monthlyAddPreview'),

    // 날짜 선택 엘리먼트
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    periodDurationPreview: document.getElementById('periodDurationPreview'),
    quickPeriodButtons: document.querySelectorAll('.btn-quick-period'),

    // 🌟 신규: 티커 검색 엘리먼트
    etf1SearchInput: document.getElementById('etf1SearchInput'),
    etf2SearchInput: document.getElementById('etf2SearchInput'),
    etf1ClearBtn: document.getElementById('etf1ClearBtn'),
    etf2ClearBtn: document.getElementById('etf2ClearBtn'),
    etf1Dropdown: document.getElementById('etf1Dropdown'),
    etf2Dropdown: document.getElementById('etf2Dropdown'),
    etf1Badge: document.getElementById('etf1Badge'),
    etf2Badge: document.getElementById('etf2Badge'),

    // TQQQ & ETF1 양방향 비중 제어 엘리먼트
    etf1RatioInput: document.getElementById('etf1RatioInput'),
    etf2RatioInput: document.getElementById('etf2RatioInput'),
    inputEtf1Ticker: document.getElementById('inputEtf1Ticker'),
    inputEtf2Ticker: document.getElementById('inputEtf2Ticker'),
    quickRatioButtons: document.querySelectorAll('.btn-quick-ratio'),
    ratioSlider: document.getElementById('ratioSlider'),
    ratioSummary: document.getElementById('ratioSummary'),
    ratioFill1: document.getElementById('ratioFill1'),
    ratioFill2: document.getElementById('ratioFill2'),
    sliderEtf1Label: document.getElementById('sliderEtf1Label'),
    sliderEtf2Label: document.getElementById('sliderEtf2Label'),

    monthsGrid: document.getElementById('monthsGrid'),
    activeMonthsCount: document.getElementById('activeMonthsCount'),
    presetButtons: document.querySelectorAll('.btn-preset'),

    // 🌟 신규: 리밸런싱 주기 엘리먼트 (1 ~ 360개월)
    rebalMonths: document.getElementById('rebalMonths'),
    rebalSlider: document.getElementById('rebalSlider'),
    rebalMonthsPreview: document.getElementById('rebalMonthsPreview'),
    quickRebalButtons: document.querySelectorAll('.btn-quick-rebal'),

    feeRate: document.getElementById('feeRate'),
    btnRunBacktest: document.getElementById('btnRunBacktest'),

    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),

    // 상단 인포 바
    infoPortfolio: document.getElementById('infoPortfolio'),
    infoSeasonMonths: document.getElementById('infoSeasonMonths'),
    infoRebal: document.getElementById('infoRebal'),
    infoPeriod: document.getElementById('infoPeriod'),

    // 🌟 신규: 가상 데이터 경고 배너
    syntheticWarningBanner: document.getElementById('syntheticWarningBanner'),
    syntheticWarningText: document.getElementById('syntheticWarningText'),

    // 🌟 메인 탭 네비게이션
    tabBtnSeasonality: document.getElementById('tabBtnSeasonality'),
    tabBtnPermanent: document.getElementById('tabBtnPermanent'),
    tabBtnAllWeather: document.getElementById('tabBtnAllWeather'),
    tabBtnDynamic: document.getElementById('tabBtnDynamic'),
    paneSeasonality: document.getElementById('paneSeasonality'),
    panePermanent: document.getElementById('panePermanent'),
    paneAllWeather: document.getElementById('paneAllWeather'),
    paneDynamic: document.getElementById('paneDynamic'),

    // 🌟 [Tab 4] 동적 자산 배분 DOM 엘리먼트 🌟
    dynLiveSignalHero: document.getElementById('dynLiveSignalHero'),
    dynAsOfBadge: document.getElementById('dynAsOfBadge'),
    dynRegimeBadge: document.getElementById('dynRegimeBadge'),
    dynStratNameLabel: document.getElementById('dynStratNameLabel'),
    dynRegimeRationale: document.getElementById('dynRegimeRationale'),
    dynCanaryCard: document.getElementById('dynCanaryCard'),
    dynCanaryList: document.getElementById('dynCanaryList'),
    dynDonutChart: document.getElementById('dynDonutChart'),
    dynRecomTableBody: document.getElementById('dynRecomTableBody'),

    dynStrategySelect: document.getElementById('dynStrategySelect'),
    dynStrategyDescCard: document.getElementById('dynStrategyDescCard'),
    dynDescTitle: document.getElementById('dynDescTitle'),
    dynDescText: document.getElementById('dynDescText'),
    dynBenchmarkSelect: document.getElementById('dynBenchmarkSelect'),
    dynStartDate: document.getElementById('dynStartDate'),
    dynEndDate: document.getElementById('dynEndDate'),
    dynPeriodButtons: document.querySelectorAll('.btn-dyn-period'),
    dynInitCap: document.getElementById('dynInitCap'),
    dynInitCapPreview: document.getElementById('dynInitCapPreview'),
    dynMonthlyAdd: document.getElementById('dynMonthlyAdd'),
    dynMonthlyAddPreview: document.getElementById('dynMonthlyAddPreview'),
    dynFeeRate: document.getElementById('dynFeeRate'),
    btnRunDynBacktest: document.getElementById('btnRunDynBacktest'),

    dynKpiStratName: document.getElementById('dynKpiStratName'),
    dynValFinal: document.getElementById('dynValFinal'),
    dynValBmFinal: document.getElementById('dynValBmFinal'),
    dynBmLabel1: document.getElementById('dynBmLabel1'),
    dynCagrVal: document.getElementById('dynCagrVal'),
    dynCagrBm: document.getElementById('dynCagrBm'),
    dynBmLabel2: document.getElementById('dynBmLabel2'),
    dynMddVal: document.getElementById('dynMddVal'),
    dynMddBm: document.getElementById('dynMddBm'),
    dynBmLabel3: document.getElementById('dynBmLabel3'),
    dynSharpeVal: document.getElementById('dynSharpeVal'),
    dynSharpeBm: document.getElementById('dynSharpeBm'),
    dynBmLabel4: document.getElementById('dynBmLabel4'),
    dynMarVal: document.getElementById('dynMarVal'),
    dynMarBm: document.getElementById('dynMarBm'),
    dynBmLabel5: document.getElementById('dynBmLabel5'),

    btnDynScaleLog: document.getElementById('btnDynScaleLog'),
    btnDynScaleLinear: document.getElementById('btnDynScaleLinear'),
    dynEquityChart: document.getElementById('dynEquityChart'),
    dynDrawdownChart: document.getElementById('dynDrawdownChart'),
    dynWeightsChart: document.getElementById('dynWeightsChart'),
    dynCrisisTableBody: document.getElementById('dynCrisisTableBody'),

    // 🌟 영구 포트폴리오 DOM 엘리먼트
    permInitCap: document.getElementById('permInitCap'),
    permInitCapPreview: document.getElementById('permInitCapPreview'),
    permMonthlyAdd: document.getElementById('permMonthlyAdd'),
    permMonthlyAddPreview: document.getElementById('permMonthlyAddPreview'),
    permStartDate: document.getElementById('permStartDate'),
    permEndDate: document.getElementById('permEndDate'),
    permPeriodPreview: document.getElementById('permPeriodPreview'),
    permQuickPeriods: document.querySelectorAll('.btn-perm-period'),

    permWeightSpy: document.getElementById('permWeightSpy'),
    permWeightTlt: document.getElementById('permWeightTlt'),
    permWeightGld: document.getElementById('permWeightGld'),
    permWeightBil: document.getElementById('permWeightBil'),
    permSliderSpy: document.getElementById('permSliderSpy'),
    permSliderTlt: document.getElementById('permSliderTlt'),
    permSliderGld: document.getElementById('permSliderGld'),
    permSliderBil: document.getElementById('permSliderBil'),
    permWeightsSum: document.getElementById('permWeightsSum'),
    btnNormalizeWeights: document.getElementById('btnNormalizeWeights'),
    permWeightPresets: document.querySelectorAll('.btn-perm-weight'),

    permBarSpy: document.getElementById('permBarSpy'),
    permBarTlt: document.getElementById('permBarTlt'),
    permBarGld: document.getElementById('permBarGld'),
    permBarBil: document.getElementById('permBarBil'),

    // 영구 포트폴리오 계절성
    permMonthsGrid: document.getElementById('permMonthsGrid'),
    permActiveMonthsCount: document.getElementById('permActiveMonthsCount'),
    permSeasonPresets: document.querySelectorAll('.btn-perm-season-preset'),

    permRebalPreview: document.getElementById('permRebalPreview'),
    permQuickRebals: document.querySelectorAll('.btn-perm-rebal'),
    permFeeRate: document.getElementById('permFeeRate'),
    btnRunPermBacktest: document.getElementById('btnRunPermBacktest'),

    permInfoWeights: document.getElementById('permInfoWeights'),
    permInfoRebal: document.getElementById('permInfoRebal'),
    permInfoPeriod: document.getElementById('permInfoPeriod'),

    permFinalVal: document.getElementById('permFinalVal'),
    permFinalSpy: document.getElementById('permFinalSpy'),
    permFinal6040: document.getElementById('permFinal6040'),
    permCagrVal: document.getElementById('permCagrVal'),
    permCagrSpy: document.getElementById('permCagrSpy'),
    permCagr6040: document.getElementById('permCagr6040'),
    permMddVal: document.getElementById('permMddVal'),
    permMddSpy: document.getElementById('permMddSpy'),
    permMddDefense: document.getElementById('permMddDefense'),
    permSharpeVal: document.getElementById('permSharpeVal'),
    permSharpeSpy: document.getElementById('permSharpeSpy'),
    permSharpe6040: document.getElementById('permSharpe6040'),
    permMarVal: document.getElementById('permMarVal'),
    permMarSpy: document.getElementById('permMarSpy'),
    permMar6040: document.getElementById('permMar6040'),

    permCrisisTableBody: document.getElementById('permCrisisTableBody'),
    btnPermScaleLog: document.getElementById('btnPermScaleLog'),
    btnPermScaleLinear: document.getElementById('btnPermScaleLinear'),

    // 🌟 올웨더 포트폴리오 DOM 엘리먼트 (Tab 3) 🌟
    awInitCap: document.getElementById('awInitCap'),
    awInitCapPreview: document.getElementById('awInitCapPreview'),
    awMonthlyAdd: document.getElementById('awMonthlyAdd'),
    awMonthlyAddPreview: document.getElementById('awMonthlyAddPreview'),
    awStartDate: document.getElementById('awStartDate'),
    awEndDate: document.getElementById('awEndDate'),
    awPeriodPreview: document.getElementById('awPeriodPreview'),
    awQuickPeriods: document.querySelectorAll('.btn-aw-period'),

    awWeightSpy: document.getElementById('awWeightSpy'),
    awSliderSpy: document.getElementById('awSliderSpy'),
    awWeightTlt: document.getElementById('awWeightTlt'),
    awSliderTlt: document.getElementById('awSliderTlt'),
    awWeightIef: document.getElementById('awWeightIef'),
    awSliderIef: document.getElementById('awSliderIef'),
    awWeightGld: document.getElementById('awWeightGld'),
    awSliderGld: document.getElementById('awSliderGld'),
    awWeightDbc: document.getElementById('awWeightDbc'),
    awSliderDbc: document.getElementById('awSliderDbc'),
    awWeightsSum: document.getElementById('awWeightsSum'),
    btnAwResetClassic: document.getElementById('btnAwResetClassic'),
    btnNormalizeAwWeights: document.getElementById('btnNormalizeAwWeights'),

    awBarSpy: document.getElementById('awBarSpy'),
    awBarTlt: document.getElementById('awBarTlt'),
    awBarIef: document.getElementById('awBarIef'),
    awBarGld: document.getElementById('awBarGld'),
    awBarDbc: document.getElementById('awBarDbc'),

    // 올웨더 계절성
    awMonthsGrid: document.getElementById('awMonthsGrid'),
    awActiveMonthsCount: document.getElementById('awActiveMonthsCount'),
    awSeasonPresets: document.querySelectorAll('.btn-aw-season-preset'),

    awRebalPreview: document.getElementById('awRebalPreview'),
    awQuickRebals: document.querySelectorAll('.btn-aw-rebal'),
    awFeeRate: document.getElementById('awFeeRate'),
    btnRunAwBacktest: document.getElementById('btnRunAwBacktest'),

    awInfoWeights: document.getElementById('awInfoWeights'),
    awInfoRebal: document.getElementById('awInfoRebal'),
    awInfoPeriod: document.getElementById('awInfoPeriod'),

    awFinalVal: document.getElementById('awFinalVal'),
    awFinalSpy: document.getElementById('awFinalSpy'),
    awFinal6040: document.getElementById('awFinal6040'),
    awCagrVal: document.getElementById('awCagrVal'),
    awCagrSpy: document.getElementById('awCagrSpy'),
    awCagr6040: document.getElementById('awCagr6040'),
    awMddVal: document.getElementById('awMddVal'),
    awMddSpy: document.getElementById('awMddSpy'),
    awMddDefense: document.getElementById('awMddDefense'),
    awSharpeVal: document.getElementById('awSharpeVal'),
    awSharpeSpy: document.getElementById('awSharpeSpy'),
    awSharpe6040: document.getElementById('awSharpe6040'),
    awMarVal: document.getElementById('awMarVal'),
    awMarSpy: document.getElementById('awMarSpy'),
    awMar6040: document.getElementById('awMar6040'),

    awCrisisTableBody: document.getElementById('awCrisisTableBody'),
    btnAwScaleLog: document.getElementById('btnAwScaleLog'),
    btnAwScaleLinear: document.getElementById('btnAwScaleLinear'),

    // 요약 리포트 패널
    summaryBody: document.getElementById('summaryBody'),

    // 1:1 비교 테이블
    comparisonTableBody: document.getElementById('comparisonTableBody'),

    // KPI 메트릭 엘리먼트
    mTrStrat: document.getElementById('mTrStrat'),
    mTrBH: document.getElementById('mTrBH'),
    mCagrStrat: document.getElementById('mCagrStrat'),
    mCagrBH: document.getElementById('mCagrBH'),
    mCagrDelta: document.getElementById('mCagrDelta'),
    mMddStrat: document.getElementById('mMddStrat'),
    mMddBH: document.getElementById('mMddBH'),
    mMddReduction: document.getElementById('mMddReduction'),
    mWorstMddStrat: document.getElementById('mWorstMddStrat'),
    mWorstMddBH: document.getElementById('mWorstMddBH'),
    mWorstMddDiff: document.getElementById('mWorstMddDiff'),
    mMarStrat: document.getElementById('mMarStrat'),
    mMarBH: document.getElementById('mMarBH'),
    mFinalStrat: document.getElementById('mFinalStrat'),
    mFinalBH: document.getElementById('mFinalBH'),
    mFinalDelta: document.getElementById('mFinalDelta'),

    // 차트 스케일 버튼
    btnScaleLinear: document.getElementById('btnScaleLinear'),
    btnScaleLog: document.getElementById('btnScaleLog'),

    // 연도별 테이블
    annualTableBody: document.querySelector('#annualTable tbody')
  };

  // ── 포맷터 유틸리티 ──
  function formatKoreanMoney(val) {
    if (val === 0) return '0원';
    const num = Math.abs(val);
    const eok = Math.floor(num / 100000000);
    const man = Math.floor((num % 100000000) / 10000);
    let str = '';
    if (eok > 0) str += `${eok.toLocaleString()}억 `;
    if (man > 0) str += `${man.toLocaleString()}만 `;
    if (!str) str = `${num.toLocaleString()} `;
    return `${val < 0 ? '-' : ''}${str.trim()}원`;
  }
  const formatMoneyKr = formatKoreanMoney;

  function formatCurrency(val) {
    return Number(val).toLocaleString('ko-KR') + '원';
  }

  function formatPercent(val, withSign = true) {
    const n = Number(val);
    const sign = withSign && n > 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  }

  // ── 초기화: 1월~12월 그리드 생성 ──
  function initMonthsGrid() {
    el.monthsGrid.innerHTML = '';
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    for (let m = 1; m <= 12; m++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'month-toggle-btn';
      btn.dataset.month = m;
      if (state.season_months.includes(m)) {
        btn.classList.add('selected');
      }

      btn.innerHTML = `
        <span class="m-num">${monthNames[m - 1]}</span>
        <span class="m-tag">${state.season_months.includes(m) ? '매수' : '파킹'}</span>
      `;

      btn.addEventListener('click', () => {
        toggleMonth(m);
      });

      el.monthsGrid.appendChild(btn);
    }
    updateMonthsUI();
  }

  function toggleMonth(m) {
    const idx = state.season_months.indexOf(m);
    if (idx > -1) {
      state.season_months.splice(idx, 1);
    } else {
      state.season_months.push(m);
      state.season_months.sort((a, b) => a - b);
    }
    el.presetButtons.forEach(b => b.classList.remove('active'));
    updateMonthsUI();
  }

  function setSeasonMonths(arr, presetKey = null) {
    state.season_months = [...arr].sort((a, b) => a - b);
    if (presetKey) {
      el.presetButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.preset === presetKey);
      });
    }
    updateMonthsUI();
  }

  function updateMonthsUI() {
    const buttons = el.monthsGrid.querySelectorAll('.month-toggle-btn');
    buttons.forEach(btn => {
      const m = parseInt(btn.dataset.month, 10);
      const isSelected = state.season_months.includes(m);
      btn.classList.toggle('selected', isSelected);
      const tag = btn.querySelector('.m-tag');
      if (tag) tag.textContent = isSelected ? '매수' : '파킹';
    });

    const count = state.season_months.length;
    el.activeMonthsCount.textContent = `${count}개월 보유 (${12 - count}개월 파킹)`;
    if (count === 12) {
      el.activeMonthsCount.className = 'count-badge';
      el.activeMonthsCount.textContent = '12개월 상시보유 (Buy&Hold)';
    } else if (count === 0) {
      el.activeMonthsCount.className = 'count-badge';
      el.activeMonthsCount.textContent = '0개월 (전량 안전자산)';
    }
  }

  // ── 프리셋 버튼 이벤트 ──
  el.presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      if (p === 'halloween') {
        setSeasonMonths([1, 2, 3, 4, 11, 12], 'halloween');
      } else if (p === 'santa') {
        setSeasonMonths([1, 11, 12], 'santa');
      } else if (p === 'summer') {
        setSeasonMonths([6, 7, 8], 'summer');
      } else if (p === 'firstHalf') {
        setSeasonMonths([1, 2, 3, 4, 5, 6], 'firstHalf');
      } else if (p === 'all') {
        setSeasonMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'all');
      } else if (p === 'clear') {
        setSeasonMonths([], 'clear');
      }
    });
  });

  // ── 🌟 비중 양방향 제어 로직 (TQQQ 및 ETF 1 비중 독립 입력 및 슬라이더 연동) 🌟 ──
  function setRatios(r1, updateInputs = true) {
    r1 = Math.max(0, Math.min(100, Math.round(r1)));
    const r2 = 100 - r1;

    state.etf1_ratio = r1;
    state.etf2_ratio = r2;

    if (updateInputs) {
      el.etf1RatioInput.value = r1;
      el.etf2RatioInput.value = r2;
    }
    el.ratioSlider.value = r1;

    el.ratioSummary.textContent = `${state.etf1} ${r1}% : ${state.etf2} ${r2}%`;
    el.ratioFill1.style.width = `${r1}%`;
    el.ratioFill2.style.width = `${r2}%`;
    el.sliderEtf1Label.textContent = `${state.etf1}: ${r1}%`;
    el.sliderEtf2Label.textContent = `${state.etf2}: ${r2}%`;
  }

  // 슬라이더 이벤트
  el.ratioSlider.addEventListener('input', (e) => {
    setRatios(parseFloat(e.target.value));
  });

  // ETF 1 비중 직접 입력창
  el.etf1RatioInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setRatios(val, false);
      el.etf2RatioInput.value = 100 - Math.max(0, Math.min(100, Math.round(val)));
    }
  });

  // ETF 2 (TQQQ 등) 비중 직접 입력창
  el.etf2RatioInput.addEventListener('input', (e) => {
    const val2 = parseFloat(e.target.value);
    if (!isNaN(val2)) {
      const clamped2 = Math.max(0, Math.min(100, Math.round(val2)));
      const r1 = 100 - clamped2;
      setRatios(r1, false);
      el.etf1RatioInput.value = r1;
    }
  });

  // 퀵 비중 버튼들
  el.quickRatioButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const r1 = parseFloat(btn.dataset.r1);
      setRatios(r1);
    });
  });

  // ── 자본금 및 적립금 입력창 연동 ──
  el.initCap.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    state.init_cap = val;
    el.initCapPreview.textContent = formatKoreanMoney(val);
  });

  el.monthlyAdd.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    state.monthly_add = val;
    el.monthlyAddPreview.textContent = formatKoreanMoney(val);
  });

  // ── 🌟 신규: 투자 시작 및 종료 날짜 제어 로직 🌟 ──
  function updatePeriodPreview() {
    const s = el.startDate.value;
    const e = el.endDate.value;
    if (!s || !e) return;

    const d1 = new Date(s);
    const d2 = new Date(e);
    const diffMonths = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30.4375)));
    const y = Math.floor(diffMonths / 12);
    const m = diffMonths % 12;

    let str = '';
    if (y > 0) str += `${y}년 `;
    if (m > 0) str += `${m}개월`;
    if (!str) str = `${diffMonths}개월`;
    el.periodDurationPreview.textContent = str.trim() + ' 투자';
  }

  async function fetchDateRange() {
    try {
      const res = await fetch(`/api/date_range?etf1=${state.etf1}&etf2=${state.etf2}`);
      const data = await res.json();
      if (data.status === 'success') {
        state.min_date = data.min_date || '1970-01-01';
        state.data_min_date = data.data_min_date || data.min_date;
        state.max_date = data.max_date;

        el.startDate.min = '1970-01-01';
        el.startDate.max = data.max_date;
        el.endDate.min = '1970-01-01';
        el.endDate.max = data.max_date;

        if (!state.start_date || state.start_date < state.data_min_date) {
          state.start_date = data.default_start || '2001-01-01';
        }
        // 마지막 날짜는 항상 최신 날짜로 동기화
        state.end_date = data.default_end || data.max_date;

        el.startDate.value = state.start_date;
        el.endDate.value = state.end_date;
        updatePeriodPreview();
      }
    } catch (e) {
      console.warn('날짜 범위 로드 실패:', e);
    }
  }

  function applyQuickPeriod(type) {
    if (!state.max_date) return;
    const end = new Date(state.max_date);
    let start = new Date(state.data_min_date || state.min_date);

    if (type === 'max') {
      start = new Date('1970-01-01');
    } else if (type === '2001') {
      start = new Date('2001-01-01');
    } else if (type === '2008') {
      start = new Date('2008-01-01');
    } else if (type === '10y') {
      start = new Date(end);
      start.setFullYear(start.getFullYear() - 10);
    } else if (type === 'covid') {
      start = new Date('2020-01-01');
    }

    const minD = new Date(state.data_min_date || state.min_date);
    if (start < minD) start = minD;

    state.start_date = start.toISOString().split('T')[0];
    state.end_date = end.toISOString().split('T')[0];

    el.startDate.value = state.start_date;
    el.endDate.value = state.end_date;

    el.quickPeriodButtons.forEach(b => {
      b.classList.toggle('active', b.dataset.period === type);
    });
    updatePeriodPreview();
  }

  el.quickPeriodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyQuickPeriod(btn.dataset.period);
    });
  });

  el.startDate.addEventListener('change', (e) => {
    state.start_date = e.target.value;
    el.quickPeriodButtons.forEach(b => b.classList.remove('active'));
    updatePeriodPreview();
  });

  el.endDate.addEventListener('change', (e) => {
    state.end_date = e.target.value;
    el.quickPeriodButtons.forEach(b => b.classList.remove('active'));
    updatePeriodPreview();
  });

  // ── 티커 로드 및 검색 바 초기화 ──
  async function loadTickers() {
    try {
      const res = await fetch('/api/tickers');
      const data = await res.json();
      state.tickerDetails = data.details || {};

      el.etf1SearchInput.value = state.etf1;
      el.etf2SearchInput.value = state.etf2;

      updateEtfDetails(1, state.etf1);
      updateEtfDetails(2, state.etf2);
      setRatios(50);
    } catch (err) {
      console.error('티커 로드 실패:', err);
    }
  }

  function updateEtfDetails(num, ticker, info = null) {
    if (!info) {
      info = state.tickerDetails[ticker] || { name_kr: ticker, category: '종목/ETF' };
    }

    if (num === 1) {
      state.etf1 = ticker;
      el.etf1SearchInput.value = ticker;
      el.etf1Badge.textContent = `${info.name_kr || info.name || ''} (${info.category || '종목'})`;
      el.inputEtf1Ticker.textContent = ticker;
      el.sliderEtf1Label.textContent = `${ticker}: ${state.etf1_ratio}%`;
    } else {
      state.etf2 = ticker;
      el.etf2SearchInput.value = ticker;
      el.etf2Badge.textContent = `${info.name_kr || info.name || ''} (${info.category || '종목'})`;
      el.inputEtf2Ticker.textContent = ticker;
      el.sliderEtf2Label.textContent = `${ticker}: ${state.etf2_ratio}%`;
    }

    el.ratioSummary.textContent = `${state.etf1} ${state.etf1_ratio}% : ${state.etf2} ${state.etf2_ratio}%`;
    fetchDateRange();
  }

  // ── 🌟 신규: Yahoo Finance 티커 검색 자동완성 셋업 🌟 ──
  function setupTickerSearch(num) {
    const input = num === 1 ? el.etf1SearchInput : el.etf2SearchInput;
    const dropdown = num === 1 ? el.etf1Dropdown : el.etf2Dropdown;
    const clearBtn = num === 1 ? el.etf1ClearBtn : el.etf2ClearBtn;

    let debounceTimer = null;

    async function search(q) {
      try {
        const res = await fetch(`/api/search_ticker?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.status === 'success') {
          renderDropdown(data.results);
        }
      } catch (e) {
        console.warn('검색 에러:', e);
      }
    }

    function renderDropdown(items) {
      if (!items || items.length === 0) {
        dropdown.innerHTML = `<div class="dropdown-item" style="color: #64748b; font-size: 0.8rem;">검색 결과가 없습니다.</div>`;
        dropdown.classList.add('active');
        return;
      }

      let html = '';
      items.forEach(item => {
        html += `
          <div class="dropdown-item" data-sym="${item.symbol}" data-name="${item.name}" data-cat="${item.category}">
            <div class="dropdown-item-left">
              <span class="dropdown-symbol">${item.symbol}</span>
              <span class="dropdown-name" title="${item.name}">${item.name}</span>
            </div>
            <span class="dropdown-badge">${item.category}</span>
          </div>
        `;
      });

      dropdown.innerHTML = html;
      dropdown.classList.add('active');

      dropdown.querySelectorAll('.dropdown-item').forEach(elItem => {
        elItem.addEventListener('click', () => {
          const sym = elItem.dataset.sym;
          const name = elItem.dataset.name;
          const cat = elItem.dataset.cat;
          updateEtfDetails(num, sym, { name_kr: name, category: cat });
          dropdown.classList.remove('active');
          clearBtn.style.display = 'block';
        });
      });
    }

    input.addEventListener('focus', () => {
      search(input.value.trim());
    });

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearBtn.style.display = q ? 'block' : 'none';
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        search(q);
      }, 250);
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      input.focus();
      search('');
    });

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target) && !clearBtn.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });

    // 엔터키 입력 시 최상단 아이템 또는 직접 입력 티커 선택
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = dropdown.querySelector('.dropdown-item');
        if (first && first.dataset.sym) {
          updateEtfDetails(num, first.dataset.sym, { name_kr: first.dataset.name, category: first.dataset.cat });
        } else if (input.value.trim()) {
          const sym = input.value.trim().toUpperCase();
          updateEtfDetails(num, sym, { name_kr: sym, category: '직접입력' });
        }
        dropdown.classList.remove('active');
      }
    });
  }

  // ── 🌟 리밸런싱 주기 설정 핸들러 (1 ~ 360개월 지원) 🌟 ──
  function setRebalMonths(m, updateInput = true) {
    m = Math.max(1, Math.min(360, parseInt(m, 10) || 1));
    state.rebal_months = m;
    if (updateInput) {
      el.rebalMonths.value = m;
    }
    if (el.rebalSlider) {
      el.rebalSlider.value = m;
    }

    let label = '';
    if (m === 1) {
      label = '1개월 (매월 리밸런싱)';
    } else if (m < 12) {
      label = `${m}개월 단위 리밸런싱`;
    } else {
      const y = Math.floor(m / 12);
      const rem = m % 12;
      label = rem > 0 ? `${m}개월 (${y}년 ${rem}개월 주기)` : `${m}개월 (${y}년 주기)`;
    }
    el.rebalMonthsPreview.textContent = label;

    el.quickRebalButtons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.rebal, 10) === m);
    });
  }

  el.rebalMonths.addEventListener('input', (e) => {
    setRebalMonths(e.target.value, false);
  });

  if (el.rebalSlider) {
    el.rebalSlider.addEventListener('input', (e) => {
      setRebalMonths(e.target.value, true);
    });
  }

  el.quickRebalButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setRebalMonths(btn.dataset.rebal);
    });
  });

  // ── Yahoo Finance 데이터 상태 확인 ──
  async function checkDataStatus() {
    try {
      const res = await fetch('/api/status');
      const st = await res.json();

      if (st.ready) {
        state.isDataReady = true;
        el.dataStatusText.textContent = `Yahoo Finance 로드 완료 (${st.start_date} ~ ${st.end_date})`;
        el.dataStatusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        el.dataStatusBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
        el.dataStatusBadge.querySelector('.status-dot').style.backgroundColor = '#10b981';
        el.dataStatusBadge.querySelector('.status-dot').classList.remove('pulsing');
        return true;
      } else if (st.loading) {
        state.isDataReady = false;
        el.dataStatusText.textContent = 'Yahoo Finance에서 최신 일봉 수집 중...';
        el.dataStatusBadge.style.background = 'rgba(59, 130, 246, 0.15)';
        el.dataStatusBadge.style.borderColor = 'rgba(59, 130, 246, 0.35)';
        el.dataStatusBadge.querySelector('.status-dot').style.backgroundColor = '#3b82f6';
        el.dataStatusBadge.querySelector('.status-dot').classList.add('pulsing');
        return false;
      } else if (st.error) {
        state.isDataReady = false;
        el.dataStatusText.textContent = `오류: ${st.error.slice(0, 30)}...`;
        el.dataStatusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        el.dataStatusBadge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
        el.dataStatusBadge.querySelector('.status-dot').style.backgroundColor = '#ef4444';
        return false;
      }
    } catch (e) {
      console.warn('상태 확인 실패:', e);
      return false;
    }
  }

  el.btnRefreshData.addEventListener('click', async () => {
    try {
      await fetch('/api/refresh_data', { method: 'POST' });
      showLoading('Yahoo Finance 최신 데이터 다운로드를 시작합니다...');
      pollStatusUntilReady();
    } catch (e) {
      alert('데이터 새로고침 요청 실패: ' + e);
    }
  });

  async function pollStatusUntilReady(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      const ready = await checkDataStatus();
      if (ready) {
        hideLoading();
        runBacktest();
        return;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    hideLoading();
    alert('Yahoo Finance 데이터 수집 대기 시간이 초과되었습니다.');
  }

  function showLoading(text = '백테스트 연산 수행 중...') {
    el.loadingText.textContent = text;
    el.loadingOverlay.classList.add('active');
  }

  function hideLoading() {
    el.loadingOverlay.classList.remove('active');
  }

  // ── 백테스트 실행 ──
  async function runBacktest() {
    if (!state.isDataReady) {
      showLoading('Yahoo Finance 데이터를 준비하고 있습니다...');
      const ready = await checkDataStatus();
      if (!ready) {
        pollStatusUntilReady();
        return;
      }
    }

    showLoading('계절성 스위칭 백테스트 및 퀀트 지표 연산 중...');

    const payload = {
      etf1: state.etf1,
      etf2: state.etf2,
      etf1_ratio: state.etf1_ratio,
      etf2_ratio: state.etf2_ratio,
      init_cap: state.init_cap,
      monthly_add: state.monthly_add,
      season_months: state.season_months,
      rebal_months: state.rebal_months,
      start_date: el.startDate.value || state.start_date,
      end_date: el.endDate.value || state.end_date,
      fee_rate: parseFloat(el.feeRate.value) || 0.1
    };

    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.status !== 'success') {
        throw new Error(data.message || '백테스트 연산 실패');
      }

      state.latestResult = data;
      renderDashboard(data);
    } catch (err) {
      alert('백테스트 실패: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  el.btnRunBacktest.addEventListener('click', runBacktest);

  // ── 대시보드 전체 렌더링 ──
  function renderDashboard(data) {
    const { info, metrics, summary, chart, annual_results, monthly_seasonality } = data;
    const strat = metrics.strategy;
    const bh = metrics.buy_and_hold;

    // 1. 상단 인포 바
    el.infoPortfolio.textContent = `${info.etf1} (${info.etf1_ratio}%) + ${info.etf2} (${info.etf2_ratio}%)`;
    const mStr = info.season_months.length > 0 ? info.season_months.join(', ') + '월' : '없음 (전량 안전자산)';
    el.infoSeasonMonths.textContent = `${mStr} (총 ${info.season_months.length}개월)`;
    el.infoRebal.textContent = `${info.rebal_months || 1}개월 주기 (계절성: ${info.total_rebalances_strat || 0}회 / B&H: ${info.total_rebalances_bh || 0}회)`;
    el.infoPeriod.textContent = `${info.start_date} ~ ${info.end_date} (${info.trading_days.toLocaleString()} 거래일)`;

    // 🌟 가상 합성 데이터 안내 배너 표시
    if (info.has_synthetic) {
      el.syntheticWarningBanner.style.display = 'flex';
      el.syntheticWarningText.textContent = info.synthetic_notice || "⚠️ 2010년 이전 데이터는 기초 지수(^NDX, ^SOX)를 바탕으로 레버리지 배수를 곱해 합성된 가상 데이터(Synthetic Data)입니다. 롤오버 비용이 제외되어 실제보다 낙관적일 수 있습니다.";
    } else {
      el.syntheticWarningBanner.style.display = 'none';
    }

    // 2. 🌟 신규: 백테스트 종합 성과 요약 (Executive Summary) 렌더링
    renderExecutiveSummary(summary, strat, bh);

    // 3. 🌟 신규: 1:1 비교 표 (Comparison Matrix Table) 렌더링
    renderComparisonTable(strat, bh);

    // 4. 핵심 KPI 카드 (CAGR, MDD, 최악의 해의 MDD, TR, MAR, 최종평가액)
    el.mTrStrat.textContent = formatPercent(strat.tr_pct);
    el.mTrBH.textContent = formatPercent(bh.tr_pct);

    el.mCagrStrat.textContent = formatPercent(strat.cagr_pct);
    el.mCagrBH.textContent = formatPercent(bh.cagr_pct);
    const cagrDiff = strat.cagr_pct - bh.cagr_pct;
    el.mCagrDelta.textContent = `${cagrDiff >= 0 ? '+' : ''}${cagrDiff.toFixed(2)}%p 초과 알파`;
    el.mCagrDelta.style.color = cagrDiff >= 0 ? '#34d399' : '#f87171';

    el.mMddStrat.textContent = formatPercent(strat.mdd_pct, false);
    el.mMddBH.textContent = formatPercent(bh.mdd_pct, false);
    const mddSaved = Math.abs(bh.mdd_pct) - Math.abs(strat.mdd_pct);
    el.mMddReduction.textContent = `MDD 방어: ${mddSaved >= 0 ? '+' : ''}${mddSaved.toFixed(1)}%p 개선`;

    el.mWorstMddStrat.textContent = `${strat.worst_year}년 (${formatPercent(strat.worst_year_mdd_pct, false)})`;
    el.mWorstMddBH.textContent = `${bh.worst_year}년 (${formatPercent(bh.worst_year_mdd_pct, false)})`;
    const worstDiff = Math.abs(bh.worst_year_mdd_pct) - Math.abs(strat.worst_year_mdd_pct);
    el.mWorstMddDiff.textContent = `최악의 해 방어: ${worstDiff >= 0 ? '+' : ''}${worstDiff.toFixed(1)}%p 개선`;

    el.mMarStrat.textContent = `${strat.mar_ratio}`;
    el.mMarBH.textContent = `${bh.mar_ratio}`;

    el.mFinalStrat.textContent = formatCurrency(strat.final_value);
    el.mFinalBH.textContent = formatCurrency(bh.final_value);
    const alphaVal = strat.final_value - bh.final_value;
    el.mFinalDelta.textContent = `${alphaVal >= 0 ? '+' : ''}${formatKoreanMoney(alphaVal)} (초과 알파)`;
    el.mFinalDelta.style.color = alphaVal >= 0 ? '#34d399' : '#f87171';

    // 5. 인터랙티브 차트들 렌더링
    renderEquityChart(chart);
    renderDrawdownChart(chart);
    renderSeasonalityChart(monthly_seasonality);
    renderAnnualChart(annual_results);

    // 6. 연도별 테이블 렌더링
    renderAnnualTable(annual_results);
  }

  // ── 🌟 신규: 백테스트 성과 요약 렌더링 🌟 ──
  function renderExecutiveSummary(summary, strat, bh) {
    if (!summary || !summary.bullets) return;

    let html = '';
    summary.bullets.forEach(b => {
      const parts = b.split(': ');
      if (parts.length === 2) {
        html += `
          <div class="summary-item">
            <i class="fa-solid fa-circle-dot dot"></i>
            <div><strong>${parts[0]}:</strong> ${parts[1]}</div>
          </div>
        `;
      } else {
        html += `
          <div class="summary-item">
            <i class="fa-solid fa-circle-dot dot"></i>
            <div>${b}</div>
          </div>
        `;
      }
    });

    el.summaryBody.innerHTML = html;
  }

  // ── 🌟 신규: 해당 전략 vs 단순 보유 전략 1:1 비교 표 렌더링 🌟 ──
  function renderComparisonTable(strat, bh) {
    const rows = [
      {
        name: 'TR (총 누적 수익률)',
        stratVal: formatPercent(strat.tr_pct),
        bhVal: formatPercent(bh.tr_pct),
        diff: `${(strat.tr_pct - bh.tr_pct >= 0 ? '+' : '')}${(strat.tr_pct - bh.tr_pct).toFixed(2)}%p`,
        winner: strat.tr_pct >= bh.tr_pct ? 'strat' : 'bh',
        isHigherBetter: true
      },
      {
        name: '연평균 CAGR (복리수익률)',
        stratVal: formatPercent(strat.cagr_pct),
        bhVal: formatPercent(bh.cagr_pct),
        diff: `${(strat.cagr_pct - bh.cagr_pct >= 0 ? '+' : '')}${(strat.cagr_pct - bh.cagr_pct).toFixed(2)}%p`,
        winner: strat.cagr_pct >= bh.cagr_pct ? 'strat' : 'bh',
        isHigherBetter: true
      },
      {
        name: '전체 기간 MDD (최대 낙폭)',
        stratVal: formatPercent(strat.mdd_pct, false),
        bhVal: formatPercent(bh.mdd_pct, false),
        diff: `${(Math.abs(bh.mdd_pct) - Math.abs(strat.mdd_pct) >= 0 ? '+' : '')}${(Math.abs(bh.mdd_pct) - Math.abs(strat.mdd_pct)).toFixed(2)}%p 방어`,
        winner: strat.mdd_pct >= bh.mdd_pct ? 'strat' : 'bh',
        isHigherBetter: true // MDD는 -20%가 -50%보다 큼
      },
      {
        name: '최악의 해의 MDD (Worst Year MDD)',
        stratVal: `${strat.worst_year}년 (${formatPercent(strat.worst_year_mdd_pct, false)})`,
        bhVal: `${bh.worst_year}년 (${formatPercent(bh.worst_year_mdd_pct, false)})`,
        diff: `${(Math.abs(bh.worst_year_mdd_pct) - Math.abs(strat.worst_year_mdd_pct) >= 0 ? '+' : '')}${(Math.abs(bh.worst_year_mdd_pct) - Math.abs(strat.worst_year_mdd_pct)).toFixed(2)}%p 개선`,
        winner: strat.worst_year_mdd_pct >= bh.worst_year_mdd_pct ? 'strat' : 'bh',
        isHigherBetter: true
      },
      {
        name: 'MAR 비율 (CAGR / |MDD|)',
        stratVal: `${strat.mar_ratio}`,
        bhVal: `${bh.mar_ratio}`,
        diff: `${(strat.mar_ratio - bh.mar_ratio >= 0 ? '+' : '')}${(strat.mar_ratio - bh.mar_ratio).toFixed(2)}`,
        winner: strat.mar_ratio >= bh.mar_ratio ? 'strat' : 'bh',
        isHigherBetter: true
      },
      {
        name: '최종 평가 금액',
        stratVal: formatCurrency(strat.final_value),
        bhVal: formatCurrency(bh.final_value),
        diff: `${(strat.final_value - bh.final_value >= 0 ? '+' : '')}${formatKoreanMoney(strat.final_value - bh.final_value)}`,
        winner: strat.final_value >= bh.final_value ? 'strat' : 'bh',
        isHigherBetter: true
      },
      {
        name: '순수익 (Net Profit)',
        stratVal: formatKoreanMoney(strat.net_profit),
        bhVal: formatKoreanMoney(bh.net_profit),
        diff: `${(strat.net_profit - bh.net_profit >= 0 ? '+' : '')}${formatKoreanMoney(strat.net_profit - bh.net_profit)}`,
        winner: strat.net_profit >= bh.net_profit ? 'strat' : 'bh',
        isHigherBetter: true
      },
      {
        name: '샤프 지수 (Sharpe Ratio)',
        stratVal: `${strat.sharpe}`,
        bhVal: `${bh.sharpe}`,
        diff: `${(strat.sharpe - bh.sharpe >= 0 ? '+' : '')}${(strat.sharpe - bh.sharpe).toFixed(2)}`,
        winner: strat.sharpe >= bh.sharpe ? 'strat' : 'bh',
        isHigherBetter: true
      },
      {
        name: '소르티노 지수 (Sortino Ratio)',
        stratVal: `${strat.sortino}`,
        bhVal: `${bh.sortino}`,
        diff: `${(strat.sortino - bh.sortino >= 0 ? '+' : '')}${(strat.sortino - bh.sortino).toFixed(2)}`,
        winner: strat.sortino >= bh.sortino ? 'strat' : 'bh',
        isHigherBetter: true
      },
      {
        name: '월간 승률 (Win Rate)',
        stratVal: `${strat.win_rate_pct}%`,
        bhVal: `${bh.win_rate_pct}%`,
        diff: `${(strat.win_rate_pct - bh.win_rate_pct >= 0 ? '+' : '')}${(strat.win_rate_pct - bh.win_rate_pct).toFixed(1)}%p`,
        winner: strat.win_rate_pct >= bh.win_rate_pct ? 'strat' : 'bh',
        isHigherBetter: true
      },
      {
        name: '연율화 변동성 (Volatility)',
        stratVal: `${strat.volatility_pct}%`,
        bhVal: `${bh.volatility_pct}%`,
        diff: `${(bh.volatility_pct - strat.volatility_pct >= 0 ? '-' : '+')}${Math.abs(strat.volatility_pct - bh.volatility_pct).toFixed(1)}%p`,
        winner: strat.volatility_pct <= bh.volatility_pct ? 'strat' : 'bh',
        isHigherBetter: false // 변동성은 낮을수록 우수
      },
      {
        name: '안전자산 파킹 비중',
        stratVal: `${strat.safe_time_pct}% 기간`,
        bhVal: `0.0% (상시 위험노출)`,
        diff: `전체 기간 중 ${strat.safe_time_pct}% 안전자산`,
        winner: 'strat',
        isHigherBetter: true
      },
      {
        name: '정기 리밸런싱 주기 및 횟수',
        stratVal: `${state.rebal_months}개월 (${state.latestResult?.info?.total_rebalances_strat || 0}회)`,
        bhVal: `${state.rebal_months}개월 (${state.latestResult?.info?.total_rebalances_bh || 0}회)`,
        diff: `목표비중 정기 재조정 (${state.latestResult?.info?.fee_rate_pct || 0.1}% 비용 반영)`,
        winner: 'strat',
        isHigherBetter: true
      }
    ];

    let html = '';
    rows.forEach(r => {
      const isStratWinner = r.winner === 'strat';
      const badgeStrat = isStratWinner ? `<span class="winner-badge strat">🏆 우세</span>` : '';
      const badgeBH = !isStratWinner && r.winner === 'bh' ? `<span class="winner-badge bh">🏆 우세</span>` : '';

      html += `
        <tr>
          <td style="font-weight: 600; color: #fff;">${r.name}</td>
          <td style="color: ${isStratWinner ? '#34d399' : '#cbd5e1'}; font-weight: ${isStratWinner ? '700' : '500'};">
            ${r.stratVal} ${badgeStrat}
          </td>
          <td style="color: ${!isStratWinner ? '#f87171' : '#cbd5e1'}; font-weight: ${!isStratWinner ? '700' : '500'};">
            ${r.bhVal} ${badgeBH}
          </td>
          <td style="font-weight: 700; color: #38bdf8;">${r.diff}</td>
        </tr>
      `;
    });

    el.comparisonTableBody.innerHTML = html;
  }

  // ── 차트 1: 자산 성장 곡선 ──
  function renderEquityChart(chartData) {
    const ctx = document.getElementById('equityChart').getContext('2d');
    if (state.charts.equity) state.charts.equity.destroy();

    const isLog = state.scale_type === 'log';

    state.charts.equity = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.dates,
        datasets: [
          {
            label: '계절성 스위칭 전략',
            data: chartData.strat_val,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderWidth: 2.2,
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.1
          },
          {
            label: 'Buy & Hold 단순 보유',
            data: chartData.bh_val,
            borderColor: '#f43f5e',
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            borderDash: [2, 2],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
          },
          {
            label: '누적 투자원금',
            data: chartData.invested,
            borderColor: '#94a3b8',
            backgroundColor: 'transparent',
            borderWidth: 1.2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 3,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Inter', size: 12, weight: 600 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label || '';
                const val = ctx.parsed.y;
                return `${label}: ${formatKoreanMoney(val)} (${Number(val).toLocaleString()}원)`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              maxTicksLimit: 12,
              font: { family: 'JetBrains Mono', size: 11 }
            }
          },
          y: {
            type: isLog ? 'logarithmic' : 'linear',
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: (val) => formatKoreanMoney(val)
            }
          }
        }
      }
    });
  }

  el.btnScaleLinear.addEventListener('click', () => {
    state.scale_type = 'linear';
    el.btnScaleLinear.classList.add('active');
    el.btnScaleLog.classList.remove('active');
    if (state.latestResult) renderEquityChart(state.latestResult.chart);
  });

  el.btnScaleLog.addEventListener('click', () => {
    state.scale_type = 'log';
    el.btnScaleLog.classList.add('active');
    el.btnScaleLinear.classList.remove('active');
    if (state.latestResult) renderEquityChart(state.latestResult.chart);
  });

  // ── 차트 2: 언더워터 낙폭(MDD) 차트 ──
  function renderDrawdownChart(chartData) {
    const ctx = document.getElementById('drawdownChart').getContext('2d');
    if (state.charts.drawdown) state.charts.drawdown.destroy();

    state.charts.drawdown = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.dates,
        datasets: [
          {
            label: '계절성 스위칭 MDD',
            data: chartData.strat_dd,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true
          },
          {
            label: 'Buy & Hold MDD',
            data: chartData.bh_dd,
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.15)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Inter', size: 11, weight: 600 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              maxTicksLimit: 12,
              font: { family: 'JetBrains Mono', size: 10 }
            }
          },
          y: {
            max: 0,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val}%`
            }
          }
        }
      }
    });
  }

  // ── 차트 3: 1월~12월 역대 계절성 통계 바 차트 ──
  function renderSeasonalityChart(seasonStats) {
    const ctx = document.getElementById('seasonalityChart').getContext('2d');
    if (state.charts.seasonality) state.charts.seasonality.destroy();

    const labels = seasonStats.map(s => `${s.month}월`);
    const portData = seasonStats.map(s => s.port_avg_ret);
    const bgColors = seasonStats.map(s => s.is_selected ? 'rgba(16, 185, 129, 0.8)' : 'rgba(100, 116, 139, 0.4)');
    const borderColors = seasonStats.map(s => s.is_selected ? '#10b981' : '#64748b');

    state.charts.seasonality = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '월평균 수익률 (%)',
            data: portData,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1.5,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              title: (ctx) => `${ctx[0].label} 계절성 통계`,
              label: (ctx) => {
                const s = seasonStats[ctx.dataIndex];
                const status = s.is_selected ? '🟢 전략 매수 보유월' : '⚪ 안전자산 파킹월';
                return [
                  `포트폴리오 월평균: ${s.port_avg_ret.toFixed(2)}%`,
                  `${state.etf1}: ${s.etf1_avg_ret.toFixed(2)}% | ${state.etf2}: ${s.etf2_avg_ret.toFixed(2)}%`,
                  `상태: ${status}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val}%`
            }
          }
        }
      }
    });
  }

  // ── 차트 4: 연도별 수익률 비교 바 차트 ──
  function renderAnnualChart(annualData) {
    const ctx = document.getElementById('annualChart').getContext('2d');
    if (state.charts.annual) state.charts.annual.destroy();

    const labels = annualData.map(d => `${d.year}`);
    const stratRets = annualData.map(d => d.strat_ret_pct);
    const bhRets = annualData.map(d => d.bh_ret_pct);

    state.charts.annual = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '계절성 스위칭',
            data: stratRets,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderRadius: 3
          },
          {
            label: 'Buy & Hold',
            data: bhRets,
            backgroundColor: 'rgba(244, 63, 94, 0.65)',
            borderRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Inter', size: 11, weight: 600 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val}%`
            }
          }
        }
      }
    });
  }

  // ── 테이블: 연도별 상세 성과 ──
  function renderAnnualTable(annualData) {
    el.annualTableBody.innerHTML = '';

    annualData.forEach(row => {
      const tr = document.createElement('tr');
      const alpha = row.strat_ret_pct - row.bh_ret_pct;

      const stratClass = row.strat_ret_pct >= 0 ? 'ret-pos' : 'ret-neg';
      const bhClass = row.bh_ret_pct >= 0 ? 'ret-pos' : 'ret-neg';
      const alphaClass = alpha >= 0 ? 'alpha-pos' : 'alpha-neg';

      tr.innerHTML = `
        <td style="font-weight:700; color:#fff;">${row.year}년</td>
        <td class="${stratClass}">${formatPercent(row.strat_ret_pct)}</td>
        <td class="${bhClass}">${formatPercent(row.bh_ret_pct)}</td>
        <td class="${alphaClass}">${formatPercent(alpha)}</td>
        <td style="color: #f87171;">${formatPercent(row.strat_mdd_pct, false)}</td>
        <td style="color: #f87171;">${formatPercent(row.bh_mdd_pct, false)}</td>
        <td>${formatKoreanMoney(row.strat_final_val)}</td>
        <td>${formatKoreanMoney(row.bh_final_val)}</td>
        <td style="color:#64748b;">${formatKoreanMoney(row.invested)}</td>
      `;

      el.annualTableBody.appendChild(tr);
    });
  }

  // ════════════════════════════════════════════════════════════
  // 🌟 Chart.js 역사적 위기 구간 옅은 붉은색 음영 플러그인 🌟
  // ════════════════════════════════════════════════════════════
  const crisisHighlightPlugin = {
    id: 'crisisHighlight',
    beforeDraw: (chart) => {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales || !scales.x) return;
      if (chart.config.type !== 'line') return;
      const x = scales.x;

      const labels = chart.data && chart.data.labels;
      if (!labels || labels.length === 0) return;
      if (typeof labels[0] !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(labels[0])) return;

      const crisisRanges = [
        { name: '1973 1차 오일쇼크', start: '1973-10-01', end: '1974-12-31' },
        { name: '2000 닷컴 버블', start: '2000-03-24', end: '2002-10-09' },
        { name: '2008 글로벌 금융위기', start: '2007-10-09', end: '2009-03-09' },
        { name: '2022 연준 금리인상', start: '2022-01-03', end: '2022-10-13' }
      ];

      ctx.save();
      crisisRanges.forEach(crisis => {
        let startIdx = -1;
        let endIdx = -1;

        for (let i = 0; i < labels.length; i++) {
          if (labels[i] >= crisis.start) {
            startIdx = i;
            break;
          }
        }
        for (let i = labels.length - 1; i >= 0; i--) {
          if (labels[i] <= crisis.end) {
            endIdx = i;
            break;
          }
        }

        if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
          const xStart = x.getPixelForValue(startIdx);
          const xEnd = x.getPixelForValue(endIdx);
          const width = Math.max(3, xEnd - xStart);

          // 옅은 붉은색(Light Rose) 반투명 음영 배경
          ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
          ctx.fillRect(xStart, chartArea.top, width, chartArea.bottom - chartArea.top);

          // 좌우 점선 경계선
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(xStart, chartArea.top);
          ctx.lineTo(xStart, chartArea.bottom);
          ctx.moveTo(xEnd, chartArea.top);
          ctx.lineTo(xEnd, chartArea.bottom);
          ctx.stroke();
          ctx.setLineDash([]);

          // 상단 위기명 텍스트 라벨
          if (width > 35) {
            ctx.fillStyle = '#fca5a5';
            ctx.font = '600 10px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(crisis.name, xStart + width / 2, chartArea.top + 14);
          }
        }
      });
      ctx.restore();
    }
  };

  if (typeof Chart !== 'undefined' && Chart.register) {
    Chart.register(crisisHighlightPlugin);
  }

  // ════════════════════════════════════════════════════════════
  // 🌟 상단 3대 메인 탭 네비게이션 🌟
  // ════════════════════════════════════════════════════════════
  function setupTabNavigation() {
    function activateTab(tab) {
      state.currentTab = tab;
      el.tabBtnSeasonality.classList.toggle('active', tab === 'seasonality');
      el.tabBtnPermanent.classList.toggle('active', tab === 'permanent');
      el.tabBtnAllWeather.classList.toggle('active', tab === 'allweather');
      if (el.tabBtnDynamic) el.tabBtnDynamic.classList.toggle('active', tab === 'dynamic');

      el.paneSeasonality.style.display = tab === 'seasonality' ? 'block' : 'none';
      el.panePermanent.style.display = tab === 'permanent' ? 'block' : 'none';
      el.paneAllWeather.style.display = tab === 'allweather' ? 'block' : 'none';
      if (el.paneDynamic) el.paneDynamic.style.display = tab === 'dynamic' ? 'block' : 'none';

      if (tab === 'permanent' && !state.perm.latestResult) {
        runPermanentBacktest();
      } else if (tab === 'allweather' && !state.aw.latestResult) {
        runAllWeatherBacktest();
      } else if (tab === 'dynamic') {
        if (!state.dynamic.latestSignal) {
          fetchDynamicLiveSignal(state.dynamic.strategy);
        }
        if (!state.dynamic.latestResult) {
          runDynamicBacktest();
        }
      }
    }

    el.tabBtnSeasonality.addEventListener('click', () => activateTab('seasonality'));
    el.tabBtnPermanent.addEventListener('click', () => activateTab('permanent'));
    el.tabBtnAllWeather.addEventListener('click', () => activateTab('allweather'));
    if (el.tabBtnDynamic) el.tabBtnDynamic.addEventListener('click', () => activateTab('dynamic'));
  }

  // ════════════════════════════════════════════════════════════
  // 🌟 [Tab 2] 영구 포트폴리오 (Permanent Portfolio) 전용 모듈 🌟
  // ════════════════════════════════════════════════════════════

  function initPermMonthsGrid() {
    if (!el.permMonthsGrid) return;
    el.permMonthsGrid.innerHTML = '';
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    for (let m = 1; m <= 12; m++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'month-toggle-btn';
      btn.dataset.month = m;
      if (state.perm.season_months.includes(m)) {
        btn.classList.add('selected');
      }

      btn.innerHTML = `
        <span class="m-num">${monthNames[m - 1]}</span>
        <span class="m-tag">${state.perm.season_months.includes(m) ? '영구보유' : '파킹'}</span>
      `;

      btn.addEventListener('click', () => {
        togglePermMonth(m);
      });

      el.permMonthsGrid.appendChild(btn);
    }
    updatePermMonthsUI();
  }

  function togglePermMonth(m) {
    const idx = state.perm.season_months.indexOf(m);
    if (idx > -1) {
      state.perm.season_months.splice(idx, 1);
    } else {
      state.perm.season_months.push(m);
      state.perm.season_months.sort((a, b) => a - b);
    }
    el.permSeasonPresets.forEach(b => b.classList.remove('active'));
    updatePermMonthsUI();
  }

  function setPermSeasonMonths(arr, presetKey = null) {
    state.perm.season_months = [...arr].sort((a, b) => a - b);
    if (presetKey) {
      el.permSeasonPresets.forEach(b => {
        b.classList.toggle('active', b.dataset.preset === presetKey);
      });
    }
    updatePermMonthsUI();
  }

  function updatePermMonthsUI() {
    if (!el.permMonthsGrid) return;
    const buttons = el.permMonthsGrid.querySelectorAll('.month-toggle-btn');
    buttons.forEach(btn => {
      const m = parseInt(btn.dataset.month, 10);
      const isSelected = state.perm.season_months.includes(m);
      btn.classList.toggle('selected', isSelected);
      const tag = btn.querySelector('.m-tag');
      if (tag) tag.textContent = isSelected ? '영구보유' : '파킹';
    });

    const count = state.perm.season_months.length;
    if (el.permActiveMonthsCount) {
      el.permActiveMonthsCount.textContent = `${count}개월 보유 (${12 - count}개월 파킹)`;
      if (count === 12) {
        el.permActiveMonthsCount.className = 'count-badge';
        el.permActiveMonthsCount.textContent = '12개월 상시보유 (클래식)';
      } else if (count === 0) {
        el.permActiveMonthsCount.className = 'count-badge';
        el.permActiveMonthsCount.textContent = '0개월 (전량 안전자산)';
      }
    }
  }

  function setupPermanentPortfolioControls() {
    // 1. 자본금 및 적립금 연동
    el.permInitCap.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10) || 0;
      state.perm.init_cap = v;
      el.permInitCapPreview.textContent = formatKoreanMoney(v);
    });

    el.permMonthlyAdd.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10) || 0;
      state.perm.monthly_add = v;
      el.permMonthlyAddPreview.textContent = formatKoreanMoney(v);
    });

    // 2. 비중 연동 & 실시간 4색 바 갱신
    function updatePermWeightsUI() {
      const w_spy = state.perm.w_spy;
      const w_tlt = state.perm.w_tlt;
      const w_gld = state.perm.w_gld;
      const w_bil = state.perm.w_bil;
      const sum = w_spy + w_tlt + w_gld + w_bil;

      el.permWeightsSum.textContent = `합계: ${sum}%`;
      if (sum === 100) {
        el.permWeightsSum.style.color = '#34d399';
      } else {
        el.permWeightsSum.style.color = '#f87171';
      }

      el.permBarSpy.style.width = `${Math.min(100, Math.max(0, w_spy))}%`;
      el.permBarTlt.style.width = `${Math.min(100, Math.max(0, w_tlt))}%`;
      el.permBarGld.style.width = `${Math.min(100, Math.max(0, w_gld))}%`;
      el.permBarBil.style.width = `${Math.min(100, Math.max(0, w_bil))}%`;
    }

    function setPermWeight(asset, val, syncSlider = true) {
      val = Math.max(0, Math.min(100, Math.round(val)));
      state.perm[`w_${asset}`] = val;
      if (syncSlider) {
        if (asset === 'spy') el.permSliderSpy.value = val;
        if (asset === 'tlt') el.permSliderTlt.value = val;
        if (asset === 'gld') el.permSliderGld.value = val;
        if (asset === 'bil') el.permSliderBil.value = val;
      }
      if (asset === 'spy') el.permWeightSpy.value = val;
      if (asset === 'tlt') el.permWeightTlt.value = val;
      if (asset === 'gld') el.permWeightGld.value = val;
      if (asset === 'bil') el.permWeightBil.value = val;

      updatePermWeightsUI();
    }

    // 슬라이더 리스너
    el.permSliderSpy.addEventListener('input', (e) => setPermWeight('spy', parseFloat(e.target.value), false));
    el.permSliderTlt.addEventListener('input', (e) => setPermWeight('tlt', parseFloat(e.target.value), false));
    el.permSliderGld.addEventListener('input', (e) => setPermWeight('gld', parseFloat(e.target.value), false));
    el.permSliderBil.addEventListener('input', (e) => setPermWeight('bil', parseFloat(e.target.value), false));

    // 숫자 인풋 리스너
    el.permWeightSpy.addEventListener('input', (e) => setPermWeight('spy', parseFloat(e.target.value) || 0, true));
    el.permWeightTlt.addEventListener('input', (e) => setPermWeight('tlt', parseFloat(e.target.value) || 0, true));
    el.permWeightGld.addEventListener('input', (e) => setPermWeight('gld', parseFloat(e.target.value) || 0, true));
    el.permWeightBil.addEventListener('input', (e) => setPermWeight('bil', parseFloat(e.target.value) || 0, true));

    // 100% 자동 맞춤 정규화
    el.btnNormalizeWeights.addEventListener('click', () => {
      const sum = state.perm.w_spy + state.perm.w_tlt + state.perm.w_gld + state.perm.w_bil;
      if (sum <= 0) {
        setPermWeightsAll(25, 25, 25, 25);
        return;
      }
      const s = Math.round((state.perm.w_spy / sum) * 100);
      const t = Math.round((state.perm.w_tlt / sum) * 100);
      const g = Math.round((state.perm.w_gld / sum) * 100);
      const b = 100 - (s + t + g);
      setPermWeightsAll(s, t, g, b);
    });

    function setPermWeightsAll(s, t, g, b) {
      setPermWeight('spy', s);
      setPermWeight('tlt', t);
      setPermWeight('gld', g);
      setPermWeight('bil', b);
    }

    // 퀵 비중 프리셋 버튼
    el.permWeightPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        el.permWeightPresets.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = btn.dataset.preset;
        if (p === 'classic') setPermWeightsAll(25, 25, 25, 25);
        else if (p === 'allweather') setPermWeightsAll(30, 40, 15, 15);
        else if (p === 'growth') setPermWeightsAll(50, 25, 15, 10);
      });
    });

    // 3. 계절성 프리셋 버튼
    el.permSeasonPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.preset;
        if (p === 'all') setPermSeasonMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'all');
        else if (p === 'halloween') setPermSeasonMonths([1, 2, 3, 4, 11, 12], 'halloween');
        else if (p === 'firstHalf') setPermSeasonMonths([1, 2, 3, 4, 5, 6], 'firstHalf');
        else if (p === 'summer') setPermSeasonMonths([6, 7, 8], 'summer');
        else if (p === 'clear') setPermSeasonMonths([], 'clear');
      });
    });

    // 4. 리밸런싱 주기 설정
    el.permQuickRebals.forEach(btn => {
      btn.addEventListener('click', () => {
        el.permQuickRebals.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const m = parseInt(btn.dataset.rebal, 10);
        state.perm.rebal_months = m;
        el.permRebalPreview.textContent = m === 1 ? '1개월 (월간 리밸런싱)' : `${m}개월 단위 리밸런싱`;
      });
    });

    // 5. 날짜 프리셋
    function applyPermPeriod(type) {
      const endStr = el.permEndDate.value || new Date().toISOString().split('T')[0];
      let startStr = '1970-01-02';

      if (type === '1970') startStr = '1970-01-02';
      else if (type === '1987') startStr = '1987-01-01';
      else if (type === '2000') startStr = '2000-01-01';
      else if (type === '2008') startStr = '2008-01-01';
      else if (type === '2020') startStr = '2020-01-01';

      state.perm.start_date = startStr;
      state.perm.end_date = endStr;
      el.permStartDate.value = startStr;
      el.permEndDate.value = endStr;

      el.permQuickPeriods.forEach(b => {
        b.classList.toggle('active', b.dataset.period === type);
      });

      const d1 = new Date(startStr);
      const d2 = new Date(endStr);
      const y = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 365.25)));
      el.permPeriodPreview.textContent = `${startStr.slice(0, 4)}년~현재 (${y}년)`;
    }

    el.permQuickPeriods.forEach(btn => {
      btn.addEventListener('click', () => applyPermPeriod(btn.dataset.period));
    });

    el.permStartDate.addEventListener('change', (e) => {
      state.perm.start_date = e.target.value;
      el.permQuickPeriods.forEach(b => b.classList.remove('active'));
    });

    el.permEndDate.addEventListener('change', (e) => {
      state.perm.end_date = e.target.value;
      el.permQuickPeriods.forEach(b => b.classList.remove('active'));
    });

    // 백테스트 실행 버튼
    el.btnRunPermBacktest.addEventListener('click', runPermanentBacktest);

    // 차트 스케일 토글
    el.btnPermScaleLog.addEventListener('click', () => {
      state.perm.scale_type = 'log';
      el.btnPermScaleLog.classList.add('active');
      el.btnPermScaleLinear.classList.remove('active');
      if (state.perm.latestResult) renderPermEquityChart(state.perm.latestResult.chart);
    });

    el.btnPermScaleLinear.addEventListener('click', () => {
      state.perm.scale_type = 'linear';
      el.btnPermScaleLinear.classList.add('active');
      el.btnPermScaleLog.classList.remove('active');
      if (state.perm.latestResult) renderPermEquityChart(state.perm.latestResult.chart);
    });
  }

  // ── 영구 포트폴리오 백테스트 실행 및 렌더링 ──
  async function runPermanentBacktest() {
    showLoading('영구 포트폴리오 1970~현재 올웨더 시뮬레이션 연산 중...');

    const payload = {
      w_spy: state.perm.w_spy,
      w_tlt: state.perm.w_tlt,
      w_gld: state.perm.w_gld,
      w_bil: state.perm.w_bil,
      init_cap: state.perm.init_cap,
      monthly_add: state.perm.monthly_add,
      rebal_months: state.perm.rebal_months,
      season_months: state.perm.season_months,
      start_date: el.permStartDate.value || state.perm.start_date,
      end_date: el.permEndDate.value || state.perm.end_date,
      fee_rate: parseFloat(el.permFeeRate.value) || 0.1
    };

    try {
      const res = await fetch('/api/permanent_portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status !== 'success') {
        throw new Error(data.message || '영구 포트폴리오 연산 실패');
      }

      state.perm.latestResult = data;
      renderPermanentDashboard(data);
    } catch (err) {
      alert('영구 포트폴리오 백테스트 실패: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  function renderPermanentDashboard(data) {
    const { info, metrics, chart, crisis_analysis } = data;
    const port = metrics.permanent_portfolio;
    const spy = metrics.sp500;
    const f6040 = metrics.portfolio_6040;

    // 1. 상단 인포 바
    el.permInfoWeights.textContent = `SPY ${info.w_spy}% + TLT ${info.w_tlt}% + GLD ${info.w_gld}% + BIL ${info.w_bil}%`;
    el.permInfoRebal.textContent = `${info.rebal_months}개월 단위 (총 ${info.total_rebalances}회 실행)`;
    el.permInfoPeriod.textContent = `${info.start_date} ~ ${info.end_date} (${info.trading_days.toLocaleString()} 거래일)`;

    // 2. 4대 KPI 카드
    el.permFinalVal.textContent = formatCurrency(port.final_value);
    el.permFinalSpy.textContent = formatCurrency(spy.final_value);
    el.permFinal6040.textContent = `전통 60/40: ${formatCurrency(f6040.final_value)}`;

    el.permCagrVal.textContent = formatPercent(port.cagr_pct);
    el.permCagrSpy.textContent = formatPercent(spy.cagr_pct);
    el.permCagr6040.textContent = `전통 60/40: ${formatPercent(f6040.cagr_pct)}`;

    el.permMddVal.textContent = formatPercent(port.mdd_pct, false);
    el.permMddSpy.textContent = formatPercent(spy.mdd_pct, false);
    const mddDiff = Math.abs(spy.mdd_pct) - Math.abs(port.mdd_pct);
    el.permMddDefense.textContent = `S&P500 대비 낙폭: +${mddDiff.toFixed(1)}%p 극적 방어`;

    if (el.permSharpeVal) el.permSharpeVal.textContent = `${port.sharpe_ratio || port.sharpe}`;
    if (el.permSharpeSpy) el.permSharpeSpy.textContent = `${spy.sharpe_ratio || spy.sharpe}`;
    if (el.permSharpe6040) el.permSharpe6040.textContent = `전통 60/40 샤프: ${f6040.sharpe_ratio || f6040.sharpe}`;

    el.permMarVal.textContent = `${port.mar_ratio}`;
    el.permMarSpy.textContent = `${spy.mar_ratio}`;
    el.permMar6040.textContent = `전통 60/40 MAR: ${f6040.mar_ratio}`;

    // 3. 역사적 위기 구간 방어력 테이블
    renderPermCrisisTable(crisis_analysis);

    // 4. 누적 자산 성장 곡선 (Log Scale) & 언더워터 MDD 차트
    renderPermEquityChart(chart);
    renderPermDrawdownChart(chart);
  }

  function renderPermCrisisTable(crisisList) {
    el.permCrisisTableBody.innerHTML = '';
    if (!crisisList || crisisList.length === 0) {
      el.permCrisisTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b;">선택한 기간 내 해당 위기 구간이 없습니다.</td></tr>`;
      return;
    }

    crisisList.forEach(c => {
      const tr = document.createElement('tr');
      const pRetClass = c.port_ret_pct >= 0 ? 'ret-pos' : 'ret-neg';
      const sRetClass = c.spy_ret_pct >= 0 ? 'ret-pos' : 'ret-neg';
      const fRetClass = c.f6040_ret_pct >= 0 ? 'ret-pos' : 'ret-neg';
      const alphaClass = c.defense_alpha >= 0 ? 'alpha-pos' : 'alpha-neg';

      tr.innerHTML = `
        <td style="font-weight: 700; color: #fff;">
          <div>${c.name}</div>
          <div style="font-size:0.7rem; color:#64748b; font-weight:normal;">${c.start} ~ ${c.end} | ${c.desc}</div>
        </td>
        <td class="${pRetClass}" style="font-weight:700;">${formatPercent(c.port_ret_pct)}</td>
        <td class="${sRetClass}">${formatPercent(c.spy_ret_pct)}</td>
        <td class="${fRetClass}">${formatPercent(c.f6040_ret_pct)}</td>
        <td style="color:#34d399; font-weight:600;">${formatPercent(c.port_mdd_pct, false)}</td>
        <td style="color:#f87171;">${formatPercent(c.spy_mdd_pct, false)}</td>
        <td class="${alphaClass}" style="font-size:0.95rem;">${c.defense_alpha >= 0 ? '+' : ''}${c.defense_alpha.toFixed(2)}%p 우위</td>
      `;
      el.permCrisisTableBody.appendChild(tr);
    });
  }

  function renderPermEquityChart(chartData) {
    const ctx = document.getElementById('permEquityChart').getContext('2d');
    if (state.charts.permEquity) state.charts.permEquity.destroy();

    const isLog = state.perm.scale_type === 'log';

    state.charts.permEquity = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.dates,
        datasets: [
          {
            label: '영구 포트폴리오 (Permanent Portfolio)',
            data: chartData.port_val,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.1
          },
          {
            label: 'S&P 500 (SPY 100%)',
            data: chartData.spy_val,
            borderColor: '#f43f5e',
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            borderDash: [3, 3],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
          },
          {
            label: '전통 60/40 포트폴리오 (주식60+채권40)',
            data: chartData.f6040_val,
            borderColor: '#a855f7',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [2, 2],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
          },
          {
            label: '누적 투자원금',
            data: chartData.invested,
            borderColor: '#94a3b8',
            backgroundColor: 'transparent',
            borderWidth: 1.2,
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Inter', size: 12, weight: 600 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatKoreanMoney(ctx.parsed.y)} (${Number(ctx.parsed.y).toLocaleString()}원)`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', maxTicksLimit: 14, font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            type: isLog ? 'logarithmic' : 'linear',
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => formatKoreanMoney(val)
            }
          }
        }
      }
    });
  }

  function renderPermDrawdownChart(chartData) {
    const ctx = document.getElementById('permDrawdownChart').getContext('2d');
    if (state.charts.permDrawdown) state.charts.permDrawdown.destroy();

    state.charts.permDrawdown = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.dates,
        datasets: [
          {
            label: '영구 포트폴리오 MDD',
            data: chartData.port_dd,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true
          },
          {
            label: 'S&P 500 MDD (폭락 위험)',
            data: chartData.spy_dd,
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true
          },
          {
            label: '전통 60/40 MDD',
            data: chartData.f6040_dd,
            borderColor: '#c084fc',
            backgroundColor: 'transparent',
            borderWidth: 1.2,
            borderDash: [2, 2],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Inter', size: 11, weight: 600 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', maxTicksLimit: 14, font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            max: 0,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val}%`
            }
          }
        }
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // 🌟 [Tab 3] 올웨더 포트폴리오 (Ray Dalio All Weather) 전용 모듈 🌟
  // ════════════════════════════════════════════════════════════

  function initAwMonthsGrid() {
    if (!el.awMonthsGrid) return;
    el.awMonthsGrid.innerHTML = '';
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    for (let m = 1; m <= 12; m++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'month-toggle-btn';
      btn.dataset.month = m;
      if (state.aw.season_months.includes(m)) {
        btn.classList.add('selected');
      }

      btn.innerHTML = `
        <span class="m-num">${monthNames[m - 1]}</span>
        <span class="m-tag">${state.aw.season_months.includes(m) ? '올웨더' : '파킹'}</span>
      `;

      btn.addEventListener('click', () => {
        toggleAwMonth(m);
      });

      el.awMonthsGrid.appendChild(btn);
    }
    updateAwMonthsUI();
  }

  function toggleAwMonth(m) {
    const idx = state.aw.season_months.indexOf(m);
    if (idx > -1) {
      state.aw.season_months.splice(idx, 1);
    } else {
      state.aw.season_months.push(m);
      state.aw.season_months.sort((a, b) => a - b);
    }
    el.awSeasonPresets.forEach(b => b.classList.remove('active'));
    updateAwMonthsUI();
  }

  function setAwSeasonMonths(arr, presetKey = null) {
    state.aw.season_months = [...arr].sort((a, b) => a - b);
    if (presetKey) {
      el.awSeasonPresets.forEach(b => {
        b.classList.toggle('active', b.dataset.preset === presetKey);
      });
    }
    updateAwMonthsUI();
  }

  function updateAwMonthsUI() {
    if (!el.awMonthsGrid) return;
    const buttons = el.awMonthsGrid.querySelectorAll('.month-toggle-btn');
    buttons.forEach(btn => {
      const m = parseInt(btn.dataset.month, 10);
      const isSelected = state.aw.season_months.includes(m);
      btn.classList.toggle('selected', isSelected);
      const tag = btn.querySelector('.m-tag');
      if (tag) tag.textContent = isSelected ? '올웨더' : '파킹';
    });

    const count = state.aw.season_months.length;
    if (el.awActiveMonthsCount) {
      el.awActiveMonthsCount.textContent = `${count}개월 보유 (${12 - count}개월 파킹)`;
      if (count === 12) {
        el.awActiveMonthsCount.className = 'count-badge';
        el.awActiveMonthsCount.textContent = '12개월 상시보유 (올웨더)';
      } else if (count === 0) {
        el.awActiveMonthsCount.className = 'count-badge';
        el.awActiveMonthsCount.textContent = '0개월 (전량 안전자산)';
      }
    }
  }

  function setupAllWeatherControls() {
    // 1. 자본금 및 적립금 연동
    el.awInitCap.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10) || 0;
      state.aw.init_cap = v;
      el.awInitCapPreview.textContent = formatKoreanMoney(v);
    });

    el.awMonthlyAdd.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10) || 0;
      state.aw.monthly_add = v;
      el.awMonthlyAddPreview.textContent = formatKoreanMoney(v);
    });

    // 2. 비중 연동 & 실시간 5색 바 갱신
    function updateAwWeightsUI() {
      const w_spy = state.aw.w_spy;
      const w_tlt = state.aw.w_tlt;
      const w_ief = state.aw.w_ief;
      const w_gld = state.aw.w_gld;
      const w_dbc = state.aw.w_dbc;
      const sum = Math.round((w_spy + w_tlt + w_ief + w_gld + w_dbc) * 10) / 10;

      el.awWeightsSum.textContent = `합계: ${sum}%`;
      if (Math.abs(sum - 100) < 0.05) {
        el.awWeightsSum.style.color = '#34d399';
      } else {
        el.awWeightsSum.style.color = '#f87171';
      }

      el.awBarSpy.style.width = `${Math.min(100, Math.max(0, w_spy))}%`;
      el.awBarTlt.style.width = `${Math.min(100, Math.max(0, w_tlt))}%`;
      el.awBarIef.style.width = `${Math.min(100, Math.max(0, w_ief))}%`;
      el.awBarGld.style.width = `${Math.min(100, Math.max(0, w_gld))}%`;
      el.awBarDbc.style.width = `${Math.min(100, Math.max(0, w_dbc))}%`;
    }

    function setAwWeight(asset, val, syncSlider = true) {
      val = Math.max(0, Math.min(100, parseFloat(val) || 0));
      val = Math.round(val * 10) / 10;
      state.aw[`w_${asset}`] = val;

      if (syncSlider) {
        if (asset === 'spy') el.awSliderSpy.value = val;
        if (asset === 'tlt') el.awSliderTlt.value = val;
        if (asset === 'ief') el.awSliderIef.value = val;
        if (asset === 'gld') el.awSliderGld.value = val;
        if (asset === 'dbc') el.awSliderDbc.value = val;
      }
      if (asset === 'spy') el.awWeightSpy.value = val;
      if (asset === 'tlt') el.awWeightTlt.value = val;
      if (asset === 'ief') el.awWeightIef.value = val;
      if (asset === 'gld') el.awWeightGld.value = val;
      if (asset === 'dbc') el.awWeightDbc.value = val;

      updateAwWeightsUI();
    }

    function setAwWeightsAll(s, t, i, g, d) {
      setAwWeight('spy', s);
      setAwWeight('tlt', t);
      setAwWeight('ief', i);
      setAwWeight('gld', g);
      setAwWeight('dbc', d);
    }

    // 슬라이더 이벤트
    el.awSliderSpy.addEventListener('input', (e) => setAwWeight('spy', e.target.value, false));
    el.awSliderTlt.addEventListener('input', (e) => setAwWeight('tlt', e.target.value, false));
    el.awSliderIef.addEventListener('input', (e) => setAwWeight('ief', e.target.value, false));
    el.awSliderGld.addEventListener('input', (e) => setAwWeight('gld', e.target.value, false));
    el.awSliderDbc.addEventListener('input', (e) => setAwWeight('dbc', e.target.value, false));

    // 숫자 인풋 이벤트
    el.awWeightSpy.addEventListener('input', (e) => setAwWeight('spy', e.target.value, true));
    el.awWeightTlt.addEventListener('input', (e) => setAwWeight('tlt', e.target.value, true));
    el.awWeightIef.addEventListener('input', (e) => setAwWeight('ief', e.target.value, true));
    el.awWeightGld.addEventListener('input', (e) => setAwWeight('gld', e.target.value, true));
    el.awWeightDbc.addEventListener('input', (e) => setAwWeight('dbc', e.target.value, true));

    // 오리지널 사계절 비중 리셋 버튼 (30 : 40 : 15 : 7.5 : 7.5)
    el.btnAwResetClassic.addEventListener('click', () => {
      setAwWeightsAll(30, 40, 15, 7.5, 7.5);
    });

    // 100% 자동 맞춤 정규화
    el.btnNormalizeAwWeights.addEventListener('click', () => {
      const sum = state.aw.w_spy + state.aw.w_tlt + state.aw.w_ief + state.aw.w_gld + state.aw.w_dbc;
      if (sum <= 0) {
        setAwWeightsAll(30, 40, 15, 7.5, 7.5);
        return;
      }
      const s = Math.round((state.aw.w_spy / sum) * 1000) / 10;
      const t = Math.round((state.aw.w_tlt / sum) * 1000) / 10;
      const i = Math.round((state.aw.w_ief / sum) * 1000) / 10;
      const g = Math.round((state.aw.w_gld / sum) * 1000) / 10;
      const d = Math.round((100 - (s + t + i + g)) * 10) / 10;
      setAwWeightsAll(s, t, i, g, d);
    });

    // 3. 계절성 프리셋 버튼
    el.awSeasonPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.preset;
        if (p === 'all') setAwSeasonMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'all');
        else if (p === 'halloween') setAwSeasonMonths([1, 2, 3, 4, 11, 12], 'halloween');
        else if (p === 'firstHalf') setAwSeasonMonths([1, 2, 3, 4, 5, 6], 'firstHalf');
        else if (p === 'summer') setAwSeasonMonths([6, 7, 8], 'summer');
        else if (p === 'clear') setAwSeasonMonths([], 'clear');
      });
    });

    // 4. 리밸런싱 주기 설정
    el.awQuickRebals.forEach(btn => {
      btn.addEventListener('click', () => {
        el.awQuickRebals.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const m = parseInt(btn.dataset.rebal, 10);
        state.aw.rebal_months = m;
        el.awRebalPreview.textContent = m === 1 ? '1개월 (월간 리밸런싱)' : `${m}개월 단위 리밸런싱`;
      });
    });

    // 5. 날짜 프리셋
    function applyAwPeriod(type) {
      const endStr = el.awEndDate.value || new Date().toISOString().split('T')[0];
      let startStr = '1970-01-02';

      if (type === '1970') startStr = '1970-01-02';
      else if (type === '1987') startStr = '1987-01-01';
      else if (type === '2000') startStr = '2000-01-01';
      else if (type === '2008') startStr = '2008-01-01';
      else if (type === '2020') startStr = '2020-01-01';

      state.aw.start_date = startStr;
      state.aw.end_date = endStr;
      el.awStartDate.value = startStr;
      el.awEndDate.value = endStr;

      el.awQuickPeriods.forEach(b => {
        b.classList.toggle('active', b.dataset.period === type);
      });

      const d1 = new Date(startStr);
      const d2 = new Date(endStr);
      const y = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 365.25)));
      el.awPeriodPreview.textContent = `${startStr.slice(0, 4)}년~현재 (${y}년)`;
    }

    el.awQuickPeriods.forEach(btn => {
      btn.addEventListener('click', () => applyAwPeriod(btn.dataset.period));
    });

    el.awStartDate.addEventListener('change', (e) => {
      state.aw.start_date = e.target.value;
      el.awQuickPeriods.forEach(b => b.classList.remove('active'));
    });

    el.awEndDate.addEventListener('change', (e) => {
      state.aw.end_date = e.target.value;
      el.awQuickPeriods.forEach(b => b.classList.remove('active'));
    });

    // 백테스트 실행 버튼
    el.btnRunAwBacktest.addEventListener('click', runAllWeatherBacktest);

    // 차트 스케일 토글
    el.btnAwScaleLog.addEventListener('click', () => {
      state.aw.scale_type = 'log';
      el.btnAwScaleLog.classList.add('active');
      el.btnAwScaleLinear.classList.remove('active');
      if (state.aw.latestResult) renderAwEquityChart(state.aw.latestResult.chart);
    });

    el.btnAwScaleLinear.addEventListener('click', () => {
      state.aw.scale_type = 'linear';
      el.btnAwScaleLinear.classList.add('active');
      el.btnAwScaleLog.classList.remove('active');
      if (state.aw.latestResult) renderAwEquityChart(state.aw.latestResult.chart);
    });
  }

  // ── 올웨더 포트폴리오 백테스트 실행 및 렌더링 ──
  async function runAllWeatherBacktest() {
    showLoading('레이 달리오 올웨더 1970~현재 사계절 시뮬레이션 연산 중...');

    const payload = {
      w_spy: state.aw.w_spy,
      w_tlt: state.aw.w_tlt,
      w_ief: state.aw.w_ief,
      w_gld: state.aw.w_gld,
      w_dbc: state.aw.w_dbc,
      init_cap: state.aw.init_cap,
      monthly_add: state.aw.monthly_add,
      rebal_months: state.aw.rebal_months,
      season_months: state.aw.season_months,
      start_date: el.awStartDate.value || state.aw.start_date,
      end_date: el.awEndDate.value || state.aw.end_date,
      fee_rate: parseFloat(el.awFeeRate.value) || 0.1
    };

    try {
      const res = await fetch('/api/allweather_portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status !== 'success') {
        throw new Error(data.message || '올웨더 포트폴리오 연산 실패');
      }

      state.aw.latestResult = data;
      renderAllWeatherDashboard(data);
    } catch (err) {
      alert('올웨더 포트폴리오 백테스트 실패: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  function renderAllWeatherDashboard(data) {
    const { info, metrics, chart, crisis_analysis } = data;
    const port = metrics.allweather_portfolio;
    const spy = metrics.sp500;
    const f6040 = metrics.portfolio_6040;

    // 1. 상단 인포 바
    el.awInfoWeights.textContent = `SPY ${info.w_spy}% + TLT ${info.w_tlt}% + IEF ${info.w_ief}% + GLD ${info.w_gld}% + DBC ${info.w_dbc}%`;
    el.awInfoRebal.textContent = `${info.rebal_months}개월 단위 (총 ${info.total_rebalances}회 실행)`;
    el.awInfoPeriod.textContent = `${info.start_date} ~ ${info.end_date} (${info.trading_days.toLocaleString()} 거래일)`;

    // 2. 5대 KPI 카드
    el.awFinalVal.textContent = formatCurrency(port.final_value);
    el.awFinalSpy.textContent = formatCurrency(spy.final_value);
    el.awFinal6040.textContent = `전통 60/40: ${formatCurrency(f6040.final_value)}`;

    el.awCagrVal.textContent = formatPercent(port.cagr_pct);
    el.awCagrSpy.textContent = formatPercent(spy.cagr_pct);
    el.awCagr6040.textContent = `전통 60/40: ${formatPercent(f6040.cagr_pct)}`;

    el.awMddVal.textContent = formatPercent(port.mdd_pct, false);
    el.awMddSpy.textContent = formatPercent(spy.mdd_pct, false);
    const mddDiff = Math.abs(spy.mdd_pct) - Math.abs(port.mdd_pct);
    el.awMddDefense.textContent = `S&P500 대비 낙폭: +${mddDiff.toFixed(1)}%p 극적 방어`;

    el.awSharpeVal.textContent = `${port.sharpe_ratio}`;
    el.awSharpeSpy.textContent = `${spy.sharpe_ratio}`;
    el.awSharpe6040.textContent = `전통 60/40 샤프: ${f6040.sharpe_ratio}`;

    el.awMarVal.textContent = `${port.mar_ratio}`;
    el.awMarSpy.textContent = `${spy.mar_ratio}`;
    el.awMar6040.textContent = `전통 60/40 MAR: ${f6040.mar_ratio}`;

    // 3. 역사적 위기 구간 방어력 테이블
    renderAwCrisisTable(crisis_analysis);

    // 4. 누적 자산 성장 곡선 (Log Scale) & 언더워터 MDD 차트
    renderAwEquityChart(chart);
    renderAwDrawdownChart(chart);
  }

  function renderAwCrisisTable(crisisList) {
    el.awCrisisTableBody.innerHTML = '';
    if (!crisisList || crisisList.length === 0) {
      el.awCrisisTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b;">선택한 기간 내 해당 위기 구간이 없습니다.</td></tr>`;
      return;
    }

    crisisList.forEach(c => {
      const tr = document.createElement('tr');
      const pRetClass = c.port_ret_pct >= 0 ? 'ret-pos' : 'ret-neg';
      const sRetClass = c.spy_ret_pct >= 0 ? 'ret-pos' : 'ret-neg';
      const fRetClass = c.f6040_ret_pct >= 0 ? 'ret-pos' : 'ret-neg';
      const alphaClass = c.defense_alpha >= 0 ? 'alpha-pos' : 'alpha-neg';

      tr.innerHTML = `
        <td style="font-weight: 700; color: #fff;">
          <div>${c.name}</div>
          <div style="font-size:0.7rem; color:#64748b; font-weight:normal;">${c.start} ~ ${c.end} | ${c.desc}</div>
        </td>
        <td class="${pRetClass}" style="font-weight:700;">${formatPercent(c.port_ret_pct)}</td>
        <td class="${sRetClass}">${formatPercent(c.spy_ret_pct)}</td>
        <td class="${fRetClass}">${formatPercent(c.f6040_ret_pct)}</td>
        <td style="color:#34d399; font-weight:600;">${formatPercent(c.port_mdd_pct, false)}</td>
        <td style="color:#f87171;">${formatPercent(c.spy_mdd_pct, false)}</td>
        <td class="${alphaClass}" style="font-size:0.95rem;">${c.defense_alpha >= 0 ? '+' : ''}${c.defense_alpha.toFixed(2)}%p 우위</td>
      `;
      el.awCrisisTableBody.appendChild(tr);
    });
  }

  function renderAwEquityChart(chartData) {
    const ctx = document.getElementById('awEquityChart').getContext('2d');
    if (state.charts.awEquity) state.charts.awEquity.destroy();

    const isLog = state.aw.scale_type === 'log';

    state.charts.awEquity = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.dates,
        datasets: [
          {
            label: '올웨더 포트폴리오 (Ray Dalio All-Weather)',
            data: chartData.port_val,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.1
          },
          {
            label: 'S&P 500 (SPY 100%)',
            data: chartData.spy_val,
            borderColor: '#f43f5e',
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            borderDash: [3, 3],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
          },
          {
            label: '전통 60/40 포트폴리오 (주식60+채권40)',
            data: chartData.f6040_val,
            borderColor: '#a855f7',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [2, 2],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
          },
          {
            label: '누적 투자원금',
            data: chartData.invested,
            borderColor: '#94a3b8',
            backgroundColor: 'transparent',
            borderWidth: 1.2,
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Inter', size: 12, weight: 600 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatKoreanMoney(ctx.parsed.y)} (${Number(ctx.parsed.y).toLocaleString()}원)`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', maxTicksLimit: 14, font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            type: isLog ? 'logarithmic' : 'linear',
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => formatKoreanMoney(val)
            }
          }
        }
      }
    });
  }

  function renderAwDrawdownChart(chartData) {
    const ctx = document.getElementById('awDrawdownChart').getContext('2d');
    if (state.charts.awDrawdown) state.charts.awDrawdown.destroy();

    state.charts.awDrawdown = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.dates,
        datasets: [
          {
            label: '올웨더 포트폴리오 MDD',
            data: chartData.port_dd,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true
          },
          {
            label: 'S&P 500 MDD (폭락 위험)',
            data: chartData.spy_dd,
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true
          },
          {
            label: '전통 60/40 MDD',
            data: chartData.f6040_dd,
            borderColor: '#c084fc',
            backgroundColor: 'transparent',
            borderWidth: 1.2,
            borderDash: [2, 2],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Inter', size: 11, weight: 600 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', maxTicksLimit: 14, font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            max: 0,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val}%`
            }
          }
        }
      }
    });
  }


  // ════════════════════════════════════════════════════════════
  // 🌟 [Tab 4] 동적 자산 배분 (Dynamic Allocation) 전용 모듈 🌟
  // ════════════════════════════════════════════════════════════

  let dynCharts = {
    equity: null,
    drawdown: null,
    weights: null,
    donut: null
  };

  const DYN_STRAT_DESCS = {
    'BAA': {
      title: 'BAA (Bold Asset Allocation) - Wouter Keller',
      text: '4대 카나리아(SPY, VEA, VWO, BND)의 13612W 모멘텀이 모두 양수면 공격자산(QQQ, EFA, EEM, AGG) 상위 2종(각 50%)을 매수하고, 하나라도 음수면 안전자산(TIP, DBC, BIL, IEF, TLT, LQD, AGG) 상위 3종(각 33.3%)으로 대피합니다. (BIL 미달 시 BIL 대체)'
    },
    'HAA': {
      title: 'HAA (Hybrid Asset Allocation) - Wouter Keller',
      text: 'TIP 1개 카나리아의 1,3,6,12M 모멘텀 평균이 양수면 공격자산(SPY, IWM, EFA, EEM, VNQ, DBC, IEF, TLT) 상위 4종(각 25%)에 투자하고, 음수면 안전채권(IEF) 또는 현금(BIL) 중 모멘텀 우위 자산에 100% 집중 대피합니다.'
    },
    'LAA': {
      title: 'LAA (Lethargic Asset Allocation) - Wouter Keller',
      text: '영구형 고정 75%(SPY 25% + GLD 25% + IEF 25%)를 상시 유지하며, 타이밍 25%는 SPY가 200일 이동평균선 위에 있으면 QQQ(25%), 200일선 아래로 내려가면 단기채 SHY(25%)로 전환하여 하락 충격을 방어합니다.'
    },
    'RAA': {
      title: 'RAA (Robust Asset Allocation) - Wesley Gray',
      text: '7대 자산(SPY, EFA, EEM, VNQ, DBC, IEF, TLT)에 대해 ① 12M 절대 모멘텀(vs BIL)과 ② 12M 이동평균 추세를 각각 50%씩 평가하여 통과 비중만 배분하고, 미달 비중은 모두 현금(BIL)에 안전 파킹합니다.'
    },
    'GTAA': {
      title: 'GTAA (Global Tactical Asset Allocation 5) - Meb Faber',
      text: '5대 핵심 자산군(SPY, EFA, IEF, DBC, VNQ)의 월말 종가가 10개월 이동평균선 위에 있으면 각각 20%씩 균등 보유하고, 10개월선 아래로 하락한 자산은 즉시 현금(BIL)으로 전환하여 손실을 차단합니다.'
    },
    'GEM': {
      title: '듀얼 모멘텀 (Dual Momentum - GEM) - Gary Antonacci',
      text: 'SPY 12개월 수익률이 BIL(무위험 금리)보다 높을 때 미국주식(SPY)과 선진국(EFA) 중 더 강한 1종목에 100% 집중 투자하고, SPY가 BIL 이하로 떨어지면 안전채권 AGG에 100% 대피합니다.'
    }
  };

  function setupDynamicControls() {
    if (!el.dynStrategySelect) return;

    // 전략 선택 이벤트
    el.dynStrategySelect.addEventListener('change', (e) => {
      const strat = e.target.value;
      state.dynamic.strategy = strat;
      
      const desc = DYN_STRAT_DESCS[strat] || DYN_STRAT_DESCS['BAA'];
      if (el.dynDescTitle) el.dynDescTitle.textContent = desc.title;
      if (el.dynDescText) el.dynDescText.textContent = desc.text;

      fetchDynamicLiveSignal(strat);
    });

    // 벤치마크 선택 이벤트
    if (el.dynBenchmarkSelect) {
      el.dynBenchmarkSelect.addEventListener('change', (e) => {
        state.dynamic.benchmark = e.target.value;
        const bmName = e.target.value === '6040' ? '전통 60/40:' : 'S&P 500:';
        if (el.dynBmLabel1) el.dynBmLabel1.textContent = bmName;
        if (el.dynBmLabel2) el.dynBmLabel2.textContent = bmName;
        if (el.dynBmLabel3) el.dynBmLabel3.textContent = bmName;
        if (el.dynBmLabel4) el.dynBmLabel4.textContent = bmName;
        if (el.dynBmLabel5) el.dynBmLabel5.textContent = bmName;
      });
    }

    // 자본금 및 적립금 미리보기
    if (el.dynInitCap) {
      el.dynInitCap.addEventListener('input', () => {
        const val = parseFloat(el.dynInitCap.value) || 0;
        state.dynamic.init_cap = val;
        if (el.dynInitCapPreview) el.dynInitCapPreview.textContent = formatKoreanMoney(val);
      });
    }

    if (el.dynMonthlyAdd) {
      el.dynMonthlyAdd.addEventListener('input', () => {
        const val = parseFloat(el.dynMonthlyAdd.value) || 0;
        state.dynamic.monthly_add = val;
        if (el.dynMonthlyAddPreview) el.dynMonthlyAddPreview.textContent = formatKoreanMoney(val);
      });
    }

    // 기간 프리셋 버튼
    if (el.dynPeriodButtons) {
      el.dynPeriodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          el.dynPeriodButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const period = btn.dataset.period;
          const today = new Date().toISOString().split('T')[0];

          if (period === 'all') {
            el.dynStartDate.value = '1970-01-01';
            el.dynEndDate.value = '';
          } else if (period === '2000') {
            el.dynStartDate.value = '2000-01-01';
            el.dynEndDate.value = '';
          } else if (period === '2010') {
            el.dynStartDate.value = '2010-01-01';
            el.dynEndDate.value = '';
          } else if (period === '5y') {
            const d = new Date();
            d.setFullYear(d.getFullYear() - 5);
            el.dynStartDate.value = d.toISOString().split('T')[0];
            el.dynEndDate.value = '';
          }
        });
      });
    }

    // 스케일 토글 버튼 (로그 / 선형)
    if (el.btnDynScaleLog && el.btnDynScaleLinear) {
      el.btnDynScaleLog.addEventListener('click', () => {
        state.dynamic.scale_type = 'log';
        el.btnDynScaleLog.classList.add('active');
        el.btnDynScaleLinear.classList.remove('active');
        if (dynCharts.equity) {
          dynCharts.equity.options.scales.y.type = 'logarithmic';
          dynCharts.equity.update();
        }
      });

      el.btnDynScaleLinear.addEventListener('click', () => {
        state.dynamic.scale_type = 'linear';
        el.btnDynScaleLinear.classList.add('active');
        el.btnDynScaleLog.classList.remove('active');
        if (dynCharts.equity) {
          dynCharts.equity.options.scales.y.type = 'linear';
          dynCharts.equity.update();
        }
      });
    }

    // 백테스트 실행 버튼
    if (el.btnRunDynBacktest) {
      el.btnRunDynBacktest.addEventListener('click', () => {
        runDynamicBacktest();
      });
    }

    // 초기 라이브 시그널 프리패치
    fetchDynamicLiveSignal('BAA');
  }

  // 라이브 시그널 실시간 호출
  async function fetchDynamicLiveSignal(strategyId) {
    try {
      const res = await fetch(`/api/dynamic_live_signal?strategy=${strategyId}`);
      const data = await res.json();
      if (data.status === 'success' && data.live_signal) {
        state.dynamic.latestSignal = data.live_signal;
        renderDynamicLiveSignal(data.live_signal);
      }
    } catch (e) {
      console.warn('[DYNAMIC] 라이브 시그널 조회 실패:', e);
    }
  }

  // 라이브 시그널 렌더링
  function renderDynamicLiveSignal(signal) {
    if (!signal) return;

    if (el.dynAsOfBadge) el.dynAsOfBadge.textContent = `${signal.as_of_date} 종가 기준`;
    
    // 국면 뱃지
    if (el.dynRegimeBadge) {
      el.dynRegimeBadge.className = 'regime-badge';
      if (signal.regime === 'RISK_ON') {
        el.dynRegimeBadge.classList.add('risk-on');
      } else if (signal.regime === 'RISK_OFF') {
        el.dynRegimeBadge.classList.add('risk-off');
      } else {
        el.dynRegimeBadge.classList.add('balanced');
      }
      el.dynRegimeBadge.textContent = signal.regime_badge;
    }

    if (el.dynStratNameLabel) el.dynStratNameLabel.textContent = signal.strategy_name;
    if (el.dynRegimeRationale) el.dynRegimeRationale.textContent = signal.regime_rationale;

    // 카나리아 카드 렌더링
    if (el.dynCanaryCard && el.dynCanaryList) {
      if (signal.canaries && signal.canaries.length > 0) {
        el.dynCanaryCard.style.display = 'block';
        el.dynCanaryList.innerHTML = signal.canaries.map(c => `
          <div class="canary-pill ${c.status === 'PASS' ? 'pass' : 'fail'}">
            <span>${c.ticker}</span>
            <span class="status-tag">${c.status}</span>
            <span style="font-size: 0.7rem; color: #94a3b8;">(${c.score_str})</span>
          </div>
        `).join('');
      } else {
        el.dynCanaryCard.style.display = 'none';
      }
    }

    // 추천 매수 포트폴리오 표 렌더링
    if (el.dynRecomTableBody && signal.portfolio) {
      el.dynRecomTableBody.innerHTML = signal.portfolio.map(p => {
        let roleClass = 'attack';
        if (p.role.includes('방어')) roleClass = 'defense';
        if (p.role.includes('현금')) roleClass = 'cash';
        
        return `
          <tr>
            <td class="ticker-cell">
              <span style="color: ${p.color};">${p.ticker}</span>
              <span style="font-size: 0.7rem; color: #64748b; margin-left: 4px;">${p.name_kr}</span>
            </td>
            <td style="font-family: var(--font-mono); font-size: 0.75rem;">$${p.current_price}</td>
            <td style="font-family: var(--font-mono); font-size: 0.75rem; color: ${p.momentum_score.startsWith('+') ? '#34d399' : '#f87171'};">
              ${p.momentum_score}
            </td>
            <td><span class="role-badge ${roleClass}">${p.role}</span></td>
            <td class="weight-cell">${p.weight_pct}%</td>
          </tr>
        `;
      }).join('');
    }

    // 도넛 차트 렌더링
    if (el.dynDonutChart && signal.donut_data) {
      if (dynCharts.donut) {
        dynCharts.donut.destroy();
      }

      dynCharts.donut = new Chart(el.dynDonutChart, {
        type: 'doughnut',
        data: {
          labels: signal.donut_data.labels,
          datasets: [{
            data: signal.donut_data.weights,
            backgroundColor: signal.donut_data.colors,
            borderWidth: 1,
            borderColor: 'rgba(15, 23, 42, 0.8)'
          }]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw}%`
              }
            }
          },
          cutout: '62%'
        }
      });
    }
  }

  // 동적 자산 배분 백테스트 실행
  async function runDynamicBacktest() {
    showLoading('동적 자산 배분 계량 알고리즘 백테스트 연산 중...');

    const strat = el.dynStrategySelect ? el.dynStrategySelect.value : 'BAA';
    const bm = el.dynBenchmarkSelect ? el.dynBenchmarkSelect.value : 'SPY';
    const initCap = el.dynInitCap ? parseFloat(el.dynInitCap.value) || 50000000 : 50000000;
    const monthlyAdd = el.dynMonthlyAdd ? parseFloat(el.dynMonthlyAdd.value) || 500000 : 500000;
    const startDate = el.dynStartDate ? el.dynStartDate.value : '1970-01-01';
    const endDate = el.dynEndDate ? el.dynEndDate.value : '';
    const feeRate = el.dynFeeRate ? parseFloat(el.dynFeeRate.value) || 0.1 : 0.1;

    try {
      const res = await fetch('/api/dynamic_allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_id: strat,
          benchmark_id: bm,
          init_cap: initCap,
          monthly_add: monthlyAdd,
          start_date: startDate,
          end_date: endDate,
          fee_rate: feeRate
        })
      });

      const data = await res.json();
      hideLoading();

      if (data.status === 'success') {
        state.dynamic.latestResult = data;
        renderDynamicDashboard(data);
      } else {
        alert('백테스트 연산 오류: ' + (data.message || '알 수 없는 오류'));
      }
    } catch (e) {
      hideLoading();
      alert('백테스트 서버 통신 오류가 발생했습니다: ' + e);
    }
  }

  // 동적 자산 배분 결과 대시보드 전체 렌더링
  function renderDynamicDashboard(res) {
    if (!res || !res.metrics) return;

    const strat = res.metrics.strategy;
    const bm = res.metrics.benchmark;

    if (el.dynKpiStratName && res.info) el.dynKpiStratName.textContent = res.info.strategy_name;

    // 1. KPI 카드
    if (el.dynValFinal) el.dynValFinal.textContent = formatKoreanMoney(strat.final_value);
    if (el.dynValBmFinal) el.dynValBmFinal.textContent = formatKoreanMoney(bm.final_value);

    if (el.dynCagrVal) el.dynCagrVal.textContent = strat.cagr_pct;
    if (el.dynCagrBm) el.dynCagrBm.textContent = `${bm.cagr_pct}%`;

    if (el.dynMddVal) el.dynMddVal.textContent = strat.mdd_pct;
    if (el.dynMddBm) el.dynMddBm.textContent = `${bm.mdd_pct}%`;

    if (el.dynSharpeVal) el.dynSharpeVal.textContent = strat.sharpe_ratio || strat.sharpe || '-';
    if (el.dynSharpeBm) el.dynSharpeBm.textContent = bm.sharpe_ratio || bm.sharpe || '-';

    if (el.dynMarVal) el.dynMarVal.textContent = strat.mar_ratio || '-';
    if (el.dynMarBm) el.dynMarBm.textContent = bm.mar_ratio || '-';

    // 2. 라이브 시그널
    if (res.live_signal) {
      renderDynamicLiveSignal(res.live_signal);
    }

    // 3. 차트 렌더링
    renderDynamicEquityChart(res.chart);
    renderDynamicDrawdownChart(res.chart);
    renderDynamicWeightsChart(res.weights_history);

    // 4. 위기 방어력 분석 테이블
    renderDynamicCrisisTable(res.crisis_analysis);
  }

  // 차트 1: 누적 자산 성장 곡선
  function renderDynamicEquityChart(chartData) {
    if (!el.dynEquityChart || !chartData) return;

    if (dynCharts.equity) {
      dynCharts.equity.destroy();
    }

    const isLog = (state.dynamic.scale_type === 'log');

    dynCharts.equity = new Chart(el.dynEquityChart, {
      type: 'line',
      data: {
        labels: chartData.dates,
        datasets: [
          {
            label: '동적 전략 포트폴리오',
            data: chartData.strat_val,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            borderWidth: 2.2,
            pointRadius: 0,
            fill: true,
            tension: 0.1
          },
          {
            label: '비교 벤치마크',
            data: chartData.bench_val,
            borderColor: '#94a3b8',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0.1
          },
          {
            label: '원금 누적 투자액',
            data: chartData.invested,
            borderColor: '#64748b',
            borderWidth: 1.2,
            pointRadius: 0,
            fill: false,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: { color: '#cbd5e1', font: { family: 'Pretendard', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatKoreanMoney(ctx.raw)} (${ctx.raw.toLocaleString()}원)`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', maxTicksLimit: 14, font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            type: isLog ? 'logarithmic' : 'linear',
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => formatKoreanMoney(val)
            }
          }
        }
      }
    });
  }

  // 차트 2: 언더워터 낙폭 MDD 차트
  function renderDynamicDrawdownChart(chartData) {
    if (!el.dynDrawdownChart || !chartData) return;

    if (dynCharts.drawdown) {
      dynCharts.drawdown.destroy();
    }

    dynCharts.drawdown = new Chart(el.dynDrawdownChart, {
      type: 'line',
      data: {
        labels: chartData.dates,
        datasets: [
          {
            label: '동적 전략 MDD',
            data: chartData.strat_dd,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.18)',
            borderWidth: 1.8,
            pointRadius: 0,
            fill: true,
            tension: 0.1
          },
          {
            label: '벤치마크 MDD',
            data: chartData.bench_dd,
            borderColor: '#94a3b8',
            borderWidth: 1.2,
            borderDash: [3, 3],
            pointRadius: 0,
            fill: false,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: { color: '#cbd5e1', font: { family: 'Pretendard', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', maxTicksLimit: 14, font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            max: 0,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val}%`
            }
          }
        }
      }
    });
  }

  // 차트 3: 월별 포트폴리오 자산 비중 변화 히스토리 (Stacked Area Chart)
  function renderDynamicWeightsChart(weightsHistory) {
    if (!el.dynWeightsChart || !weightsHistory || !weightsHistory.series) return;

    if (dynCharts.weights) {
      dynCharts.weights.destroy();
    }

    const datasets = weightsHistory.series.map(s => ({
      label: `${s.ticker} (${s.name_kr})`,
      data: s.data,
      borderColor: s.color,
      backgroundColor: hexToRgba(s.color, 0.65),
      borderWidth: 0.8,
      pointRadius: 0,
      fill: true,
      tension: 0.1
    }));

    dynCharts.weights = new Chart(el.dynWeightsChart, {
      type: 'line',
      data: {
        labels: weightsHistory.dates,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#cbd5e1', font: { family: 'Pretendard', size: 10 }, boxWidth: 10 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', maxTicksLimit: 14, font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            stacked: true,
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val}%`
            }
          }
        }
      }
    });
  }

  // Helper: Hex color to rgba
  function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(59, 130, 246, ${alpha})`;
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // 6대 위기 분석 테이블
  function renderDynamicCrisisTable(crisisResults) {
    if (!el.dynCrisisTableBody || !crisisResults) return;

    el.dynCrisisTableBody.innerHTML = crisisResults.map(c => {
      const alphaClass = c.alpha >= 0 ? 'highlight-green' : 'highlight-red';
      const stratMddClass = c.strat_mdd > c.bench_mdd ? 'highlight-green' : '';

      return `
        <tr>
          <td class="crisis-name-cell">
            <strong>${c.name}</strong>
          </td>
          <td class="crisis-period-cell">${c.period}</td>
          <td class="crisis-desc-cell">${c.desc}</td>
          <td class="num-cell" style="color: ${c.strat_ret >= 0 ? '#34d399' : '#f87171'}; font-weight: 700;">
            ${c.strat_ret > 0 ? '+' : ''}${c.strat_ret}%
          </td>
          <td class="num-cell" style="color: ${c.bench_ret >= 0 ? '#34d399' : '#f87171'};">
            ${c.bench_ret > 0 ? '+' : ''}${c.bench_ret}%
          </td>
          <td class="num-cell ${stratMddClass}" style="color: #fca5a5;">${c.strat_mdd}%</td>
          <td class="num-cell" style="color: #94a3b8;">${c.bench_mdd}%</td>
          <td class="num-cell ${alphaClass}" style="font-weight: 700;">
            ${c.alpha > 0 ? '+' : ''}${c.alpha}%p
          </td>
        </tr>
      `;
    }).join('');
  }


  // ── 초기화 실행 시퀀스 ──
  async function init() {
    setupTabNavigation();
    setupPermanentPortfolioControls();
    initPermMonthsGrid();
    setupAllWeatherControls();
    initAwMonthsGrid();
    setupDynamicControls();

    initMonthsGrid();
    setupTickerSearch(1);
    setupTickerSearch(2);
    setRebalMonths(1);
    await loadTickers();
    await fetchDateRange();
    const ready = await checkDataStatus();
    if (ready) {
      runBacktest();
    } else {
      pollStatusUntilReady(15);
    }
  }

  init();
});
