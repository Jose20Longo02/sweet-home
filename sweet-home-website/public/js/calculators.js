(function () {
  const calc = window.SweetHomeCalc;
  if (!calc) return;

  const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const oneDecimal = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function money(n) {
    return euro.format(Math.round(n));
  }

  function range(low, high) {
    return money(low) + '–' + money(high);
  }

  function percent(n) {
    return oneDecimal.format(n) + ' %';
  }

  function percentRange(low, high) {
    return oneDecimal.format(low) + '–' + oneDecimal.format(high) + ' %';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function showError(form, message) {
    const el = form.querySelector('[data-calc-error]');
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  }

  function bindRecalc(form, calculate) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      calculate();
    });
    form.addEventListener('input', calculate);
    form.addEventListener('change', calculate);
  }

  function wireMortgage(root) {
    const form = root.querySelector('form');
    function calculate() {
      const price = calc.parseMoney(form.propertyPrice.value);
      const down = calc.parseMoney(form.downPayment.value);
      const years = parseInt(form.loanTerm.value, 10) || 0;
      const rate = calc.parseDecimal(form.interestRate.value);
      if (price <= 0 || down < 0 || rate <= 0 || years <= 0) {
        showError(form, 'Bitte Kaufpreis, Eigenkapital, Zinssatz und Laufzeit ausfüllen.');
        return;
      }
      if (down >= price) {
        showError(form, 'Das Eigenkapital muss unter dem Kaufpreis liegen.');
        return;
      }
      showError(form, '');
      const result = calc.mortgage({ price: price, down: down, years: years, annualRatePercent: rate });
      setText('mortgagePayment', money(result.payment));
      setText('mortgageTax', money(result.monthlyTax));
      setText('mortgageInsurance', money(result.monthlyInsurance));
      setText('mortgageTotal', money(result.totalMonthly));
      setText('mortgageLoan', money(result.loan));
      setText('mortgageInterest', money(result.totalInterest));
      setText('mortgageCost', money(result.totalPaid));
      root.querySelector('[data-calc-results]').hidden = false;
    }
    bindRecalc(form, calculate);
  }

  function wireCosts(root) {
    const form = root.querySelector('form');
    const rows = [...document.querySelectorAll('.calc-rates tbody tr')];

    function selectedCode() {
      const option = form.state.options[form.state.selectedIndex];
      return option ? option.getAttribute('data-code') : '';
    }

    function highlight() {
      const code = selectedCode();
      rows.forEach(function (row) {
        const on = row.getAttribute('data-code') === code;
        row.classList.toggle('is-selected', on);
        row.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    function scrollToCalculator() {
      const target = root.querySelector('.calc-work');
      if (!target) return;
      const header = document.querySelector('.site-header');
      const headerHeight = header ? header.offsetHeight : 0;
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerHeight - 24);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        const page = document.documentElement;
        const previous = page.style.scrollBehavior;
        page.style.scrollBehavior = 'auto';
        window.scrollTo({ top: top, behavior: 'auto' });
        page.style.scrollBehavior = previous;
        return;
      }
      window.scrollTo({ top: top, behavior: 'smooth' });
    }

    function selectLand(code) {
      const options = [...form.state.options];
      const match = options.find(function (option) {
        return option.getAttribute('data-code') === code;
      });
      if (!match) return;
      options.forEach(function (option) {
        option.selected = option === match;
      });
      calculate();
      scrollToCalculator();
    }

    function calculate() {
      const price = calc.parseMoney(form.purchasePrice.value);
      const rate = calc.parseDecimal(form.state.value);
      const agent = form.agent.value === 'yes';
      highlight();
      if (price <= 0 || !(rate > 0)) {
        showError(form, 'Bitte einen Kaufpreis und ein Bundesland wählen.');
        return;
      }
      showError(form, '');
      const result = calc.purchaseCosts({ price: price, rate: rate, agent: agent });
      setText('costsTax', money(result.tax));
      setText('costsNotary', range(result.notaryLow, result.notaryHigh));
      setText('costsAgent', agent ? money(result.agentAmount) : '0 €');
      setText('costsTotal', range(result.totalLow, result.totalHigh));
      setText('costsPercent', percentRange(result.pctLow, result.pctHigh));
      const stateLabel = form.state.options[form.state.selectedIndex].textContent;
      setText('costsStateLabel', stateLabel.replace(/\s+\d.*$/, ''));
      root.querySelector('[data-calc-results]').hidden = false;
    }

    rows.forEach(function (row) {
      row.tabIndex = 0;
      row.addEventListener('click', function () {
        selectLand(row.getAttribute('data-code'));
      });
      row.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectLand(row.getAttribute('data-code'));
      });
    });
    bindRecalc(form, calculate);
  }

  function wireYield(root) {
    const form = root.querySelector('form');
    const buttons = root.querySelectorAll('[data-yield-mode]');
    function setMode(mode) {
      buttons.forEach(function (button) {
        const on = button.getAttribute('data-yield-mode') === mode;
        button.classList.toggle('is-active', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      root.querySelectorAll('[data-yield-panel]').forEach(function (panel) {
        panel.classList.toggle('is-emphasis', panel.getAttribute('data-yield-panel') === mode);
      });
    }
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        setMode(button.getAttribute('data-yield-mode'));
      });
    });
    function calculate() {
      const price = calc.parseMoney(form.price.value);
      const monthlyRent = calc.parseDecimal(form.monthlyRent.value);
      const purchaseCostPercent = calc.parseDecimal(form.purchaseCostPercent.value);
      const nonRecoverable = calc.parseMoney(form.nonRecoverable.value);
      if (price <= 0 || monthlyRent <= 0) {
        showError(form, 'Bitte Kaufpreis und monatliche Kaltmiete ausfüllen.');
        return;
      }
      if (purchaseCostPercent < 0 || nonRecoverable < 0) {
        showError(form, 'Kaufnebenkosten und Kosten dürfen nicht negativ sein.');
        return;
      }
      showError(form, '');
      const result = calc.rentalYield({
        price: price,
        monthlyRent: monthlyRent,
        purchaseCostPercent: purchaseCostPercent,
        nonRecoverable: nonRecoverable
      });
      setText('yieldAnnual', money(result.annual));
      setText('yieldGross', percent(result.gross));
      setText('yieldNet', percent(result.net));
      setText('yieldMultiple', oneDecimal.format(result.multiple) + '×');
      root.querySelector('[data-calc-results]').hidden = false;
    }
    bindRecalc(form, calculate);
    setMode('gross');
  }

  function wireFaq(root) {
    const section = root.querySelector('.calc-faq');
    if (!section) return;
    const items = [...section.querySelectorAll('.calc-faq__item')];
    function setOpen(item, open) {
      item.classList.toggle('is-open', open);
      const button = item.querySelector('.calc-faq__question');
      const answer = item.querySelector('.calc-faq__answer');
      if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (answer) answer.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    items.forEach(function (item, index) {
      setOpen(item, index === 0);
      const button = item.querySelector('.calc-faq__question');
      if (!button) return;
      button.addEventListener('click', function () {
        const willOpen = !item.classList.contains('is-open');
        items.forEach(function (other) { setOpen(other, false); });
        if (willOpen) setOpen(item, true);
      });
    });
    section.classList.add('is-ready');
  }

  document.addEventListener('DOMContentLoaded', function () {
    const root = document.querySelector('[data-calculator]');
    if (!root) return;
    wireFaq(root);
    const id = root.getAttribute('data-calculator');
    if (id === 'mortgage') wireMortgage(root);
    if (id === 'costs') wireCosts(root);
    if (id === 'yield') wireYield(root);
    const form = root.querySelector('form');
    if (form) form.requestSubmit();
  });
})();
