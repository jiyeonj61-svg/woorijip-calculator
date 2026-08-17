import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const config = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(path.join(root, 'content/categories.json'), 'utf8'));
const calculators = JSON.parse(fs.readFileSync(path.join(root, 'content/calculators.json'), 'utf8')).sort((a,b) => a.order - b.order);
const siteUrl = String(config.siteUrl || 'https://example.com').replace(/\/$/, '');

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(path.join(publicDir, 'assets'), { recursive: true });
for (const file of ['styles.css','site.js','calculators.js']) {
  fs.copyFileSync(path.join(root, 'src/assets', file), path.join(publicDir, 'assets', file));
}

const iconByCategory = { tax: '%', salary: '₩', loan: '↗', 'real-estate': '⌂', investment: '↗', living: '＋' };
const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category]));
const calcMap = Object.fromEntries(calculators.map((calculator) => [calculator.id, calculator]));

const esc = (value = '') => String(value)
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#039;');
const jsonLd = (value) => JSON.stringify(value).replaceAll('<','\\u003c');

function writeRoute(route, html) {
  const normalized = route === '/' ? '' : route.replace(/^\//,'').replace(/\/$/,'');
  const dir = path.join(publicDir, normalized);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

function header(activeCategory = '') {
  const nav = categories.map((category) => `<a href="/${category.id}/" ${activeCategory === category.id ? 'aria-current="page"' : ''}>${esc(category.name)}</a>`).join('');
  return `
  <a class="skip-link" href="#main">본문으로 바로가기</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="우리집계산기 홈">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 10.8 12 4l8 6.8v8.1a1.1 1.1 0 0 1-1.1 1.1H5.1A1.1 1.1 0 0 1 4 18.9v-8.1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.3 11.5h7.4M8.3 15h2.1m3.2 0h2.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </span>
        <span class="brand-copy"><strong>${esc(config.siteName)}</strong><small>${esc(config.tagline)}</small></span>
      </a>
      <button class="menu-button" type="button" aria-label="메뉴 열기" aria-expanded="false">☰</button>
      <nav class="main-nav" aria-label="주요 메뉴">${nav}<a href="/about/">소개</a></nav>
    </div>
  </header>`;
}

function footer() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand"><strong>${esc(config.siteName)}</strong><p>${esc(config.homeDescription)} 모든 계산 결과는 일반적인 참고용이며 실제 적용금액과 다를 수 있습니다.</p></div>
        <div class="footer-links"><h3>서비스</h3><a href="/about/">사이트 소개</a><a href="/disclaimer/">계산 결과 면책</a><a href="/contact/">문의하기</a></div>
        <div class="footer-links"><h3>정책</h3><a href="/privacy/">개인정보처리방침</a><a href="/terms/">이용약관</a><a href="/sitemap.xml">사이트맵</a></div>
      </div>
      <div class="footer-bottom"><span>© 2026 ${esc(config.siteName)}. All rights reserved.</span><span>세금·노무·금융 계산은 관계기관의 최신 기준을 다시 확인하세요.</span></div>
    </div>
  </footer>`;
}

function trackingHead() {
  const verify = [
    config.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(config.googleSiteVerification)}">` : '',
    config.naverSiteVerification ? `<meta name="naver-site-verification" content="${esc(config.naverSiteVerification)}">` : ''
  ].join('');
  const ads = config.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsenseClient)}" crossorigin="anonymous"></script>` : '';
  const ga = config.googleAnalyticsId ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${esc(config.googleAnalyticsId)}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(config.googleAnalyticsId)}');</script>` : '';
  return verify + ads + ga;
}

function page({ title, description, route, body, activeCategory = '', structuredData = [], pageType = 'website' }) {
  const canonical = `${siteUrl}${route}`;
  const schemas = structuredData.map((schema) => `<script type="application/ld+json">${jsonLd(schema)}</script>`).join('\n');
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:type" content="${pageType}">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:site_name" content="${esc(config.siteName)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(siteUrl)}/assets/og-image.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#3157d5">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="/assets/styles.css">
  ${trackingHead()}
  ${schemas}
</head>
<body>
  ${header(activeCategory)}
  <main id="main">${body}</main>
  ${footer()}
  <div class="toast" role="status" aria-live="polite"></div>
  <script src="/assets/site.js" defer></script>
  ${pageType === 'article' ? '<script src="/assets/calculators.js" defer></script>' : ''}
</body>
</html>`;
}

function card(calc) {
  const category = categoryMap[calc.category];
  const search = [calc.title, calc.summary, ...(calc.keywords || []), category.name].join(' ');
  return `<a class="calculator-card" href="${calc.path}" data-category="${calc.category}" data-search="${esc(search)}">
    <div class="card-top"><span class="card-icon">${iconByCategory[calc.category]}</span><span class="badge">${esc(calc.badge)}</span></div>
    <h3>${esc(calc.title)}</h3><p>${esc(calc.summary)}</p><span class="card-link">바로 계산하기</span>
  </a>`;
}

function categoryTabs() {
  return `<div class="category-tabs" aria-label="계산기 카테고리">
    <button class="category-tab active" type="button" data-category="all">전체 20개</button>
    ${categories.map((category) => `<button class="category-tab" type="button" data-category="${category.id}">${esc(category.name)}</button>`).join('')}
  </div>`;
}

function homeBody() {
  return `
  <section class="hero">
    <div class="container hero-inner">
      <span class="eyebrow">무료 생활 계산기 모음</span>
      <h1>생활에 필요한 계산을<br><em>가장 쉽고 빠르게</em></h1>
      <p class="hero-lead">3.3% 원천징수, 부가세, 연봉 실수령액, 퇴직금,<br>대출이자, 전월세, 투자수익률까지 무료로 계산하세요.</p>
      <div class="hero-search"><label class="sr-only" for="calculatorSearch"></label><input id="calculatorSearch" type="search" placeholder="예: 3.3%, 부가세, 퇴직금, 복리" autocomplete="off"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m16.5 16.5 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
      <div class="hero-stats"><span>회원가입 없음</span><span>브라우저에서 즉시 계산</span><span>모바일 최적화</span><span>20개 계산기</span></div>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="section-heading"><div><h2>필요한 계산기를 선택하세요</h2><p>각 계산기는 독립 주소로 제공되어 검색과 공유가 편리합니다.</p></div></div>
      ${categoryTabs()}
      <div class="calculator-grid" id="calculatorGrid">${calculators.map(card).join('')}</div>
      <div id="noResults" class="no-results">검색 결과가 없습니다. 다른 키워드로 찾아보세요.</div>
    </div>
  </section>
  <section class="section section-white">
    <div class="container">
      <div class="section-heading"><div><h2>카테고리별로 모아보기</h2><p>세금부터 생활 계산까지 주제별로 정리했습니다.</p></div></div>
      <div class="category-overview">${categories.map((category) => {
        const count = calculators.filter((calc) => calc.category === category.id).length;
        return `<div class="category-box"><strong>${category.icon} ${esc(category.name)}</strong><p>${esc(category.description)}</p><a href="/${category.id}/">${count}개 계산기 보기 →</a></div>`;
      }).join('')}</div>
    </div>
  </section>`;
}

function breadcrumbs(calc) {
  const category = categoryMap[calc.category];
  return `<div class="breadcrumb-wrap"><div class="container breadcrumb"><a href="/">홈</a><a href="/${category.id}/">${esc(category.name)}</a><span>${esc(calc.title)}</span></div></div>`;
}

const seg = (name, options) => `<div class="segmented" data-segment-group="${name}">${options.map((option, index) => `<label><input type="radio" name="${name}" value="${option.value}" ${index === 0 ? 'checked' : ''}><span>${esc(option.label)}</span></label>`).join('')}</div>`;
const modePanel = (name, value, html) => `<div data-mode-for="${name}" data-mode-value="${value}">${html}</div>`;
const fieldWrap = (label, control, help = '', full = false) => `<div class="field ${full ? 'full' : ''}"><span class="field-label">${esc(label)}</span>${control}${help ? `<p class="field-help">${esc(help)}</p>` : ''}</div>`;
const money = (id, label, defaultValue = '', help = '', full = false, unit = '원') => fieldWrap(label, `<div class="input-wrap"><input class="money-input" id="${id}" name="${id}" type="text" inputmode="numeric" value="${defaultValue}" autocomplete="off"><span class="input-unit">${unit}</span></div>`, help, full);
const numberInput = (id, label, defaultValue = '', unit = '', help = '', full = false, attrs = '') => fieldWrap(label, `<div class="input-wrap"><input id="${id}" name="${id}" type="number" value="${defaultValue}" step="any" ${attrs}><span class="input-unit">${esc(unit)}</span></div>`, help, full);
const dateInput = (id, label, defaultValue = '', help = '') => fieldWrap(label, `<input id="${id}" name="${id}" type="date" value="${defaultValue}">`, help);
const selectInput = (id, label, options, help = '', full = false) => fieldWrap(label, `<select id="${id}" name="${id}">${options.map((option) => `<option value="${option.value}" ${option.selected ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}</select>`, help, full);
const checkbox = (id, label, checked = false, help = '') => `<div class="field"><span class="field-label">설정</span><label class="inline-check"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>${help ? `<p class="field-help">${esc(help)}</p>` : ''}</div>`;

function formShell(calc, inner) {
  return `<section class="panel calc-card">
    <div class="calc-card-header"><strong>${esc(calc.title)}</strong><div class="calc-card-meta"><span class="live-calc-badge" data-state="ready"><i aria-hidden="true"></i><span id="liveCalculationStatus">입력 즉시 자동 계산</span></span><span class="privacy-note">입력값은 서버에 저장되지 않습니다</span></div></div>
    <form class="calc-form" id="calculatorForm" data-calculator-id="${calc.id}" data-auto-calculate="true" aria-describedby="autoCalculationHelp">
      ${inner}
      <div class="form-actions"><button class="btn btn-primary" type="submit">계산하기</button><button class="btn btn-secondary" id="exampleButton" type="button">예시 입력</button><button class="btn btn-secondary" id="resetButton" type="button">초기화</button></div>
      <p class="auto-calc-help" id="autoCalculationHelp">금액·기간·옵션을 바꾸면 계산 결과가 자동으로 갱신됩니다. 계산하기 버튼으로 즉시 다시 계산할 수도 있습니다.</p>
      <section class="result-box" id="resultBox" aria-live="polite" hidden>
        <div class="result-head"><strong>계산 결과</strong><div><button class="btn btn-secondary btn-small" id="copyResult" type="button">결과 복사</button> <button class="btn btn-secondary btn-small" id="printButton" type="button">인쇄</button></div></div>
        <div class="result-summary"><small id="resultSummaryLabel">계산 결과</small><b id="resultSummaryValue">-</b></div>
        <div class="result-list" id="resultList"></div><p class="result-note" id="resultNote"></p><div class="result-alert" id="resultAlert" hidden></div><div id="resultExtra" hidden></div>
      </section>
    </form>
  </section>`;
}

function renderForm(calc) {
  switch (calc.id) {
    case 'withholding33': return formShell(calc, `
      ${seg('withholdingMode',[{value:'gross',label:'계약금액으로 계산'},{value:'net',label:'수령액으로 역산'}])}
      <div class="field-grid primary-entry">${money('withholdingAmount','계산할 금액',1000000,'계약금액 또는 통장에 실제로 받은 금액을 입력하세요.',true)}</div>
      <div class="field-grid settings-grid">${selectInput('withholdingRounding','원 단위 처리',[{value:'round',label:'반올림',selected:true},{value:'floor',label:'버림'},{value:'ceil',label:'올림'}],'지급처의 정산 방식에 맞게 선택하세요.',true)}</div>`);
    case 'vat': return formShell(calc, `
      ${seg('vatMode',[{value:'total',label:'합계금액으로 계산'},{value:'supply',label:'공급가액으로 계산'}])}
      <div class="field-grid primary-entry">${money('vatAmount','계산할 금액',2200000,'부가세 포함 합계금액 또는 공급가액을 입력하세요.',true)}</div>
      <div class="field-grid settings-grid">${numberInput('vatRate','부가세율',10,'%','일반과세자 기본값은 10%입니다.')} ${selectInput('vatRounding','원 단위 처리',[{value:'round',label:'반올림',selected:true},{value:'floor',label:'버림'},{value:'ceil',label:'올림'}])}</div>`);
    case 'netSalary': return formShell(calc, `
      ${seg('salaryMode',[{value:'annual',label:'연봉으로 계산'},{value:'monthly',label:'월급으로 계산'}])}
      <div class="field-grid">${money('salaryAmount','연봉 또는 월급',48000000,'선택한 기준에 맞춰 세전 금액을 입력하세요.',true)}${money('salaryNonTax','월 비과세액',200000,'식대 등 실제 비과세로 처리되는 월 금액입니다.')} ${numberInput('salaryDependents','부양가족 수',1,'명','본인을 포함한 기본공제 대상 인원입니다.',false,'min="1"')} ${numberInput('salaryChildren','8~20세 자녀 수',0,'명','간편 세액 추정에만 활용됩니다.',false,'min="0"')} ${selectInput('salaryWithholdingRatio','간이세액 선택',[{value:'80',label:'80%'},{value:'100',label:'100%',selected:true},{value:'120',label:'120%'}])}</div>
      <div style="margin-top:22px"><span class="field-label">소득세 계산 방식</span>${seg('salaryTaxMode',[{value:'auto',label:'자동 간편 추정'},{value:'manual',label:'월 소득세 직접입력'}])}${modePanel('salaryTaxMode','manual',`<div class="field-grid">${money('salaryManualTax','월 근로소득세',0,'급여명세서의 소득세를 알고 있을 때 입력하세요.',true)}</div>`)}</div>`);
    case 'hourlyMonthly': return formShell(calc, `
      ${seg('hourlyMode',[{value:'hourlyToMonthly',label:'시급 → 월급'},{value:'monthlyToHourly',label:'월급 → 시급'}])}
      <div class="field-grid">${money('hourlyAmount','시급 또는 월급',10320,'선택한 변환 방향에 맞춰 입력하세요.',true)}${numberInput('hourlyWeeklyHours','주 소정근로시간',40,'시간','휴게시간을 제외한 유급 근로시간입니다.')} ${numberInput('hourlyWeeklyDays','주 근무일수',5,'일','주휴시간 산정 참고값입니다.',false,'min="1" max="7"')} ${checkbox('hourlyIncludeHoliday','주휴수당 포함',true)}</div>`);
    case 'weeklyHoliday': return formShell(calc, `<div class="field-grid">${money('weeklyHourlyWage','시급',10320)}${numberInput('weeklyDailyHours','하루 근로시간',5,'시간','','', 'min="0" max="24"')} ${numberInput('weeklyWorkDays','주 근무일수',4,'일','','', 'min="1" max="7"')} ${checkbox('weeklyFullAttendance','소정근로일 개근',true,'결근이 있으면 일반적으로 주휴수당 요건을 충족하지 못할 수 있습니다.')}</div>`);
    case 'severance': return formShell(calc, `<div class="field-grid">${dateInput('severanceHireDate','입사일','2023-01-01')}${dateInput('severanceRetireDate','퇴직일','2026-01-01','마지막 근무일 다음 날을 입력하세요.')} ${money('severanceWages3m','퇴직 전 3개월 임금총액',9000000,'세전 임금총액을 입력하세요.',true)}${money('severanceAnnualBonus','최근 1년 상여금',3000000)}${money('severanceAnnualLeavePay','최근 1년 연차수당',600000)}${money('severanceOrdinaryDaily','1일 통상임금(선택)',0,'평균임금보다 높을 때 최저보장 비교에 사용합니다.')} ${numberInput('severanceWeeklyHours','주 소정근로시간',40,'시간','퇴직금 적용 요건 확인용입니다.')}</div>`);
    case 'annualLeave': return formShell(calc, `<div class="field-grid">${dateInput('leaveHireDate','입사일','2022-08-01')}${dateInput('leaveReferenceDate','계산 기준일','2026-08-16')} ${numberInput('leaveUsedDays','사용한 연차',7,'일','반차는 0.5일로 입력할 수 있습니다.')} ${numberInput('leavePerfectMonths','개근 월수',11,'개월','출근율 80% 미만일 때 월 단위 발생일수에 사용합니다.',false,'min="0" max="11"')} ${numberInput('leaveWeeklyHours','주 소정근로시간',40,'시간')} ${checkbox('leaveAttendance80','최근 1년 출근율 80% 이상',true)} ${checkbox('leaveMonthlyPerfect','1년 미만 기간 매월 개근',true)} ${checkbox('leaveWorkplaceFive','상시근로자 5인 이상',true)}</div>`);
    case 'fourInsurance': return formShell(calc, `<div class="field-grid">${money('insuranceMonthlyPay','월 보수',3500000,'세전 월 보수를 입력하세요.',true)}${money('insuranceNonTax','월 비과세액',200000)}${numberInput('insuranceAccidentRate','산재보험 요율',0.7,'%','업종별 요율을 확인해 입력하세요.')} ${numberInput('insuranceStabilityRate','고용안정·직능 요율',0.25,'%','사업장 규모별 추가 사업주 부담률입니다.')}</div>`);
    case 'loanInterest': return formShell(calc, `
      ${seg('loanInterestMode',[{value:'months',label:'개월 수로 계산'},{value:'dates',label:'날짜로 계산'}])}
      <div class="field-grid">${money('loanInterestPrincipal','대출원금',100000000,'',true)}${numberInput('loanInterestRate','연이율',4.2,'%')}</div>
      ${modePanel('loanInterestMode','months',`<div class="field-grid" style="margin-top:16px">${numberInput('loanInterestMonths','대출기간',12,'개월','','', 'min="0"')}</div>`)}
      ${modePanel('loanInterestMode','dates',`<div class="field-grid" style="margin-top:16px">${dateInput('loanInterestStartDate','시작일','2026-01-01')}${dateInput('loanInterestEndDate','종료일','2027-01-01')}${selectInput('loanInterestDayBasis','연간 일수 기준',[{value:'365',label:'365일',selected:true},{value:'366',label:'366일'}])}</div>`)}`);
    case 'equalPayment': return formShell(calc, `<div class="field-grid">${money('equalPrincipal','대출원금',300000000,'',true)}${numberInput('equalRate','연이율',4,'%')} ${numberInput('equalYears','상환기간(년)',30,'년')} ${numberInput('equalMonths','추가 개월',0,'개월')} ${money('equalExtraPayment','매월 추가상환액',0,'기본 원리금 외 추가로 갚을 금액입니다.',true)}</div>`);
    case 'depositInterest': return formShell(calc, `<div class="field-grid">${money('depositPrincipal','예치금액',30000000,'',true)}${numberInput('depositRate','연이율',3.2,'%')} ${numberInput('depositMonths','예치기간',12,'개월')} ${selectInput('depositMethod','이자 방식',[{value:'simple',label:'단리',selected:true},{value:'monthly',label:'월복리'},{value:'annual',label:'연복리'}])} ${numberInput('depositTaxRate','이자소득세율',15.4,'%','일반과세 기본값입니다.')}</div>`);
    case 'compound': return formShell(calc, `<div class="field-grid">${money('compoundInitial','초기 투자금',10000000)}${money('compoundMonthly','월 적립금',500000)}${numberInput('compoundRate','연평균 수익률',10,'%')} ${numberInput('compoundYears','투자기간',10,'년')} ${selectInput('compoundFrequency','복리주기',[{value:'12',label:'월복리',selected:true},{value:'4',label:'분기복리'},{value:'1',label:'연복리'}])}${selectInput('compoundTiming','월 적립 시점',[{value:'end',label:'월말 납입',selected:true},{value:'start',label:'월초 납입'}])}${numberInput('compoundInflation','연 물가상승률',2,'%','현재 구매력 기준 실질가치를 계산합니다.')}</div>`);
    case 'rentConversion': return formShell(calc, `
      ${seg('rentMode',[{value:'depositToRent',label:'보증금↓ 월세 계산'},{value:'rentToDeposit',label:'월세↓ 보증금 계산'}])}
      <div class="field-grid">${money('rentCurrentDeposit','현재 보증금',100000000)}${money('rentCurrentMonthly','현재 월세',500000)}${numberInput('rentConversionRate','전월세 전환율',4.75,'%','계약에 적용할 전환율을 직접 수정할 수 있습니다.')}</div>
      ${modePanel('rentMode','depositToRent',`<div class="field-grid" style="margin-top:16px">${money('rentTargetDeposit','변경 보증금',50000000,'낮추고 싶은 보증금을 입력하세요.',true)}</div>`)}
      ${modePanel('rentMode','rentToDeposit',`<div class="field-grid" style="margin-top:16px">${money('rentTargetMonthly','변경 월세',300000,'낮추고 싶은 월세를 입력하세요.',true)}</div>`)}`);
    case 'brokerage': return formShell(calc, `
      ${seg('brokerageDeal',[{value:'sale',label:'매매·교환'},{value:'lease',label:'전세·월세'}])}
      <div class="field-grid">${selectInput('brokerageProperty','부동산 유형',[{value:'housing',label:'주택',selected:true},{value:'officetel',label:'주거용 오피스텔'},{value:'other',label:'토지·상가·기타'}])}${numberInput('brokerageNegotiatedRate','협의요율(선택)',0,'%','0으로 두면 법정 상한요율을 적용합니다.')} ${checkbox('brokerageIncludeVat','부가세 10% 포함',true)}</div>
      ${modePanel('brokerageDeal','sale',`<div class="field-grid" style="margin-top:16px">${money('brokerageSalePrice','매매가격',600000000,'',true)}</div>`)}
      ${modePanel('brokerageDeal','lease',`<div class="field-grid" style="margin-top:16px">${money('brokerageDeposit','보증금',100000000)}${money('brokerageMonthlyRent','월세',1000000,'전세는 0원으로 입력하세요.')}</div>`)}`);
    case 'pyeong': return formShell(calc, `${seg('pyeongMode',[{value:'sqmToPyeong',label:'㎡ → 평'},{value:'pyeongToSqm',label:'평 → ㎡'}])}<div class="field-grid">${numberInput('pyeongArea','변환할 면적',84,'','소수점 입력도 가능합니다.',true)}</div><div class="quick-value-actions"><button type="button" class="btn btn-secondary btn-small" data-quick-target="pyeongArea" data-quick-value="59">59㎡</button><button type="button" class="btn btn-secondary btn-small" data-quick-target="pyeongArea" data-quick-value="74">74㎡</button><button type="button" class="btn btn-secondary btn-small" data-quick-target="pyeongArea" data-quick-value="84">84㎡</button><button type="button" class="btn btn-secondary btn-small" data-quick-target="pyeongArea" data-quick-value="102">102㎡</button></div>`);
    case 'discount': return formShell(calc, `
      ${seg('discountMode',[{value:'forward',label:'할인 후 가격 계산'},{value:'reverse',label:'할인율 역산'}])}
      <div class="field-grid">${money('discountOriginal','정상가격',200000,'',true)}</div>
      ${modePanel('discountMode','forward',`<div class="field-grid" style="margin-top:16px">${numberInput('discountRate1','1차 할인율',20,'%')}${numberInput('discountRate2','2차 할인율',10,'%')}${money('discountCoupon','정액 쿠폰',10000)}${money('discountPoints','포인트 사용',5000)}${money('discountShipping','배송비',3000)}</div>`)}
      ${modePanel('discountMode','reverse',`<div class="field-grid" style="margin-top:16px">${money('discountSalePrice','실제 판매가격',150000,'',true)}</div>`)}`);
    case 'percentageChange': return formShell(calc, `
      ${seg('percentageMode',[{value:'change',label:'증감률'},{value:'ratio',label:'몇 %인지'},{value:'apply',label:'% 적용'}])}
      ${modePanel('percentageMode','change',`<div class="field-grid">${numberInput('percentageBefore','이전 값',80,'')}${numberInput('percentageAfter','이후 값',100,'')}</div>`)}
      ${modePanel('percentageMode','ratio',`<div class="field-grid">${numberInput('percentagePart','부분값',25,'')}${numberInput('percentageWhole','전체값',200,'')}</div>`)}
      ${modePanel('percentageMode','apply',`<div class="field-grid">${numberInput('percentageBase','기준값',100,'')}${numberInput('percentageRate','적용 비율',20,'%')}${selectInput('percentageDirection','적용 방향',[{value:'increase',label:'증가',selected:true},{value:'decrease',label:'감소'}])}</div>`)}`);
    case 'stockAverage': return formShell(calc, `
      ${seg('stockMode',[{value:'add',label:'추가매수 후 평단'},{value:'target',label:'목표평단 역산'}])}
      <div class="field-grid">${numberInput('stockCurrentQty','기존 보유수량',100,'주')}${numberInput('stockCurrentAvg','기존 평균단가',50000,'')}${numberInput('stockFeeRate','매수 수수료율',0.015,'%')}</div>
      ${modePanel('stockMode','add',`<div class="field-grid" style="margin-top:16px">${numberInput('stockAddQty','추가 매수수량',50,'주')}${numberInput('stockAddPrice','추가 매수가격',40000,'')}</div>`)}
      ${modePanel('stockMode','target',`<div class="field-grid" style="margin-top:16px">${numberInput('stockTargetBuyPrice','추가 매수가격',40000,'')}${numberInput('stockTargetAvg','목표 평균단가',45000,'')}</div>`)}`);
    case 'cagr': return formShell(calc, `${seg('cagrMode',[{value:'calculate',label:'실제 CAGR 계산'},{value:'required',label:'목표 CAGR 역산'}])}<div class="field-grid">${numberInput('cagrStart','시작값',100,'')}${numberInput('cagrEnd','최종값 또는 목표값',259.37,'')}${numberInput('cagrYears','기간',10,'년')}</div>`);
    case 'dateDday': return formShell(calc, `
      ${seg('dateMode',[{value:'difference',label:'날짜 차이·D-day'},{value:'add',label:'날짜 더하기·빼기'}])}
      ${modePanel('dateMode','difference',`<div class="field-grid">${dateInput('dateStart','시작일','2026-08-16')}${dateInput('dateEnd','종료일','2026-12-31')}${checkbox('dateIncludeStart','시작일 포함',false)}${checkbox('dateBusinessOnly','결과를 평일 수로 표시',false)}</div>`)}
      ${modePanel('dateMode','add',`<div class="field-grid">${dateInput('dateBase','기준일','2026-08-16')}${numberInput('dateAddDays','계산할 일수',30,'일')}${selectInput('dateDirection','계산 방향',[{value:'add',label:'이후 날짜',selected:true},{value:'subtract',label:'이전 날짜'}])}${checkbox('dateAddBusinessOnly','주말 제외',false)}</div>`)}`);
    default: return formShell(calc, '<p>계산기 준비 중입니다.</p>');
  }
}

const details = {
  withholding33: { formula:'계약금액 × 3% = 사업소득세, 계약금액 × 0.3% = 지방소득세, 실수령액 = 계약금액 − 총 원천징수액', tips:['계약서의 금액이 세전인지 실수령액 기준인지 먼저 확인하세요.','역산 결과는 원 단위 처리에 따라 소액 차이가 생길 수 있습니다.','원천징수액은 다음 해 종합소득세 신고 때 기납부세액으로 정산됩니다.'], faq:[['3.3%를 떼면 근로자가 아닌가요?','계약 명칭보다 실제 지휘·감독과 근무형태가 중요합니다. 근로자임에도 3.3%로 처리되는 경우가 있을 수 있습니다.'],['3.3%가 최종 세금인가요?','아닙니다. 지급 시 미리 납부하는 원천징수액이며 종합소득세 신고로 최종 정산됩니다.']] },
  vat: { formula:'공급가액 × 부가세율 = 부가세, 공급가액 + 부가세 = 합계금액, 합계금액 ÷ 1.1 = 공급가액(세율 10%일 때)', tips:['세금계산서에는 공급가액과 부가세를 구분해 표시합니다.','면세·영세율·간이과세 거래는 별도 기준을 확인하세요.'], faq:[['합계금액 110만원의 공급가액은?','일반세율 10%라면 공급가액 100만원, 부가세 10만원입니다.'],['부가세 계산 결과가 1원 차이 나는 이유는?','거래처의 원 단위 반올림·버림 방식이 다를 수 있기 때문입니다.']] },
  netSalary: { formula:'월 실수령액 = 세전 월급 − 국민연금 − 건강보험 − 장기요양보험 − 고용보험 − 소득세 − 지방소득세', tips:['비과세액은 회사 급여명세서의 실제 비과세 항목만 입력하세요.','소득세는 간이 추정치이므로 실제 급여명세서와 비교하세요.','상여·성과급이 별도 지급되면 월별 실수령액이 달라질 수 있습니다.'], faq:[['연봉에 퇴직금이 포함되나요?','회사 계약에 따라 다르므로 연봉계약서를 확인해야 합니다. 이 계산기는 입력한 금액을 12개월 급여로 단순 환산합니다.'],['왜 다른 계산기와 금액이 다른가요?','간이세액표 적용, 부양가족, 비과세액, 보험료 산정기준의 차이 때문입니다.']] },
  hourlyMonthly: { formula:'월 환산시간 = (주 근로시간 + 유급 주휴시간) × 365 ÷ 7 ÷ 12, 월급 = 시급 × 월 환산시간', tips:['주휴수당 포함 여부를 구분해 비교하세요.','휴게시간은 유급 근로시간에서 제외하는 것이 일반적입니다.'], faq:[['월 209시간은 어떻게 나오나요?','주 40시간과 유급 주휴 8시간을 합한 48시간에 연평균 주수를 곱하면 약 209시간입니다.'],['주 15시간 미만도 주휴수당이 있나요?','일반적으로 주 소정근로시간이 15시간 미만이면 주휴수당 적용 대상이 아닙니다.']] },
  weeklyHoliday: { formula:'주휴시간 = 주 소정근로시간 ÷ 40 × 8(최대 8시간), 주휴수당 = 시급 × 주휴시간', tips:['주 15시간 이상인지 확인하세요.','소정근로일 개근 여부가 중요합니다.'], faq:[['하루 8시간이 아니어도 받을 수 있나요?','단시간근로자는 통상근로자의 근로시간에 비례해 주휴시간을 계산할 수 있습니다.'],['결근하면 무조건 못 받나요?','결근 사유와 근로계약에 따라 판단이 달라질 수 있어 사업장에 확인해야 합니다.']] },
  severance: { formula:'퇴직금 = 적용 1일 평균임금 × 30 × 계속근로일수 ÷ 365', tips:['퇴직일은 마지막 근무일의 다음 날로 입력하세요.','상여금과 연차수당의 평균임금 포함 범위를 확인하세요.','주 15시간 이상·1년 이상 계속근로 여부를 확인하세요.'], faq:[['3개월은 90일로 계산하나요?','정확한 평균임금은 퇴직일 이전 3개월의 실제 역일수를 사용합니다.'],['통상임금이 평균임금보다 높으면?','법령상 평균임금이 통상임금보다 적을 때 통상임금을 적용하는 경우가 있어 선택 입력란을 제공했습니다.']] },
  annualLeave: { formula:'1년 미만: 1개월 개근 시 1일(최대 11일), 1년 이상: 15일, 3년 이상부터 2년마다 1일 가산(최대 25일)', tips:['상시근로자 5인 이상 사업장인지 확인하세요.','회계연도 기준 부여 시 회사 관리일수와 다를 수 있습니다.'], faq:[['입사 1년이 되면 26일이 생기나요?','최초 1년 동안 월 단위로 발생한 연차와 1년 근무 후 발생하는 15일은 사용·발생 시점에 따라 별도로 관리됩니다.'],['5인 미만 사업장도 법정 연차가 있나요?','근로기준법 제60조의 일반적 연차 규정은 상시 5인 이상 사업장에 적용됩니다.']] },
  fourInsurance: { formula:'근로자 부담액 = 국민연금 + 건강보험 + 장기요양보험 + 고용보험, 사업주 부담액에는 산재보험과 고용안정·직업능력개발 부담이 추가됩니다.', tips:['산재보험료율은 업종별로 다릅니다.','비과세 항목이 보험별 보수 산정에서 모두 동일하게 제외되는 것은 아닐 수 있습니다.'], faq:[['국민연금이 월급 전체에 붙나요?','기준소득월액 상·하한 범위가 적용됩니다.'],['사업주 부담액도 월급에서 공제하나요?','아닙니다. 사업주 부담분은 회사가 별도로 부담합니다.']] },
  loanInterest: { formula:'이자 = 대출원금 × 연이율 × 대출기간(연 단위)', tips:['단기 대출은 실제 일수 방식이 더 정확할 수 있습니다.','변동금리와 중도상환수수료는 별도로 고려하세요.'], faq:[['월 이자는 연이율을 12로 나누면 되나요?','단순 계산은 가능하지만 금융기관은 실제 일수와 납입일을 적용할 수 있습니다.'],['원리금균등상환에도 이 계산기를 쓰나요?','이 페이지는 단순이자·만기일시상환에 적합합니다. 원리금균등상환 전용 계산기를 이용하세요.']] },
  equalPayment: { formula:'월 상환액 = 원금 × 월이율 × (1+월이율)^개월수 ÷ [(1+월이율)^개월수 − 1]', tips:['추가상환액을 넣어 총이자 절감효과를 비교하세요.','변동금리 상품은 실제 상환액이 달라집니다.'], faq:[['초기에는 왜 이자 비중이 큰가요?','남은 원금이 가장 큰 시기이므로 같은 금리에서도 이자가 많이 발생합니다.'],['추가상환하면 월 납입액이 줄어드나요?','이 계산기는 기본 납입액을 유지하고 기간이 단축되는 방식으로 계산합니다.']] },
  depositInterest: { formula:'단리 이자 = 원금 × 연이율 × 기간, 세후이자 = 세전이자 × (1 − 세율)', tips:['금리 적용방식과 이자 지급주기를 상품설명서에서 확인하세요.','비과세·세금우대 상품은 세율을 직접 바꾸세요.'], faq:[['15.4%는 무엇인가요?','일반과세 기준 이자소득세 14%와 지방소득세 1.4%를 합한 값입니다.'],['복리예금은 항상 더 유리한가요?','같은 표시금리와 기간이라면 복리가 유리하지만 상품별 금리와 조건을 함께 비교해야 합니다.']] },
  compound: { formula:'미래가치 = 초기금액의 복리 미래가치 + 매월 적립금의 복리 누적가치', tips:['수익률을 지나치게 높게 가정하지 마세요.','세금·수수료·변동성을 별도로 고려하세요.','물가를 반영한 실질가치도 함께 보세요.'], faq:[['월 적립금은 월초와 월말이 왜 다른가요?','월초 납입은 한 달 더 운용되므로 장기적으로 결과가 조금 더 커집니다.'],['연 10%가 매년 보장되나요?','아닙니다. 일정 수익률 가정의 시뮬레이션일 뿐입니다.']] },
  rentConversion: { formula:'월세 증감액 = 보증금 증감액 × 연 전환율 ÷ 12', tips:['법정 상한과 실제 협의 전환율을 구분하세요.','관리비와 별도 비용은 포함되지 않습니다.'], faq:[['기본 전환율 4.75%는 고정인가요?','아닙니다. 기준금리 변동과 계약조건에 따라 바뀔 수 있어 직접 수정할 수 있습니다.'],['보증금과 월세를 동시에 바꿔도 되나요?','현재 조건과 목표 조건의 차이를 각각 입력해 비교할 수 있습니다.']] },
  brokerage: { formula:'중개보수 = 중개보수 산정 거래금액 × 적용요율(단, 구간별 한도액 이내)', tips:['월세는 보증금과 월세를 환산해 거래금액을 구합니다.','상한요율 이내에서 실제 보수는 중개사와 협의합니다.'], faq:[['월세 거래금액은 어떻게 계산하나요?','일반적으로 보증금 + 월세×100을 사용하고 5천만원 미만이면 월세×70을 적용합니다.'],['부가세를 별도로 내야 하나요?','중개사업자의 과세유형 등에 따라 달라질 수 있어 계약 전에 확인하세요.']] },
  pyeong: { formula:'평 = 제곱미터 ÷ 3.305785, 제곱미터 = 평 × 3.305785', tips:['전용면적과 공급면적을 구분하세요.','부동산 광고의 평형은 공급면적을 지칭하는 경우가 많습니다.'], faq:[['84㎡는 몇 평인가요?','면적 자체는 약 25.41평이며 흔히 공급면적 기준으로 33~34평형 아파트에 해당할 수 있습니다.'],['평은 법정계량단위인가요?','공식 계약과 공시는 제곱미터를 사용하며 평은 이해를 위한 환산값입니다.']] },
  discount: { formula:'중복할인 최종가격 = 정상가격 × (1−1차 할인율) × (1−2차 할인율) − 쿠폰 − 포인트 + 배송비', tips:['20%+10% 중복할인은 30%가 아니라 28% 할인입니다.','정액 쿠폰의 최소 결제조건을 확인하세요.'], faq:[['중복 할인율을 왜 더하지 않나요?','두 번째 할인은 이미 할인된 금액에 적용되기 때문입니다.'],['배송비도 할인율에 포함되나요?','이 계산기는 상품 실질 할인율에서 배송비를 제외해 별도로 표시합니다.']] },
  percentageChange: { formula:'증감률 = (이후 값 − 이전 값) ÷ 이전 값 × 100', tips:['기준값이 0이면 일반적인 증감률을 계산할 수 없습니다.','음수 값은 해석에 주의하세요.'], faq:[['80에서 100은 몇 % 증가인가요?','20 증가를 기준값 80으로 나누므로 25% 증가입니다.'],['100에서 80은 왜 20% 감소인가요?','감소율의 기준값은 100이므로 20÷100=20%입니다.']] },
  stockAverage: { formula:'새 평단가 = (기존수량×기존평단 + 추가수량×추가가격×수수료포함계수) ÷ 총수량', tips:['평단을 낮추는 것과 기업가치가 개선되는 것은 별개입니다.','환전비용과 세금은 별도로 계산하세요.'], faq:[['목표 평단가가 왜 계산되지 않나요?','목표값은 현재 평단과 추가 매수가격 사이에 있어야 합니다.'],['매도하면 평단가가 바뀌나요?','증권사 표시방식에 따라 달라질 수 있으며 이 계산기는 추가매수 가중평균에 초점을 둡니다.']] },
  cagr: { formula:'CAGR = (최종값 ÷ 시작값)^(1 ÷ 기간) − 1', tips:['단순 평균수익률과 CAGR을 구분하세요.','중간 현금유입·유출이 있으면 IRR이 더 적합할 수 있습니다.'], faq:[['총수익률과 CAGR은 어떻게 다른가요?','총수익률은 전체 변화, CAGR은 그 변화를 매년 일정한 복리율로 환산한 값입니다.'],['10년간 2배면 CAGR은?','약 7.18%입니다. 72의 법칙과 유사하게 확인할 수 있습니다.']] },
  dateDday: { formula:'날짜 차이 = 종료일 − 시작일, 평일 수는 토요일·일요일을 제외해 계산', tips:['시작일 포함 여부를 먼저 선택하세요.','공휴일은 자동 제외하지 않습니다.'], faq:[['D-1과 하루 차이는 같은가요?','오늘을 기준으로 내일이면 D-1로 표시됩니다. 날짜 차이의 포함 기준에 따라 개수는 달라질 수 있습니다.'],['영업일에 공휴일도 제외되나요?','현재 버전은 주말만 제외하므로 공휴일은 별도로 고려해야 합니다.']] }
};

function contentBlocks(calc) {
  const detail = details[calc.id] || { formula: calc.basis, tips: [], faq: [] };
  return `
  <section class="content-section"><h2>${esc(calc.title)} 사용 방법</h2><ol><li>계산 기준을 선택하고 필요한 값을 입력합니다.</li><li><strong>계산하기</strong>를 눌러 핵심 결과와 세부 내역을 확인합니다.</li><li>결과 복사 또는 인쇄 기능으로 저장하고, 실제 계약·신고·투자 전 관계기관 기준과 비교합니다.</li></ol><h3>계산 공식</h3><div class="formula">${esc(detail.formula)}</div><h3>정확하게 사용하는 팁</h3><ul>${detail.tips.map((tip) => `<li>${esc(tip)}</li>`).join('')}</ul><div class="notice">${esc(calc.basis)} 계산 결과는 일반적인 참고값이며 개인별 조건과 최신 제도에 따라 달라질 수 있습니다.</div></section>
  <section class="content-section"><h2>자주 묻는 질문</h2>${detail.faq.map(([q,a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>`;
}

function related(calculator) {
  const same = calculators.filter((item) => item.id !== calculator.id && item.category === calculator.category);
  const fallback = calculators.filter((item) => item.id !== calculator.id && !same.some((x) => x.id === item.id));
  return [...same, ...fallback].slice(0,3);
}

function renderAd(position) {
  const slot = config.adsenseSlots?.[position];
  if (!config.adsenseClient || !slot) return '';
  return `<div class="ad-slot is-configured" aria-label="광고"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(config.adsenseClient)}" data-ad-slot="${esc(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}

function calculatorBody(calc) {
  const category = categoryMap[calc.category];
  const rel = related(calc);
  return `${breadcrumbs(calc)}
  <section class="page-hero"><div class="container page-hero-inner"><div><span class="page-kicker">${esc(category.name)} · ${esc(calc.badge)}</span><h1>${esc(calc.title)}</h1><p>${esc(calc.description)}</p></div><div class="page-hero-icon">${iconByCategory[calc.category]}</div></div></section>
  <div class="container calc-layout"><div class="calc-main">${renderAd('top')}${renderForm(calc)}${renderAd('middle')}${contentBlocks(calc)}<section class="content-section"><h2>함께 사용하면 좋은 계산기</h2><div class="related-grid">${rel.map((item) => `<a class="related-link" href="${item.path}"><strong>${esc(item.title)}</strong><span>${esc(item.summary)}</span></a>`).join('')}</div></section>${renderAd('bottom')}</div>
  <aside class="calc-sidebar"><div class="info-card"><h3>이 계산기의 기준</h3><p>${esc(calc.basis)}</p></div><div class="info-card source"><h3>기준·출처 확인</h3><p>${esc(calc.sourceLabel || '일반 계산 공식')}</p>${calc.sourceUrl ? `<a class="source-link" href="${esc(calc.sourceUrl)}" target="_blank" rel="noopener noreferrer">공식 자료 열기 →</a>` : ''}</div><div class="info-card"><h3>꼭 확인하세요</h3><ul><li>입력값은 브라우저에서만 계산됩니다.</li><li>결과는 참고용이며 법률·세무·금융 자문이 아닙니다.</li><li>기준 변경 시 실제 금액과 차이가 날 수 있습니다.</li></ul></div></aside></div>`;
}

function categoryBody(category) {
  const list = calculators.filter((calc) => calc.category === category.id);
  return `<section class="page-hero"><div class="container page-hero-inner"><div><span class="page-kicker">우리집계산기 카테고리</span><h1>${esc(category.name)} 계산기</h1><p>${esc(category.description)} 필요한 계산기를 선택하면 독립 페이지에서 자세한 계산과 설명을 확인할 수 있습니다.</p></div><div class="page-hero-icon">${category.icon}</div></div></section><section class="section"><div class="container"><div class="calculator-grid">${list.map(card).join('')}</div></div></section>`;
}

function staticBody(title, content) {
  return `<section class="static-page"><div class="narrow"><article><h1>${esc(title)}</h1>${content}</article></div></section>`;
}

const websiteSchema = { '@context':'https://schema.org','@type':'WebSite', name:config.siteName, url:siteUrl, description:config.homeDescription };
writeRoute('/', page({ title:config.homeTitle, description:config.homeDescription, route:'/', body:homeBody(), structuredData:[websiteSchema] }));

for (const category of categories) {
  writeRoute(`/${category.id}/`, page({ title:`${category.name} 계산기 모음 | ${config.siteName}`, description:`${category.description} ${calculators.filter((calc) => calc.category === category.id).map((calc) => calc.title).join(', ')}을 제공합니다.`, route:`/${category.id}/`, body:categoryBody(category), activeCategory:category.id }));
}

for (const calc of calculators) {
  const category = categoryMap[calc.category];
  const detail = details[calc.id] || { faq:[] };
  const schemas = [
    { '@context':'https://schema.org','@type':'WebApplication', name:calc.title, url:`${siteUrl}${calc.path}`, applicationCategory:'FinanceApplication', operatingSystem:'Web', isAccessibleForFree:true, description:calc.description, provider:{'@type':'Organization',name:config.siteName,url:siteUrl} },
    { '@context':'https://schema.org','@type':'BreadcrumbList', itemListElement:[
      {'@type':'ListItem',position:1,name:'홈',item:`${siteUrl}/`},
      {'@type':'ListItem',position:2,name:category.name,item:`${siteUrl}/${category.id}/`},
      {'@type':'ListItem',position:3,name:calc.title,item:`${siteUrl}${calc.path}`}
    ]}
  ];
  if (detail.faq?.length) schemas.push({ '@context':'https://schema.org','@type':'FAQPage', mainEntity:detail.faq.map(([q,a]) => ({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}})) });
  writeRoute(calc.path, page({ title:calc.seoTitle, description:calc.description, route:calc.path, body:calculatorBody(calc), activeCategory:calc.category, structuredData:schemas, pageType:'article' }));
}

writeRoute('/about/', page({ title:`사이트 소개 | ${config.siteName}`, description:`${config.siteName} 서비스와 운영 원칙을 안내합니다.`, route:'/about/', body:staticBody('우리집계산기 소개', `<p><strong>${esc(config.siteName)}</strong>는 세금, 급여, 대출, 부동산, 투자와 생활에서 자주 필요한 계산을 한곳에 모은 무료 계산기 플랫폼입니다.</p><h2>운영 원칙</h2><ul><li>회원가입 없이 바로 사용할 수 있습니다.</li><li>계산은 사용자의 브라우저에서 수행되며 입력값을 별도로 저장하지 않습니다.</li><li>계산 공식과 기준일, 주의사항을 가능한 한 명확히 표시합니다.</li><li>법령·요율이 바뀌는 계산기는 정기적으로 기준을 점검합니다.</li></ul><h2>문의</h2><p>오류 제보와 제휴 문의는 <a href="mailto:${esc(config.contactEmail)}">${esc(config.contactEmail)}</a>로 보내주세요.</p>`) }));
writeRoute('/privacy/', page({ title:`개인정보처리방침 | ${config.siteName}`, description:`${config.siteName} 개인정보처리방침입니다.`, route:'/privacy/', body:staticBody('개인정보처리방침', `<p>시행일: 2026년 8월 16일</p><h2>1. 계산 입력값</h2><p>계산기에 입력한 금액과 날짜는 사용자의 브라우저 안에서 처리되며 운영 서버에 저장하지 않습니다.</p><h2>2. 접속정보와 쿠키</h2><p>서비스 개선과 광고 제공을 위해 Google Analytics 및 Google AdSense를 사용할 수 있습니다. 해당 서비스는 쿠키, 기기정보, IP 주소 등의 정보를 처리할 수 있습니다.</p><h2>3. 광고</h2><p>Google을 포함한 제3자 광고 제공업체는 사용자의 이전 방문 기록을 기반으로 광고를 제공할 수 있습니다. 사용자는 Google 광고 설정에서 맞춤형 광고를 관리할 수 있습니다.</p><h2>4. 문의</h2><p>개인정보 관련 문의: <a href="mailto:${esc(config.contactEmail)}">${esc(config.contactEmail)}</a></p>`) }));
writeRoute('/terms/', page({ title:`이용약관 | ${config.siteName}`, description:`${config.siteName} 이용약관입니다.`, route:'/terms/', body:staticBody('이용약관', `<h2>1. 서비스 목적</h2><p>본 서비스는 일반적인 계산 편의를 제공하며 전문적인 세무·노무·법률·금융 자문을 제공하지 않습니다.</p><h2>2. 이용자의 책임</h2><p>이용자는 실제 계약, 신고, 대출, 투자 또는 급여정산 전에 관계기관과 전문가의 최신 기준을 확인해야 합니다.</p><h2>3. 서비스 변경</h2><p>운영자는 정확성 개선과 제도 변경 반영을 위해 계산식과 화면을 변경할 수 있습니다.</p><h2>4. 저작권</h2><p>본 서비스의 소스코드, 화면 구성, 디자인, 문구 및 콘텐츠는 저작권법의 보호를 받습니다. 사전 서면 동의 없는 무단 복제, 배포, 수정, 재판매 및 상업적 이용을 금합니다.</p>`) }));
writeRoute('/disclaimer/', page({ title:`계산 결과 면책 안내 | ${config.siteName}`, description:`계산 결과의 적용 범위와 주의사항을 안내합니다.`, route:'/disclaimer/', body:staticBody('계산 결과 면책 안내', `<p>우리집계산기의 결과는 사용자가 입력한 정보와 일반적인 계산식을 바탕으로 한 참고값입니다.</p><ul><li>세금·사회보험·급여는 개인별 공제, 사업장 처리방식과 최신 법령에 따라 달라집니다.</li><li>대출·예금은 금융기관의 일수 계산, 금리변동, 수수료와 상품조건에 따라 달라집니다.</li><li>부동산 계산은 지역 조례, 계약조건과 거래유형에 따라 달라집니다.</li><li>투자 계산은 미래수익을 보장하지 않습니다.</li></ul><p>중요한 의사결정에는 국세청, 고용노동부, 국민연금공단, 국민건강보험공단, 금융기관 또는 자격 있는 전문가의 확인을 받으세요.</p>`) }));
writeRoute('/contact/', page({ title:`문의하기 | ${config.siteName}`, description:`계산 오류 제보와 서비스 문의 방법입니다.`, route:'/contact/', body:staticBody('문의하기', `<p>계산 오류, 기준 변경, 기능 제안과 제휴 문의를 이메일로 보내주세요.</p><p><strong>문의 이메일</strong><br><a href="mailto:${esc(config.contactEmail)}">${esc(config.contactEmail)}</a></p><h2>오류 제보 시 포함할 내용</h2><ul><li>사용한 계산기 이름과 주소</li><li>입력한 값</li><li>표시된 결과와 예상한 결과</li><li>참고한 공식 자료 또는 기준일</li></ul>`) }));

const allRoutes = ['/', ...categories.map((c) => `/${c.id}/`), ...calculators.map((c) => c.path), '/about/','/privacy/','/terms/','/disclaimer/','/contact/'];
const today = new Date().toISOString().slice(0,10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allRoutes.map((route) => `  <url><loc>${siteUrl}${route}</loc><lastmod>${today}</lastmod><changefreq>${route === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${route === '/' ? '1.0' : calculators.some((c) => c.path === route) ? '0.9' : '0.6'}</priority></url>`).join('\n')}\n</urlset>`;
fs.writeFileSync(path.join(publicDir,'sitemap.xml'),sitemap);
fs.writeFileSync(path.join(publicDir,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
fs.writeFileSync(path.join(publicDir,'ads.txt'),config.adsenseClient ? `google.com, ${config.adsenseClient.replace('ca-pub-','pub-')}, DIRECT, f08c47fec0942fa0\n` : '# AdSense 승인 후 site.config.json에 게시자 ID를 입력하고 다시 빌드하세요.\n');
fs.writeFileSync(path.join(publicDir,'manifest.webmanifest'),JSON.stringify({name:config.siteName,short_name:config.siteName,start_url:'/',display:'standalone',background_color:'#f5f7fb',theme_color:'#3157d5',icons:[{src:'/assets/favicon.svg',sizes:'any',type:'image/svg+xml'}]},null,2));
fs.writeFileSync(path.join(publicDir,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  X-Frame-Options: SAMEORIGIN\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`);
fs.writeFileSync(path.join(publicDir,'_redirects'),`/index.html / 301\n`);
fs.writeFileSync(path.join(publicDir,'404.html'),page({title:`페이지를 찾을 수 없습니다 | ${config.siteName}`,description:'요청한 페이지를 찾을 수 없습니다.',route:'/404.html',body:staticBody('페이지를 찾을 수 없습니다','<p>주소가 변경되었거나 존재하지 않는 페이지입니다.</p><p><a class="btn btn-primary" href="/">계산기 홈으로 이동</a></p>'),structuredData:[]}));

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3157d5"/><stop offset="1" stop-color="#7692ff"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="url(#g)"/><path d="M15 29 32 15l17 14v18a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V29Z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M24 31h16M24 39h5m6 0h5" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`;
fs.writeFileSync(path.join(publicDir,'assets/favicon.svg'),favicon);
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#edf2ff"/><stop offset="1" stop-color="#e9fbf5"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><rect x="90" y="90" width="1020" height="450" rx="46" fill="#fff" stroke="#dce4f1"/><rect x="150" y="160" width="96" height="96" rx="28" fill="#3157d5"/><path d="M174 205 198 184l24 21v27h-48v-27Z" fill="none" stroke="#fff" stroke-width="7"/><text x="285" y="220" font-family="Arial, sans-serif" font-size="64" font-weight="800" fill="#172033">우리집계산기</text><text x="150" y="330" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#3157d5">생활에 필요한 계산을 가장 쉽고 빠르게</text><text x="150" y="402" font-family="Arial, sans-serif" font-size="27" fill="#667085">세금 · 급여 · 대출 · 부동산 · 투자 · 생활 계산기 모음</text></svg>`;
fs.writeFileSync(path.join(publicDir,'assets/og-image.svg'),og);

console.log(`Built ${calculators.length} calculators and ${allRoutes.length} indexable routes into ${publicDir}`);
