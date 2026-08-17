(() => {
  'use strict';

  const W = window.WooriCalc;
  if (!W) return;
  const { $, $$, parseNumber: num, formatWon: won, formatNumber: fmt, formatPercent: pct, roundByMode, clamp, parseDate, daysBetween, addDays, addMonths, formatDateKo, renderResult, showError, escapeHtml } = W;

  const form = $('#calculatorForm');
  if (!form) return;
  const calculatorId = form.dataset.calculatorId;

  const value = (id) => $(`#${id}`)?.value ?? '';
  const number = (id) => num(value(id));
  const checked = (id) => Boolean($(`#${id}`)?.checked);
  const selectedRadio = (name) => $(`input[name="${CSS.escape(name)}"]:checked`)?.value;

  function setField(id, val) {
    const el = $(`#${id}`);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = Boolean(val);
    else if (el.type === 'radio') el.checked = Boolean(val);
    else el.value = val;
    if (el.classList.contains('money-input') && val !== '') {
      el.value = Math.round(num(val)).toLocaleString('ko-KR');
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setRadio(name, val) {
    const el = $(`input[name="${CSS.escape(name)}"][value="${CSS.escape(String(val))}"]`);
    if (el) {
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function requirePositive(value, message) {
    if (!(value > 0)) {
      showError(message);
      return false;
    }
    return true;
  }

  function earnedIncomeDeduction(gross) {
    if (gross <= 5_000_000) return gross * 0.7;
    if (gross <= 15_000_000) return 3_500_000 + (gross - 5_000_000) * 0.4;
    if (gross <= 45_000_000) return 7_500_000 + (gross - 15_000_000) * 0.15;
    if (gross <= 100_000_000) return 12_000_000 + (gross - 45_000_000) * 0.05;
    return Math.min(20_000_000, 14_750_000 + (gross - 100_000_000) * 0.02);
  }

  function progressiveIncomeTax(base) {
    const brackets = [
      [14_000_000, 0.06, 0],
      [50_000_000, 0.15, 1_260_000],
      [88_000_000, 0.24, 5_760_000],
      [150_000_000, 0.35, 15_440_000],
      [300_000_000, 0.38, 19_940_000],
      [500_000_000, 0.40, 25_940_000],
      [1_000_000_000, 0.42, 35_940_000],
      [Infinity, 0.45, 65_940_000]
    ];
    const [_, rate, deduction] = brackets.find(([limit]) => base <= limit);
    return Math.max(0, base * rate - deduction);
  }

  function estimateMonthlyIncomeTax({ grossMonthly, nonTaxMonthly, dependents, children, pensionMonthly, ratio }) {
    const annualGross = Math.max(0, (grossMonthly - nonTaxMonthly) * 12);
    const earnedIncome = Math.max(0, annualGross - earnedIncomeDeduction(annualGross));
    const personalDeduction = Math.max(1, dependents) * 1_500_000;
    const standardDeductions = 1_000_000 + pensionMonthly * 12;
    const taxBase = Math.max(0, earnedIncome - personalDeduction - standardDeductions);
    const calculated = progressiveIncomeTax(taxBase);
    let employmentCredit = calculated <= 1_300_000
      ? calculated * 0.55
      : 715_000 + (calculated - 1_300_000) * 0.30;
    let creditCap = 740_000;
    if (annualGross > 33_000_000 && annualGross <= 70_000_000) {
      creditCap = Math.max(660_000, 740_000 - (annualGross - 33_000_000) * 0.008);
    } else if (annualGross > 70_000_000 && annualGross <= 120_000_000) {
      creditCap = Math.max(500_000, 660_000 - (annualGross - 70_000_000) * 0.0032);
    } else if (annualGross > 120_000_000) {
      creditCap = 200_000;
    }
    employmentCredit = Math.min(employmentCredit, creditCap);
    let childCredit = 0;
    if (children === 1) childCredit = 150_000;
    if (children === 2) childCredit = 350_000;
    if (children >= 3) childCredit = 350_000 + (children - 2) * 300_000;
    const annualTax = Math.max(0, calculated - employmentCredit - childCredit);
    return Math.round((annualTax / 12) * ratio);
  }

  const calculators = {
    withholding33() {
      const mode = selectedRadio('withholdingMode') || 'gross';
      const amount = number('withholdingAmount');
      const rounding = value('withholdingRounding') || 'round';
      if (!requirePositive(amount, '계약금액 또는 실제 수령액을 입력해 주세요.')) return;
      const calcFromGross = (gross) => {
        const income = roundByMode(gross * 0.03, rounding);
        const local = roundByMode(gross * 0.003, rounding);
        return { gross, income, local, total: income + local, net: gross - income - local };
      };
      let result;
      if (mode === 'gross') {
        result = calcFromGross(amount);
      } else {
        const estimate = amount / 0.967;
        let best = null;
        for (let i = -20; i <= 20; i += 1) {
          const candidate = Math.max(0, roundByMode(estimate, rounding) + i);
          const current = calcFromGross(candidate);
          const diff = Math.abs(current.net - amount);
          if (!best || diff < best.diff) best = { ...current, diff };
        }
        result = best;
      }
      renderResult({
        label: mode === 'gross' ? '예상 실수령액' : '역산한 계약금액',
        value: won(mode === 'gross' ? result.net : result.gross),
        rows: [
          ['계약금액', won(result.gross)],
          ['사업소득세 3%', won(result.income)],
          ['지방소득세 0.3%', won(result.local)],
          ['총 원천징수액 3.3%', won(result.total)],
          ['실제 수령액', won(result.net)]
        ],
        note: '원 단위 처리 방식과 지급처의 정산 기준에 따라 몇 원 정도 차이가 날 수 있습니다.',
        alert: { type: 'warn', text: '3.3%는 최종 확정세액이 아니라 원천징수액입니다. 근로자에 해당한다면 3.3% 계약이 적절하지 않을 수 있습니다.' }
      });
    },

    vat() {
      const mode = selectedRadio('vatMode') || 'total';
      const amount = number('vatAmount');
      const rate = number('vatRate') / 100;
      const rounding = value('vatRounding') || 'round';
      if (!requirePositive(amount, '합계금액 또는 공급가액을 입력해 주세요.')) return;
      if (rate < 0 || rate > 1) return showError('부가세율은 0% 이상 100% 이하로 입력해 주세요.');
      let supply;
      let tax;
      let total;
      if (mode === 'total') {
        total = amount;
        supply = roundByMode(total / (1 + rate), rounding);
        tax = total - supply;
      } else {
        supply = amount;
        tax = roundByMode(supply * rate, rounding);
        total = supply + tax;
      }
      renderResult({
        label: mode === 'total' ? '공급가액' : '부가세 포함 합계금액',
        value: won(mode === 'total' ? supply : total),
        rows: [
          ['공급가액', won(supply)],
          [`부가세 ${pct(rate * 100, 1)}`, won(tax)],
          ['합계금액', won(total)]
        ],
        note: '일반과세 거래의 단순 금액 분리 계산입니다. 실제 신고세액은 매입세액, 공제 및 거래 유형에 따라 달라집니다.'
      });
    },

    netSalary() {
      const mode = selectedRadio('salaryMode') || 'annual';
      const amount = number('salaryAmount');
      const grossMonthly = mode === 'annual' ? amount / 12 : amount;
      const nonTax = clamp(number('salaryNonTax'), 0, grossMonthly);
      const dependents = Math.max(1, Math.round(number('salaryDependents')) || 1);
      const children = Math.max(0, Math.round(number('salaryChildren')) || 0);
      const withholdingRatio = (number('salaryWithholdingRatio') || 100) / 100;
      const insuranceBase = Math.max(0, grossMonthly - nonTax);
      if (!requirePositive(grossMonthly, '연봉 또는 월급을 입력해 주세요.')) return;
      const pension = Math.round(Math.min(insuranceBase, 6_590_000) * 0.0475);
      const health = Math.round(insuranceBase * 0.03595);
      const longCare = Math.round(health * (0.009448 / 0.0719));
      const employment = Math.round(insuranceBase * 0.009);
      const taxMode = selectedRadio('salaryTaxMode') || 'auto';
      const incomeTax = taxMode === 'manual'
        ? Math.max(0, Math.round(number('salaryManualTax')))
        : estimateMonthlyIncomeTax({ grossMonthly, nonTaxMonthly: nonTax, dependents, children, pensionMonthly: pension, ratio: withholdingRatio });
      const localTax = Math.round(incomeTax * 0.1);
      const social = pension + health + longCare + employment;
      const totalDeduction = social + incomeTax + localTax;
      const net = Math.max(0, grossMonthly - totalDeduction);
      renderResult({
        label: '월 예상 실수령액',
        value: won(net),
        rows: [
          ['세전 월급', won(grossMonthly)],
          ['비과세액', won(nonTax)],
          ['국민연금', won(pension)],
          ['건강보험', won(health)],
          ['장기요양보험', won(longCare)],
          ['고용보험', won(employment)],
          ['예상 근로소득세', won(incomeTax)],
          ['지방소득세', won(localTax)],
          ['월 총 공제액', won(totalDeduction)],
          ['연 예상 실수령액', won(net * 12)]
        ],
        note: '소득세 자동 계산은 일반적인 공제만 반영한 간편 추정치입니다. 회사의 간이세액표 적용, 부양가족 요건, 비과세 항목에 따라 실제 급여명세서와 달라질 수 있습니다.',
        alert: { type: 'warn', text: '정확한 급여 정산은 회사 급여담당자 또는 국세청 간이세액표를 확인하세요.' }
      });
    },

    hourlyMonthly() {
      const mode = selectedRadio('hourlyMode') || 'hourlyToMonthly';
      const amount = number('hourlyAmount');
      const weeklyHours = number('hourlyWeeklyHours');
      const weeklyDays = Math.max(1, number('hourlyWeeklyDays'));
      const includeHoliday = checked('hourlyIncludeHoliday');
      if (!requirePositive(amount, '시급 또는 월급을 입력해 주세요.')) return;
      if (!requirePositive(weeklyHours, '주 소정근로시간을 입력해 주세요.')) return;
      const eligible = weeklyHours >= 15;
      const holidayHours = includeHoliday && eligible ? Math.min(8, weeklyHours / 40 * 8) : 0;
      const monthlyHours = (weeklyHours + holidayHours) * 365 / 7 / 12;
      const hourly = mode === 'hourlyToMonthly' ? amount : amount / monthlyHours;
      const monthly = mode === 'hourlyToMonthly' ? amount * monthlyHours : amount;
      const weekly = hourly * (weeklyHours + holidayHours);
      const minimum = 10_320;
      renderResult({
        label: mode === 'hourlyToMonthly' ? '예상 월급' : '환산 시급',
        value: mode === 'hourlyToMonthly' ? won(monthly) : won(hourly, 0),
        rows: [
          ['환산 시급', won(hourly)],
          ['주 소정근로시간', `${fmt(weeklyHours, 1)}시간`],
          ['유급 주휴시간', `${fmt(holidayHours, 1)}시간`],
          ['월 환산시간', `${fmt(monthlyHours, 1)}시간`],
          ['예상 주급', won(weekly)],
          ['예상 월급', won(monthly)]
        ],
        note: `주 ${fmt(weeklyDays, 0)}일 근무 입력을 참고정보로 표시했으며, 월 환산은 연평균 주수(365÷7÷12)를 사용했습니다.`,
        alert: hourly >= minimum
          ? { type: 'good', text: `환산 시급이 2026년 최저임금 ${won(minimum)} 이상입니다.` }
          : { type: 'danger', text: `환산 시급이 2026년 최저임금 ${won(minimum)}보다 낮습니다.` }
      });
    },

    weeklyHoliday() {
      const hourly = number('weeklyHourlyWage');
      const dailyHours = number('weeklyDailyHours');
      const days = number('weeklyWorkDays');
      const attendance = checked('weeklyFullAttendance');
      if (!requirePositive(hourly, '시급을 입력해 주세요.')) return;
      if (!requirePositive(dailyHours, '하루 근로시간을 입력해 주세요.')) return;
      if (!requirePositive(days, '주 근무일수를 입력해 주세요.')) return;
      const weeklyHours = dailyHours * days;
      const eligible = weeklyHours >= 15 && attendance;
      const paidHours = eligible ? Math.min(8, weeklyHours / 40 * 8) : 0;
      const holidayPay = hourly * paidHours;
      const baseWeeklyPay = hourly * weeklyHours;
      const weeklyPay = baseWeeklyPay + holidayPay;
      const monthly = weeklyPay * 365 / 7 / 12;
      renderResult({
        label: '주휴수당',
        value: won(holidayPay),
        rows: [
          ['주 소정근로시간', `${fmt(weeklyHours, 1)}시간`],
          ['유급 주휴시간', `${fmt(paidHours, 1)}시간`],
          ['기본 주급', won(baseWeeklyPay)],
          ['주휴수당 포함 주급', won(weeklyPay)],
          ['월 환산액', won(monthly)]
        ],
        note: '단시간근로자의 유급 주휴시간은 주 소정근로시간을 통상근로자 40시간에 비례해 산정한 일반적인 방식입니다.',
        alert: eligible
          ? { type: 'good', text: '주 15시간 이상이며 소정근로일 개근으로 입력되어 일반적인 주휴수당 요건을 충족합니다.' }
          : { type: 'warn', text: '주 15시간 미만이거나 소정근로일을 개근하지 않은 것으로 입력되어 주휴수당을 0원으로 계산했습니다.' }
      });
    },

    severance() {
      const hire = parseDate(value('severanceHireDate'));
      const retire = parseDate(value('severanceRetireDate'));
      const wages = number('severanceWages3m');
      const bonus = number('severanceAnnualBonus');
      const leave = number('severanceAnnualLeavePay');
      const ordinary = number('severanceOrdinaryDaily');
      const weeklyHours = number('severanceWeeklyHours');
      if (!hire || !retire || retire <= hire) return showError('입사일과 퇴직일을 올바르게 입력해 주세요. 퇴직일은 마지막 근무일의 다음 날 기준입니다.');
      if (!requirePositive(wages, '퇴직 전 3개월 임금총액을 입력해 주세요.')) return;
      const serviceDays = daysBetween(hire, retire);
      const threeMonthStart = addMonths(retire, -3);
      const threeMonthDays = Math.max(1, daysBetween(threeMonthStart, retire));
      const includedBonus = bonus * 3 / 12;
      const includedLeave = leave * 3 / 12;
      const averageDaily = (wages + includedBonus + includedLeave) / threeMonthDays;
      const appliedDaily = Math.max(averageDaily, ordinary || 0);
      const severance = appliedDaily * 30 * serviceDays / 365;
      const eligible = serviceDays >= 365 && weeklyHours >= 15;
      renderResult({
        label: '예상 퇴직금',
        value: won(severance),
        rows: [
          ['계속근로기간', `${fmt(serviceDays, 0)}일 (${fmt(serviceDays / 365, 2)}년)`],
          ['평균임금 산정일수', `${fmt(threeMonthDays, 0)}일`],
          ['상여금 반영액(3/12)', won(includedBonus)],
          ['연차수당 반영액(3/12)', won(includedLeave)],
          ['1일 평균임금', won(averageDaily, 2)],
          ['적용 1일 임금', won(appliedDaily, 2)],
          ['예상 퇴직금', won(severance)]
        ],
        note: '퇴직일은 마지막 근무일 다음 날로 입력하는 방식입니다. 평균임금 산정 제외기간, 통상임금 최저보장, 실제 상여·연차수당 반영 범위에 따라 달라질 수 있습니다.',
        alert: eligible
          ? { type: 'good', text: '계속근로 1년 이상, 주 15시간 이상으로 입력되어 일반적인 퇴직금 요건을 충족합니다.' }
          : { type: 'warn', text: '계속근로 1년 미만 또는 주 15시간 미만으로 입력되었습니다. 실제 적용 여부를 별도로 확인하세요.' }
      });
    },

    annualLeave() {
      const hire = parseDate(value('leaveHireDate'));
      const reference = parseDate(value('leaveReferenceDate'));
      const used = Math.max(0, number('leaveUsedDays'));
      const attendance80 = checked('leaveAttendance80');
      const monthlyPerfect = checked('leaveMonthlyPerfect');
      const perfectMonths = Math.max(0, Math.min(11, Math.floor(number('leavePerfectMonths'))));
      const workplaceFive = checked('leaveWorkplaceFive');
      const weeklyHours = number('leaveWeeklyHours');
      if (!hire || !reference || reference < hire) return showError('입사일과 기준일을 올바르게 입력해 주세요.');
      const serviceDays = daysBetween(hire, reference);
      let years = reference.getUTCFullYear() - hire.getUTCFullYear();
      const anniversary = new Date(Date.UTC(reference.getUTCFullYear(), hire.getUTCMonth(), hire.getUTCDate()));
      if (reference < anniversary) years -= 1;
      let months = (reference.getUTCFullYear() - hire.getUTCFullYear()) * 12 + reference.getUTCMonth() - hire.getUTCMonth();
      if (reference.getUTCDate() < hire.getUTCDate()) months -= 1;
      years = Math.max(0, years);
      months = Math.max(0, months);
      const applicable = workplaceFive && weeklyHours >= 15;
      let entitlement = 0;
      if (applicable) {
        if (years < 1) {
          entitlement = monthlyPerfect ? Math.min(11, months) : perfectMonths;
        } else if (attendance80) {
          entitlement = Math.min(25, 15 + Math.floor((years - 1) / 2));
        } else {
          entitlement = perfectMonths;
        }
      }
      const remaining = entitlement - used;
      renderResult({
        label: '예상 잔여 연차',
        value: `${fmt(remaining, 1)}일`,
        rows: [
          ['근속기간', `${fmt(serviceDays, 0)}일 (${fmt(serviceDays / 365, 2)}년)`],
          ['완료 근속연수', `${fmt(years, 0)}년`],
          ['법정 연차 발생일수', `${fmt(entitlement, 1)}일`],
          ['사용한 연차', `${fmt(used, 1)}일`],
          ['남은 연차', `${fmt(remaining, 1)}일`]
        ],
        note: '입사일 기준의 일반적인 법정 발생일수입니다. 회사가 회계연도 기준으로 부여하거나 연차촉진제도를 운영하면 실제 관리일수와 다를 수 있습니다.',
        alert: !applicable
          ? { type: 'warn', text: '상시 5인 미만 또는 주 15시간 미만으로 입력되어 근로기준법 제60조 적용대상이 아닌 것으로 계산했습니다.' }
          : remaining < 0
            ? { type: 'warn', text: '사용일수가 발생일수보다 많습니다. 선사용 또는 회사 부여기준을 확인하세요.' }
            : { type: 'good', text: '입력한 조건을 기준으로 법정 연차를 계산했습니다.' }
      });
    },

    fourInsurance() {
      const gross = number('insuranceMonthlyPay');
      const nonTax = clamp(number('insuranceNonTax'), 0, gross);
      const accidentRate = Math.max(0, number('insuranceAccidentRate')) / 100;
      const stabilityRate = Math.max(0, number('insuranceStabilityRate')) / 100;
      if (!requirePositive(gross, '월 보수를 입력해 주세요.')) return;
      const base = Math.max(0, gross - nonTax);
      const pensionBase = base > 0 ? clamp(base, 410_000, 6_590_000) : 0;
      const pensionEmployee = Math.round(pensionBase * 0.0475);
      const pensionEmployer = pensionEmployee;
      const healthEmployee = Math.round(base * 0.03595);
      const healthEmployer = healthEmployee;
      const careEmployee = Math.round(base * 0.004724);
      const careEmployer = careEmployee;
      const employmentEmployee = Math.round(base * 0.009);
      const employmentEmployer = Math.round(base * (0.009 + stabilityRate));
      const accidentEmployer = Math.round(base * accidentRate);
      const employeeTotal = pensionEmployee + healthEmployee + careEmployee + employmentEmployee;
      const employerTotal = pensionEmployer + healthEmployer + careEmployer + employmentEmployer + accidentEmployer;
      renderResult({
        label: '근로자 월 공제액',
        value: won(employeeTotal),
        rows: [
          ['보험료 산정 보수', won(base)],
          ['국민연금 근로자', won(pensionEmployee)],
          ['국민연금 사업주', won(pensionEmployer)],
          ['건강보험 근로자', won(healthEmployee)],
          ['건강보험 사업주', won(healthEmployer)],
          ['장기요양 근로자', won(careEmployee)],
          ['장기요양 사업주', won(careEmployer)],
          ['고용보험 근로자', won(employmentEmployee)],
          ['고용보험 사업주', won(employmentEmployer)],
          ['산재보험 사업주', won(accidentEmployer)],
          ['사업주 총 보험부담', won(employerTotal)],
          ['급여+사업주 보험 총비용', won(gross + employerTotal)]
        ],
        note: '국민연금은 2026년 7월 이후 기준소득월액 하한 41만원·상한 659만원을 반영했습니다. 산재보험과 고용안정·직업능력개발 요율은 업종·규모에 따라 달라 직접 입력하도록 했습니다.',
        alert: { type: 'warn', text: '실제 보수월액, 두루누리 지원, 보험료 정산 및 사업장별 요율에 따라 고지금액이 달라질 수 있습니다.' }
      });
    },

    loanInterest() {
      const principal = number('loanInterestPrincipal');
      const annualRate = number('loanInterestRate') / 100;
      const mode = selectedRadio('loanInterestMode') || 'months';
      if (!requirePositive(principal, '대출원금을 입력해 주세요.')) return;
      if (annualRate < 0) return showError('금리는 0% 이상으로 입력해 주세요.');
      let periodFactor;
      let periodText;
      let days = 0;
      if (mode === 'months') {
        const months = number('loanInterestMonths');
        if (!requirePositive(months, '대출기간을 개월 수로 입력해 주세요.')) return;
        periodFactor = months / 12;
        periodText = `${fmt(months, 1)}개월`;
      } else {
        const start = parseDate(value('loanInterestStartDate'));
        const end = parseDate(value('loanInterestEndDate'));
        const basis = number('loanInterestDayBasis') || 365;
        if (!start || !end || end <= start) return showError('대출 시작일과 종료일을 올바르게 입력해 주세요.');
        days = daysBetween(start, end);
        periodFactor = days / basis;
        periodText = `${fmt(days, 0)}일 (${fmt(days / basis, 4)}년)`;
      }
      const interest = principal * annualRate * periodFactor;
      const total = principal + interest;
      const monthlyAverage = interest / Math.max(1, periodFactor * 12);
      renderResult({
        label: '예상 대출이자',
        value: won(interest),
        rows: [
          ['대출원금', won(principal)],
          ['연이율', pct(annualRate * 100, 3)],
          ['계산기간', periodText],
          ['월평균 이자', won(monthlyAverage)],
          ['총 이자', won(interest)],
          ['원금+이자', won(total)]
        ],
        note: '단순이자·만기일시상환 기준입니다. 금융기관의 일수 계산, 원 단위 절사, 중도상환 및 변동금리 적용에 따라 달라질 수 있습니다.'
      });
    },

    equalPayment() {
      const principal = number('equalPrincipal');
      const annualRate = number('equalRate') / 100;
      const years = Math.max(0, number('equalYears'));
      const extraMonths = Math.max(0, Math.floor(number('equalMonths')));
      const extraPayment = Math.max(0, number('equalExtraPayment'));
      const n = Math.round(years * 12 + extraMonths);
      if (!requirePositive(principal, '대출원금을 입력해 주세요.')) return;
      if (!(n > 0)) return showError('상환기간을 입력해 주세요.');
      const r = annualRate / 12;
      const scheduledPayment = r === 0 ? principal / n : principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      let balance = principal;
      let totalInterest = 0;
      let totalPaid = 0;
      const schedule = [];
      let month = 0;
      while (balance > 0.01 && month < 1200) {
        month += 1;
        const interest = balance * r;
        let principalPaid = scheduledPayment - interest + extraPayment;
        if (r === 0) principalPaid = scheduledPayment + extraPayment;
        principalPaid = Math.min(balance, Math.max(0, principalPaid));
        const payment = principalPaid + interest;
        balance = Math.max(0, balance - principalPaid);
        totalInterest += interest;
        totalPaid += payment;
        schedule.push({ month, payment, principal: principalPaid, interest, balance });
        if (principalPaid <= 0) break;
      }
      window.__wooriLoanSchedule = schedule;
      const previewRows = schedule.length <= 14
        ? schedule
        : [...schedule.slice(0, 12), null, schedule[schedule.length - 1]];
      const tableRows = previewRows.map((row) => row === null
        ? '<tr><td colspan="5" style="text-align:center;color:#98a1b2">… 중간 회차 생략 …</td></tr>'
        : `<tr><td>${fmt(row.month)}회</td><td>${won(row.payment)}</td><td>${won(row.principal)}</td><td>${won(row.interest)}</td><td>${won(row.balance)}</td></tr>`).join('');
      const extraHtml = `
        <div class="table-wrap">
          <table><thead><tr><th>회차</th><th>납입액</th><th>원금</th><th>이자</th><th>잔액</th></tr></thead><tbody>${tableRows}</tbody></table>
        </div>
        <div style="margin-top:10px;text-align:right"><button type="button" class="btn btn-secondary btn-small" id="downloadSchedule">상환표 CSV 다운로드</button></div>`;
      renderResult({
        label: '기본 월 상환액',
        value: won(scheduledPayment),
        rows: [
          ['대출원금', won(principal)],
          ['연이율', pct(annualRate * 100, 3)],
          ['기본 상환기간', `${fmt(n)}개월`],
          ['추가 월 상환액', won(extraPayment)],
          ['실제 예상 상환기간', `${fmt(schedule.length)}개월`],
          ['총 이자', won(totalInterest)],
          ['총 납입액', won(totalPaid)]
        ],
        note: '매월 동일한 기본 원리금에 추가상환액을 더하는 방식입니다. 실제 대출의 납입일, 금리변동, 중도상환수수료는 반영하지 않습니다.',
        extraHtml
      });
      setTimeout(() => $('#downloadSchedule')?.addEventListener('click', downloadScheduleCsv), 0);
    },

    depositInterest() {
      const principal = number('depositPrincipal');
      const annualRate = number('depositRate') / 100;
      const months = number('depositMonths');
      const method = value('depositMethod') || 'simple';
      const taxRate = number('depositTaxRate') / 100;
      if (!requirePositive(principal, '예치금액을 입력해 주세요.')) return;
      if (!(months > 0)) return showError('예치기간을 입력해 주세요.');
      let grossMaturity;
      if (method === 'monthly') grossMaturity = principal * Math.pow(1 + annualRate / 12, months);
      else if (method === 'annual') grossMaturity = principal * Math.pow(1 + annualRate, months / 12);
      else grossMaturity = principal * (1 + annualRate * months / 12);
      const grossInterest = grossMaturity - principal;
      const tax = Math.max(0, grossInterest * taxRate);
      const netInterest = grossInterest - tax;
      const netMaturity = principal + netInterest;
      renderResult({
        label: '세후 만기금액',
        value: won(netMaturity),
        rows: [
          ['예치원금', won(principal)],
          ['예치기간', `${fmt(months, 1)}개월`],
          ['세전 이자', won(grossInterest)],
          ['이자소득세', won(tax)],
          ['세후 이자', won(netInterest)],
          ['세전 만기금액', won(grossMaturity)],
          ['세후 만기금액', won(netMaturity)]
        ],
        note: '금융기관의 이자 계산일수와 지급주기, 우대금리 적용방식에 따라 실제 만기금액과 차이가 날 수 있습니다.'
      });
    },

    compound() {
      const initial = Math.max(0, number('compoundInitial'));
      const monthly = Math.max(0, number('compoundMonthly'));
      const annualRate = number('compoundRate') / 100;
      const years = number('compoundYears');
      const frequency = Number(value('compoundFrequency') || 12);
      const timing = value('compoundTiming') || 'end';
      const inflation = Math.max(0, number('compoundInflation')) / 100;
      if (initial <= 0 && monthly <= 0) return showError('초기 투자금 또는 월 적립금을 입력해 주세요.');
      if (!(years > 0)) return showError('투자기간을 입력해 주세요.');
      const months = Math.round(years * 12);
      const periodicRate = annualRate / frequency;
      const monthlyEffective = Math.pow(1 + periodicRate, frequency / 12) - 1;
      let balance = initial;
      const yearly = [];
      for (let m = 1; m <= months; m += 1) {
        if (timing === 'start') balance += monthly;
        balance *= (1 + monthlyEffective);
        if (timing === 'end') balance += monthly;
        if (m % 12 === 0 || m === months) yearly.push({ year: m / 12, balance });
      }
      const contributed = initial + monthly * months;
      const profit = balance - contributed;
      const realValue = balance / Math.pow(1 + inflation, years);
      const maxValue = Math.max(...yearly.map((item) => item.balance), 1);
      const chart = `<div class="chart">${yearly.slice(-12).map((item) => `
        <div class="chart-row"><span>${fmt(item.year, item.year % 1 ? 1 : 0)}년</span><div class="chart-track"><div class="chart-bar" style="width:${Math.max(2, item.balance / maxValue * 100)}%"></div></div><span class="chart-value">${won(item.balance)}</span></div>
      `).join('')}</div>`;
      renderResult({
        label: '최종 예상자산',
        value: won(balance),
        rows: [
          ['초기 투자금', won(initial)],
          ['월 적립금', won(monthly)],
          ['총 납입원금', won(contributed)],
          ['누적 투자수익', won(profit)],
          ['원금 대비 수익률', pct(contributed ? profit / contributed * 100 : 0, 2)],
          ['물가 반영 실질가치', won(realValue)]
        ],
        note: '수익률이 매 기간 일정하고 세금·수수료가 없다는 가정의 시뮬레이션입니다. 실제 투자수익은 변동될 수 있습니다.',
        extraHtml: chart
      });
    },

    rentConversion() {
      const mode = selectedRadio('rentMode') || 'depositToRent';
      const currentDeposit = number('rentCurrentDeposit');
      const currentRent = number('rentCurrentMonthly');
      const rate = number('rentConversionRate') / 100;
      if (!(rate > 0)) return showError('전월세 전환율을 0%보다 크게 입력해 주세요.');
      if (mode === 'depositToRent') {
        const targetDeposit = number('rentTargetDeposit');
        const decrease = currentDeposit - targetDeposit;
        if (!(decrease >= 0)) return showError('변경 보증금은 현재 보증금보다 작거나 같아야 합니다.');
        const addedRent = decrease * rate / 12;
        const newRent = currentRent + addedRent;
        renderResult({
          label: '변경 후 예상 월세',
          value: won(newRent),
          rows: [
            ['현재 보증금', won(currentDeposit)],
            ['변경 보증금', won(targetDeposit)],
            ['줄어든 보증금', won(decrease)],
            ['월세 증가분', won(addedRent)],
            ['현재 월세', won(currentRent)],
            ['변경 후 월세', won(newRent)]
          ],
          note: '연 전환율을 12개월로 나누어 월세 증가분을 계산했습니다.'
        });
      } else {
        const targetRent = number('rentTargetMonthly');
        const reduction = currentRent - targetRent;
        if (!(reduction >= 0)) return showError('변경 월세는 현재 월세보다 작거나 같아야 합니다.');
        const additionalDeposit = reduction * 12 / rate;
        const newDeposit = currentDeposit + additionalDeposit;
        renderResult({
          label: '변경 후 예상 보증금',
          value: won(newDeposit),
          rows: [
            ['현재 월세', won(currentRent)],
            ['변경 월세', won(targetRent)],
            ['월세 감소분', won(reduction)],
            ['필요한 추가 보증금', won(additionalDeposit)],
            ['현재 보증금', won(currentDeposit)],
            ['변경 후 보증금', won(newDeposit)]
          ],
          note: '월세 감소액을 연간으로 환산한 뒤 전환율로 나누어 추가 보증금을 계산했습니다.'
        });
      }
    },

    brokerage() {
      const deal = selectedRadio('brokerageDeal') || 'sale';
      const property = value('brokerageProperty') || 'housing';
      const includeVat = checked('brokerageIncludeVat');
      let transactionValue;
      let conversionNote = '';
      if (deal === 'sale') {
        transactionValue = number('brokerageSalePrice');
      } else {
        const deposit = number('brokerageDeposit');
        const monthly = number('brokerageMonthlyRent');
        if (monthly > 0) {
          const value100 = deposit + monthly * 100;
          transactionValue = value100 < 50_000_000 ? deposit + monthly * 70 : value100;
          conversionNote = value100 < 50_000_000 ? '보증금 + 월세×70 적용' : '보증금 + 월세×100 적용';
        } else {
          transactionValue = deposit;
          conversionNote = '전세 보증금 적용';
        }
      }
      if (!requirePositive(transactionValue, '거래금액을 입력해 주세요.')) return;
      let maxRate;
      let capAmount = Infinity;
      if (property === 'housing') {
        if (deal === 'sale') {
          if (transactionValue < 50_000_000) { maxRate = 0.006; capAmount = 250_000; }
          else if (transactionValue < 200_000_000) { maxRate = 0.005; capAmount = 800_000; }
          else if (transactionValue < 900_000_000) maxRate = 0.004;
          else if (transactionValue < 1_200_000_000) maxRate = 0.005;
          else if (transactionValue < 1_500_000_000) maxRate = 0.006;
          else maxRate = 0.007;
        } else {
          if (transactionValue < 50_000_000) { maxRate = 0.005; capAmount = 200_000; }
          else if (transactionValue < 100_000_000) { maxRate = 0.004; capAmount = 300_000; }
          else if (transactionValue < 600_000_000) maxRate = 0.003;
          else if (transactionValue < 1_200_000_000) maxRate = 0.004;
          else if (transactionValue < 1_500_000_000) maxRate = 0.005;
          else maxRate = 0.006;
        }
      } else if (property === 'officetel') {
        maxRate = deal === 'sale' ? 0.005 : 0.004;
      } else {
        maxRate = 0.009;
      }
      const negotiated = number('brokerageNegotiatedRate') / 100;
      const appliedRate = negotiated > 0 ? Math.min(negotiated, maxRate) : maxRate;
      const feeBeforeVat = Math.min(transactionValue * appliedRate, capAmount);
      const vat = includeVat ? feeBeforeVat * 0.1 : 0;
      const total = feeBeforeVat + vat;
      renderResult({
        label: '예상 중개보수',
        value: won(total),
        rows: [
          ['중개보수 산정 거래금액', won(transactionValue)],
          ['월세 환산방식', conversionNote || '해당 없음'],
          ['법정 상한요율', pct(maxRate * 100, 3)],
          ['적용요율', pct(appliedRate * 100, 3)],
          ['중개보수(부가세 전)', won(feeBeforeVat)],
          ['부가세', won(vat)],
          ['총 지급 예상액', won(total)]
        ],
        note: '주택은 서울특별시 상한요율을 기본 적용했습니다. 중개보수는 상한 범위에서 당사자 간 협의하며, 지역 조례·오피스텔 요건·거래 형태에 따라 달라질 수 있습니다.',
        alert: negotiated > maxRate
          ? { type: 'warn', text: '입력한 협의요율이 상한요율보다 높아 상한요율로 제한했습니다.' }
          : null
      });
    },

    pyeong() {
      const mode = selectedRadio('pyeongMode') || 'sqmToPyeong';
      const area = number('pyeongArea');
      if (!requirePositive(area, '변환할 면적을 입력해 주세요.')) return;
      const sqm = mode === 'sqmToPyeong' ? area : area * 3.305785;
      const pyeong = mode === 'sqmToPyeong' ? area / 3.305785 : area;
      const sqft = sqm * 10.7639104;
      renderResult({
        label: mode === 'sqmToPyeong' ? '평수' : '제곱미터',
        value: mode === 'sqmToPyeong' ? `${fmt(pyeong, 2)}평` : `${fmt(sqm, 2)}㎡`,
        rows: [
          ['제곱미터', `${fmt(sqm, 4)}㎡`],
          ['평', `${fmt(pyeong, 4)}평`],
          ['제곱피트', `${fmt(sqft, 2)}ft²`]
        ],
        note: '1평 = 3.305785㎡로 환산했습니다. 아파트 분양면적과 전용면적은 서로 다른 개념입니다.'
      });
    },

    discount() {
      const mode = selectedRadio('discountMode') || 'forward';
      const original = number('discountOriginal');
      if (!requirePositive(original, '정상가격을 입력해 주세요.')) return;
      if (mode === 'reverse') {
        const sale = number('discountSalePrice');
        if (sale < 0) return showError('판매가격을 올바르게 입력해 주세요.');
        const saved = original - sale;
        const rate = saved / original * 100;
        renderResult({
          label: '실질 할인율',
          value: pct(rate, 2),
          rows: [
            ['정상가격', won(original)],
            ['판매가격', won(sale)],
            ['절감금액', won(saved)],
            ['실질 할인율', pct(rate, 2)]
          ]
        });
        return;
      }
      const d1 = clamp(number('discountRate1'), 0, 100) / 100;
      const d2 = clamp(number('discountRate2'), 0, 100) / 100;
      const coupon = Math.max(0, number('discountCoupon'));
      const points = Math.max(0, number('discountPoints'));
      const shipping = Math.max(0, number('discountShipping'));
      const after1 = original * (1 - d1);
      const after2 = after1 * (1 - d2);
      const productPay = Math.max(0, after2 - coupon - points);
      const finalPay = productPay + shipping;
      const saved = original - productPay;
      const effective = saved / original * 100;
      renderResult({
        label: '최종 결제금액',
        value: won(finalPay),
        rows: [
          ['정상가격', won(original)],
          ['1차 할인 후', won(after1)],
          ['2차 할인 후', won(after2)],
          ['쿠폰·포인트 차감', won(coupon + points)],
          ['상품 결제금액', won(productPay)],
          ['배송비', won(shipping)],
          ['총 절감금액', won(saved)],
          ['실질 할인율', pct(effective, 2)]
        ],
        note: '중복 할인은 1차 할인 후 금액에 2차 할인을 순서대로 적용했습니다. 실질 할인율은 배송비를 제외한 상품가격 기준입니다.'
      });
    },

    percentageChange() {
      const mode = selectedRadio('percentageMode') || 'change';
      if (mode === 'change') {
        const before = number('percentageBefore');
        const after = number('percentageAfter');
        if (before === 0) return showError('기준값은 0이 될 수 없습니다.');
        const change = after - before;
        const rate = change / Math.abs(before) * 100;
        renderResult({
          label: rate >= 0 ? '증가율' : '감소율',
          value: pct(Math.abs(rate), 2),
          rows: [
            ['이전 값', fmt(before, 4)],
            ['이후 값', fmt(after, 4)],
            ['변화량', fmt(change, 4)],
            ['증감률', pct(rate, 2)]
          ],
          alert: { type: rate >= 0 ? 'good' : 'warn', text: rate >= 0 ? `${pct(rate, 2)} 증가했습니다.` : `${pct(Math.abs(rate), 2)} 감소했습니다.` }
        });
      } else if (mode === 'ratio') {
        const part = number('percentagePart');
        const whole = number('percentageWhole');
        if (whole === 0) return showError('전체값은 0이 될 수 없습니다.');
        const rate = part / whole * 100;
        renderResult({
          label: '전체에서 차지하는 비율',
          value: pct(rate, 2),
          rows: [['부분값', fmt(part, 4)], ['전체값', fmt(whole, 4)], ['비율', pct(rate, 4)]]
        });
      } else {
        const base = number('percentageBase');
        const rate = number('percentageRate');
        const direction = value('percentageDirection') || 'increase';
        const change = base * rate / 100;
        const result = direction === 'decrease' ? base - change : base + change;
        renderResult({
          label: '퍼센트 적용 결과',
          value: fmt(result, 4),
          rows: [['기준값', fmt(base, 4)], ['적용 비율', pct(rate, 2)], ['변화량', fmt(change, 4)], ['결과값', fmt(result, 4)]]
        });
      }
    },

    stockAverage() {
      const mode = selectedRadio('stockMode') || 'add';
      const currentQty = number('stockCurrentQty');
      const currentAvg = number('stockCurrentAvg');
      const fee = Math.max(0, number('stockFeeRate')) / 100;
      if (!requirePositive(currentQty, '기존 보유수량을 입력해 주세요.')) return;
      if (!requirePositive(currentAvg, '기존 평균단가를 입력해 주세요.')) return;
      if (mode === 'add') {
        const addQty = number('stockAddQty');
        const addPrice = number('stockAddPrice');
        if (!requirePositive(addQty, '추가 매수수량을 입력해 주세요.')) return;
        if (!requirePositive(addPrice, '추가 매수가격을 입력해 주세요.')) return;
        const currentCost = currentQty * currentAvg;
        const addCost = addQty * addPrice * (1 + fee);
        const totalQty = currentQty + addQty;
        const totalCost = currentCost + addCost;
        const newAvg = totalCost / totalQty;
        renderResult({
          label: '추가매수 후 평균단가',
          value: fmt(newAvg, 4),
          rows: [
            ['기존 투자원금', fmt(currentCost, 2)],
            ['추가 매수금액(수수료 포함)', fmt(addCost, 2)],
            ['총 보유수량', fmt(totalQty, 4)],
            ['총 투자원금', fmt(totalCost, 2)],
            ['새 평균단가', fmt(newAvg, 4)],
            ['평단 변화', pct((newAvg / currentAvg - 1) * 100, 2)]
          ],
          note: '통화 단위는 입력한 가격 단위를 그대로 사용합니다. 매도세금과 환전비용은 반영하지 않습니다.'
        });
      } else {
        const buyPrice = number('stockTargetBuyPrice');
        const targetAvg = number('stockTargetAvg');
        if (!requirePositive(buyPrice, '추가 매수가격을 입력해 주세요.')) return;
        if (!requirePositive(targetAvg, '목표 평균단가를 입력해 주세요.')) return;
        const effectiveBuy = buyPrice * (1 + fee);
        const denominator = targetAvg - effectiveBuy;
        const numerator = currentQty * (currentAvg - targetAvg);
        const requiredQty = numerator / denominator;
        if (!(requiredQty > 0) || !Number.isFinite(requiredQty)) {
          return showError('목표 평단가는 현재 평단가와 추가 매수가격 사이에 있어야 합니다. 수수료도 함께 확인해 주세요.');
        }
        const requiredCash = requiredQty * effectiveBuy;
        renderResult({
          label: '필요한 추가 매수수량',
          value: fmt(requiredQty, 4),
          rows: [
            ['현재 보유수량', fmt(currentQty, 4)],
            ['현재 평균단가', fmt(currentAvg, 4)],
            ['추가 매수가격', fmt(buyPrice, 4)],
            ['목표 평균단가', fmt(targetAvg, 4)],
            ['필요 추가수량', fmt(requiredQty, 4)],
            ['필요 추가금액', fmt(requiredCash, 2)],
            ['추가 후 총수량', fmt(currentQty + requiredQty, 4)]
          ],
          note: '소수점 주식 매매가 불가능한 시장에서는 실제 주문수량을 올림하거나 내림해 다시 확인하세요.'
        });
      }
    },

    cagr() {
      const mode = selectedRadio('cagrMode') || 'calculate';
      const start = number('cagrStart');
      const end = number('cagrEnd');
      const years = number('cagrYears');
      if (!requirePositive(start, '시작값을 입력해 주세요.')) return;
      if (!requirePositive(end, mode === 'calculate' ? '최종값을 입력해 주세요.' : '목표값을 입력해 주세요.')) return;
      if (!requirePositive(years, '기간을 연 단위로 입력해 주세요.')) return;
      const cagr = Math.pow(end / start, 1 / years) - 1;
      const totalReturn = (end / start - 1) * 100;
      const multiple = end / start;
      const doubling = cagr > 0 ? Math.log(2) / Math.log(1 + cagr) : Infinity;
      renderResult({
        label: mode === 'calculate' ? '연평균성장률(CAGR)' : '목표 달성에 필요한 CAGR',
        value: pct(cagr * 100, 3),
        rows: [
          ['시작값', fmt(start, 4)],
          [mode === 'calculate' ? '최종값' : '목표값', fmt(end, 4)],
          ['기간', `${fmt(years, 2)}년`],
          ['총 변화율', pct(totalReturn, 2)],
          ['성장 배수', `${fmt(multiple, 3)}배`],
          ['CAGR', pct(cagr * 100, 3)],
          ['예상 2배 도달기간', Number.isFinite(doubling) ? `${fmt(doubling, 2)}년` : '해당 없음']
        ],
        note: 'CAGR은 기간 중 변동경로를 무시하고 시작값과 최종값을 일정한 연복리 성장률로 환산한 지표입니다.'
      });
    },

    dateDday() {
      const mode = selectedRadio('dateMode') || 'difference';
      if (mode === 'difference') {
        const start = parseDate(value('dateStart'));
        const end = parseDate(value('dateEnd'));
        const includeStart = checked('dateIncludeStart');
        const businessOnly = checked('dateBusinessOnly');
        if (!start || !end) return showError('시작일과 종료일을 입력해 주세요.');
        const signed = daysBetween(start, end);
        const direction = signed >= 0 ? 1 : -1;
        let total = Math.abs(signed) + (includeStart ? 1 : 0);
        let weekdays = 0;
        let weekends = 0;
        const from = signed >= 0 ? start : end;
        const to = signed >= 0 ? end : start;
        let current = new Date(from.getTime());
        if (!includeStart) current = addDays(current, 1);
        while (current <= to) {
          const day = current.getUTCDay();
          if (day === 0 || day === 6) weekends += 1;
          else weekdays += 1;
          current = addDays(current, 1);
        }
        const mainCount = businessOnly ? weekdays : total;
        const today = parseDate(new Date().toISOString().slice(0, 10));
        const dday = daysBetween(today, end);
        const ddayText = dday === 0 ? 'D-DAY' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`;
        renderResult({
          label: businessOnly ? '평일 수' : '두 날짜 사이 일수',
          value: `${fmt(mainCount)}일`,
          rows: [
            ['시작일', formatDateKo(start)],
            ['종료일', formatDateKo(end)],
            ['달력 일수', `${fmt(total)}일`],
            ['평일 수', `${fmt(weekdays)}일`],
            ['주말 수', `${fmt(weekends)}일`],
            ['종료일 D-day', ddayText],
            ['날짜 방향', direction >= 0 ? '미래 방향' : '과거 방향']
          ],
          note: '평일 계산은 토요일과 일요일만 제외하며 법정공휴일은 제외하지 않습니다.'
        });
      } else {
        const base = parseDate(value('dateBase'));
        const amount = Math.round(number('dateAddDays'));
        const direction = value('dateDirection') || 'add';
        const businessOnly = checked('dateAddBusinessOnly');
        if (!base) return showError('기준일을 입력해 주세요.');
        const sign = direction === 'subtract' ? -1 : 1;
        let result = new Date(base.getTime());
        if (!businessOnly) {
          result = addDays(result, amount * sign);
        } else {
          let remaining = Math.abs(amount);
          while (remaining > 0) {
            result = addDays(result, sign);
            const day = result.getUTCDay();
            if (day !== 0 && day !== 6) remaining -= 1;
          }
        }
        renderResult({
          label: '계산된 날짜',
          value: formatDateKo(result),
          rows: [
            ['기준일', formatDateKo(base)],
            ['계산 방향', direction === 'subtract' ? '이전 날짜' : '이후 날짜'],
            ['적용 일수', `${fmt(amount)}일`],
            ['주말 제외', businessOnly ? '예' : '아니오'],
            ['결과 날짜', formatDateKo(result)]
          ],
          note: '주말 제외 시 토요일과 일요일만 건너뛰며 법정공휴일은 별도로 반영하지 않습니다.'
        });
      }
    }
  };

  const examples = {
    withholding33: () => { setRadio('withholdingMode', 'gross'); setField('withholdingAmount', 1_000_000); setField('withholdingRounding', 'round'); },
    vat: () => { setRadio('vatMode', 'total'); setField('vatAmount', 2_200_000); setField('vatRate', 10); },
    netSalary: () => { setRadio('salaryMode', 'annual'); setField('salaryAmount', 48_000_000); setField('salaryNonTax', 200_000); setField('salaryDependents', 1); setField('salaryChildren', 0); setRadio('salaryTaxMode', 'auto'); },
    hourlyMonthly: () => { setRadio('hourlyMode', 'hourlyToMonthly'); setField('hourlyAmount', 10_320); setField('hourlyWeeklyHours', 40); setField('hourlyWeeklyDays', 5); setField('hourlyIncludeHoliday', true); },
    weeklyHoliday: () => { setField('weeklyHourlyWage', 10_320); setField('weeklyDailyHours', 5); setField('weeklyWorkDays', 4); setField('weeklyFullAttendance', true); },
    severance: () => { setField('severanceHireDate', '2023-01-01'); setField('severanceRetireDate', '2026-01-01'); setField('severanceWages3m', 9_000_000); setField('severanceAnnualBonus', 3_000_000); setField('severanceAnnualLeavePay', 600_000); setField('severanceWeeklyHours', 40); },
    annualLeave: () => { setField('leaveHireDate', '2022-08-01'); setField('leaveReferenceDate', '2026-08-16'); setField('leaveUsedDays', 7); setField('leaveAttendance80', true); setField('leaveMonthlyPerfect', true); setField('leaveWorkplaceFive', true); setField('leaveWeeklyHours', 40); },
    fourInsurance: () => { setField('insuranceMonthlyPay', 3_500_000); setField('insuranceNonTax', 200_000); setField('insuranceAccidentRate', 0.7); setField('insuranceStabilityRate', 0.25); },
    loanInterest: () => { setRadio('loanInterestMode', 'months'); setField('loanInterestPrincipal', 100_000_000); setField('loanInterestRate', 4.2); setField('loanInterestMonths', 12); },
    equalPayment: () => { setField('equalPrincipal', 300_000_000); setField('equalRate', 4.0); setField('equalYears', 30); setField('equalMonths', 0); setField('equalExtraPayment', 0); },
    depositInterest: () => { setField('depositPrincipal', 30_000_000); setField('depositRate', 3.2); setField('depositMonths', 12); setField('depositMethod', 'simple'); setField('depositTaxRate', 15.4); },
    compound: () => { setField('compoundInitial', 10_000_000); setField('compoundMonthly', 500_000); setField('compoundRate', 10); setField('compoundYears', 10); setField('compoundFrequency', '12'); setField('compoundTiming', 'end'); setField('compoundInflation', 2); },
    rentConversion: () => { setRadio('rentMode', 'depositToRent'); setField('rentCurrentDeposit', 100_000_000); setField('rentTargetDeposit', 50_000_000); setField('rentCurrentMonthly', 500_000); setField('rentConversionRate', 4.75); },
    brokerage: () => { setRadio('brokerageDeal', 'lease'); setField('brokerageProperty', 'housing'); setField('brokerageDeposit', 100_000_000); setField('brokerageMonthlyRent', 1_000_000); setField('brokerageIncludeVat', true); },
    pyeong: () => { setRadio('pyeongMode', 'sqmToPyeong'); setField('pyeongArea', 84); },
    discount: () => { setRadio('discountMode', 'forward'); setField('discountOriginal', 200_000); setField('discountRate1', 20); setField('discountRate2', 10); setField('discountCoupon', 10_000); setField('discountPoints', 5_000); setField('discountShipping', 3_000); },
    percentageChange: () => { setRadio('percentageMode', 'change'); setField('percentageBefore', 80); setField('percentageAfter', 100); },
    stockAverage: () => { setRadio('stockMode', 'add'); setField('stockCurrentQty', 100); setField('stockCurrentAvg', 50_000); setField('stockAddQty', 50); setField('stockAddPrice', 40_000); setField('stockFeeRate', 0.015); },
    cagr: () => { setRadio('cagrMode', 'calculate'); setField('cagrStart', 100); setField('cagrEnd', 259.37); setField('cagrYears', 10); },
    dateDday: () => { setRadio('dateMode', 'difference'); setField('dateStart', '2026-08-16'); setField('dateEnd', '2026-12-31'); setField('dateIncludeStart', false); setField('dateBusinessOnly', false); }
  };

  function downloadScheduleCsv() {
    const schedule = window.__wooriLoanSchedule || [];
    if (!schedule.length) return;
    const rows = [['회차','납입액','원금','이자','잔액'], ...schedule.map((item) => [item.month, Math.round(item.payment), Math.round(item.principal), Math.round(item.interest), Math.round(item.balance)])];
    const csv = '\uFEFF' + rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '원리금균등상환표.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const AUTO_CALC_DELAY = 140;
  let autoCalcTimer = null;
  let calculating = false;

  function setLiveStatus(text, state = 'ready') {
    const status = $('#liveCalculationStatus');
    if (!status) return;
    status.textContent = text;
    status.closest('.live-calc-badge')?.setAttribute('data-state', state);
  }

  function calculateNow(source = 'manual') {
    const calculate = calculators[calculatorId];
    if (!calculate || calculating) return;
    clearTimeout(autoCalcTimer);
    autoCalcTimer = null;
    calculating = true;
    form.dataset.calculationSource = source;
    form.setAttribute('aria-busy', 'true');
    setLiveStatus(source === 'manual' ? '계산 결과 갱신 중' : '입력값 자동 반영 중', 'calculating');
    try {
      calculate();
    } finally {
      calculating = false;
      form.removeAttribute('aria-busy');
      setLiveStatus('입력 즉시 자동 계산', 'ready');
    }
  }

  function scheduleAutoCalculation(delay = AUTO_CALC_DELAY) {
    clearTimeout(autoCalcTimer);
    setLiveStatus('입력값 자동 반영 중', 'calculating');
    autoCalcTimer = window.setTimeout(() => calculateNow('auto'), delay);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculateNow('manual');
  });

  form.addEventListener('input', (event) => {
    if (event.isComposing) return;
    if (!event.target.matches('input, select, textarea')) return;
    scheduleAutoCalculation();
  });

  form.addEventListener('change', (event) => {
    if (!event.target.matches('input, select, textarea')) return;
    scheduleAutoCalculation(0);
  });

  form.addEventListener('click', (event) => {
    const quickButton = event.target.closest('[data-quick-target][data-quick-value]');
    if (!quickButton) return;
    setField(quickButton.dataset.quickTarget, quickButton.dataset.quickValue);
    calculateNow('quick');
  });

  $('#exampleButton')?.addEventListener('click', () => {
    const fill = examples[calculatorId];
    if (fill) fill();
    calculateNow('example');
  });

  form.addEventListener('woori:reset', () => {
    if (calculatorId === 'dateDday') {
      const today = new Date();
      const later = new Date(today.getTime());
      later.setDate(later.getDate() + 30);
      setField('dateStart', today.toISOString().slice(0,10));
      setField('dateEnd', later.toISOString().slice(0,10));
    }
    scheduleAutoCalculation(0);
  });

  const runInitialCalculation = () => window.requestAnimationFrame(() => calculateNow('initial'));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInitialCalculation, { once: true });
  } else {
    runInitialCalculation();
  }
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) scheduleAutoCalculation(0);
  });
})();
