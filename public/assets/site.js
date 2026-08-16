(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  window.WooriCalc = window.WooriCalc || {};
  Object.assign(window.WooriCalc, {
    $,
    $$,
    parseNumber(value) {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    },
    formatNumber(value, digits = 0) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '-';
      return n.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    },
    formatWon(value, digits = 0) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '-';
      return `${n.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}원`;
    },
    formatPercent(value, digits = 2) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '-';
      return `${n.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
    },
    roundByMode(value, mode = 'round') {
      if (mode === 'floor') return Math.floor(value);
      if (mode === 'ceil') return Math.ceil(value);
      return Math.round(value);
    },
    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    },
    parseDate(value) {
      if (!value) return null;
      const [y, m, d] = String(value).split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(Date.UTC(y, m - 1, d));
    },
    dateToInput(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 10);
    },
    daysBetween(start, end) {
      if (!start || !end) return 0;
      return Math.round((end.getTime() - start.getTime()) / 86400000);
    },
    addDays(date, days) {
      const copy = new Date(date.getTime());
      copy.setUTCDate(copy.getUTCDate() + days);
      return copy;
    },
    addMonths(date, months) {
      const copy = new Date(date.getTime());
      const day = copy.getUTCDate();
      copy.setUTCDate(1);
      copy.setUTCMonth(copy.getUTCMonth() + months);
      const last = new Date(Date.UTC(copy.getUTCFullYear(), copy.getUTCMonth() + 1, 0)).getUTCDate();
      copy.setUTCDate(Math.min(day, last));
      return copy;
    },
    formatDateKo(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '-';
      return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
    },
    renderResult({ label, value, rows = [], note = '', alert = null, extraHtml = '' }) {
      const box = $('#resultBox');
      if (!box) return;
      $('#resultSummaryLabel').textContent = label || '계산 결과';
      $('#resultSummaryValue').textContent = value || '-';
      const list = $('#resultList');
      list.innerHTML = rows.map(([name, result]) => `
        <div class="result-row"><span>${escapeHtml(name)}</span><strong>${escapeHtml(String(result))}</strong></div>
      `).join('');
      const noteEl = $('#resultNote');
      noteEl.textContent = note || '';
      noteEl.hidden = !note;
      const alertEl = $('#resultAlert');
      if (alert && alert.text) {
        alertEl.textContent = alert.text;
        alertEl.className = `result-alert ${alert.type || 'warn'}`;
        alertEl.hidden = false;
      } else {
        alertEl.hidden = true;
        alertEl.textContent = '';
      }
      const extraEl = $('#resultExtra');
      if (extraEl) {
        extraEl.innerHTML = extraHtml || '';
        extraEl.hidden = !extraHtml;
      }
      box.hidden = false;
      box.dataset.copyText = [
        `${label || '계산 결과'}: ${value || '-'}`,
        ...rows.map(([name, result]) => `${name}: ${result}`),
        note ? `참고: ${note}` : ''
      ].filter(Boolean).join('\n');
    },
    showError(message) {
      window.WooriCalc.renderResult({
        label: '입력값을 확인해 주세요',
        value: '-',
        rows: [],
        alert: { type: 'danger', text: message }
      });
    },
    showToast(message) {
      let toast = $('.toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(window.__wooriToastTimer);
      window.__wooriToastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
    }
  });

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
  window.WooriCalc.escapeHtml = escapeHtml;

  function initMenu() {
    const button = $('.menu-button');
    const nav = $('.main-nav');
    if (!button || !nav) return;
    button.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !button.contains(event.target)) {
        nav.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function initMoneyInputs() {
    $$('.money-input').forEach((input) => {
      const format = () => {
        const n = window.WooriCalc.parseNumber(input.value);
        input.value = input.value.trim() === '' ? '' : Math.round(n).toLocaleString('ko-KR');
      };
      input.addEventListener('blur', format);
      input.addEventListener('focus', () => {
        const n = window.WooriCalc.parseNumber(input.value);
        input.value = input.value.trim() === '' ? '' : String(n);
        requestAnimationFrame(() => input.select());
      });
      format();
    });
  }

  function initSegments() {
    $$('[data-segment-group]').forEach((group) => {
      const name = group.dataset.segmentGroup;
      const update = () => {
        const selected = $(`input[name="${CSS.escape(name)}"]:checked`, group);
        if (!selected) return;
        $$(`[data-mode-for="${CSS.escape(name)}"]`).forEach((panel) => {
          panel.hidden = panel.dataset.modeValue !== selected.value;
        });
      };
      group.addEventListener('change', update);
      update();
    });
  }

  function initHomeFilter() {
    const input = $('#calculatorSearch');
    const cards = $$('.calculator-card[data-search]');
    const tabs = $$('.category-tab[data-category]');
    const empty = $('#noResults');
    if (!cards.length) return;
    let category = 'all';
    const apply = () => {
      const query = (input?.value || '').trim().toLowerCase();
      let visible = 0;
      cards.forEach((card) => {
        const categoryOk = category === 'all' || card.dataset.category === category;
        const queryOk = !query || card.dataset.search.toLowerCase().includes(query);
        card.hidden = !(categoryOk && queryOk);
        if (!card.hidden) visible += 1;
      });
      if (empty) empty.style.display = visible ? 'none' : 'block';
    };
    input?.addEventListener('input', apply);
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      category = tab.dataset.category;
      tabs.forEach((item) => item.classList.toggle('active', item === tab));
      apply();
    }));
  }

  function initCopyButton() {
    const button = $('#copyResult');
    const box = $('#resultBox');
    if (!button || !box) return;
    button.addEventListener('click', async () => {
      const text = box.dataset.copyText || '';
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      window.WooriCalc.showToast('계산 결과를 복사했습니다.');
    });
  }

  function initReset() {
    const button = $('#resetButton');
    const form = $('#calculatorForm');
    if (!button || !form) return;
    button.addEventListener('click', () => {
      form.reset();
      initMoneyInputs();
      $$('[data-segment-group]').forEach((group) => group.dispatchEvent(new Event('change', { bubbles: true })));
      const box = $('#resultBox');
      if (box) box.hidden = true;
      form.dispatchEvent(new CustomEvent('woori:reset'));
    });
  }

  function initPrint() {
    $('#printButton')?.addEventListener('click', () => window.print());
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMenu();
    initMoneyInputs();
    initSegments();
    initHomeFilter();
    initCopyButton();
    initReset();
    initPrint();
  });
})();
