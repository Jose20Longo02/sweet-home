(function () {
  function ensureMessageStyles() {
    if (document.getElementById('strategyMessageStyles')) return;
    var messageStyles = document.createElement('style');
    messageStyles.id = 'strategyMessageStyles';
    messageStyles.textContent = `
      .message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
      }

      .message.show {
        transform: translateX(0);
      }

      .message-success { background-color: #16a34a; }
      .message-error { background-color: #dc2626; }
      .message-info { background-color: #2563eb; }
    `;
    document.head.appendChild(messageStyles);
  }

  function showMessage(message, type) {
    ensureMessageStyles();
    var messageDiv = document.createElement('div');
    messageDiv.className = 'message message-' + type;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(function () { messageDiv.classList.add('show'); }, 100);
    setTimeout(function () {
      messageDiv.classList.remove('show');
      setTimeout(function () { messageDiv.remove(); }, 300);
    }, 3000);
  }

  function showSuccessMessage(message) {
    showMessage(message, 'success');
  }

  function parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    var normalized = String(value).replace(',', '.').replace(/[^0-9.-]/g, '');
    var parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatEur(value) {
    var amount = Number.isFinite(value) ? value : 0;
    return 'EUR ' + amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  var calcRoot = document.getElementById('strategy-calculator');
  if (calcRoot) {
    var wizard = calcRoot.querySelector('.strategy-calculator__wizard');
    var steps = Array.prototype.slice.call(calcRoot.querySelectorAll('.strategy-calculator__step'));
    var stepIndicators = Array.prototype.slice.call(calcRoot.querySelectorAll('[data-step-indicator]'));
    var prevBtn = document.getElementById('calcPrevBtn');
    var nextBtn = document.getElementById('calcNextBtn');
    var runBtn = document.getElementById('calcRunBtn');
    var resultsWrap = document.getElementById('strategyCalculatorResults');

    var salaryInput = document.getElementById('calcSalary1');
    var loansInput = document.getElementById('calcLoans');
    var insuranceInput = document.getElementById('calcInsurance');
    var adultsInput = document.getElementById('calcAdults');
    var childrenInput = document.getElementById('calcChildren');
    var propertyPriceInput = document.getElementById('calcPropertyPrice');
    var equityPctInput = document.getElementById('calcEquityPct');
    var debtServiceRateInput = document.getElementById('calcDebtServiceRate');

    var output = {
      extraCosts: document.getElementById('calcExtraCosts'),
      totalEquity: document.getElementById('calcTotalEquity'),
      mortgage: document.getElementById('calcMortgage'),
      totalIncome: document.getElementById('calcTotalIncome'),
      livingExpenses: document.getElementById('calcLivingExpenses'),
      totalExpenses: document.getElementById('calcTotalExpenses'),
      finalBalance: document.getElementById('calcFinalBalance'),
      estimatedPayment: document.getElementById('calcEstimatedPayment'),
      requiredSalary: document.getElementById('calcRequiredSalary'),
      qualificationStatus: document.getElementById('calcQualificationStatus'),
      qualificationNote: document.getElementById('calcQualificationNote'),
      qualificationCard: document.getElementById('calcQualificationStatus') ? document.getElementById('calcQualificationStatus').closest('.strategy-calculator__result--status') : null
    };
    var currentStep = 1;

    function getLivingExpenses(adults, children) {
      var base = adults >= 2 ? 1600 : 1200;
      return base + (Math.max(children, 0) * 200);
    }

    function showStep(stepNumber) {
      currentStep = Math.max(1, Math.min(steps.length, stepNumber));
      if (wizard) wizard.setAttribute('data-current-step', String(currentStep));

      steps.forEach(function (stepEl, idx) {
        var active = (idx + 1) === currentStep;
        stepEl.classList.toggle('is-active', active);
        stepEl.hidden = !active;
      });

      stepIndicators.forEach(function (indicator) {
        var step = parseInt(indicator.getAttribute('data-step-indicator') || '0', 10);
        indicator.classList.toggle('is-active', step === currentStep);
      });

      if (prevBtn) prevBtn.hidden = currentStep === 1;
      if (nextBtn) nextBtn.hidden = currentStep === steps.length;
      if (runBtn) runBtn.hidden = currentStep !== steps.length;
    }

    function runCalculator() {
      var totalIncome = parseNumber(salaryInput ? salaryInput.value : 0);
      var loans = parseNumber(loansInput ? loansInput.value : 0);
      var insurance = parseNumber(insuranceInput ? insuranceInput.value : 0);
      var adults = Math.max(1, Math.min(2, Math.round(parseNumber(adultsInput ? adultsInput.value : 1))));
      var children = Math.max(0, Math.round(parseNumber(childrenInput ? childrenInput.value : 0)));
      var livingExpenses = getLivingExpenses(adults, children);
      var totalExpenses = loans + insurance + livingExpenses;
      var finalBalance = totalIncome - totalExpenses;

      var propertyPrice = Math.max(0, parseNumber(propertyPriceInput ? propertyPriceInput.value : 0));
      var equityPct = Math.max(0, Math.min(100, parseNumber(equityPctInput ? equityPctInput.value : 0)));
      var annualDebtServiceRate = Math.max(0, parseNumber(debtServiceRateInput ? debtServiceRateInput.value : 0));

      var extraCosts = propertyPrice * 0.12;
      var ownEquity = propertyPrice * (equityPct / 100);
      var totalEquityRequired = extraCosts + ownEquity;
      var mortgage = Math.max(0, propertyPrice + extraCosts - totalEquityRequired);
      var estimatedPayment = (mortgage * annualDebtServiceRate) / 1200;
      var bufferedPayment = estimatedPayment * 1.1;
      var requiredSalary = bufferedPayment + totalExpenses;
      var meetsUpfrontMinimum = equityPct >= 12;
      var qualifies = estimatedPayment <= finalBalance && meetsUpfrontMinimum;

      if (output.extraCosts) output.extraCosts.textContent = formatEur(extraCosts);
      if (output.totalEquity) output.totalEquity.textContent = formatEur(totalEquityRequired);
      if (output.mortgage) output.mortgage.textContent = formatEur(mortgage);
      if (output.totalIncome) output.totalIncome.textContent = formatEur(totalIncome);
      if (output.livingExpenses) output.livingExpenses.textContent = formatEur(livingExpenses);
      if (output.totalExpenses) output.totalExpenses.textContent = formatEur(totalExpenses);
      if (output.finalBalance) output.finalBalance.textContent = formatEur(finalBalance);
      if (output.estimatedPayment) output.estimatedPayment.textContent = formatEur(estimatedPayment);
      if (output.requiredSalary) output.requiredSalary.textContent = formatEur(requiredSalary);

      if (output.qualificationStatus) {
        output.qualificationStatus.textContent = qualifies ? 'Qualified under current assumptions' : 'Not qualified under current assumptions';
      }
      if (output.qualificationCard) {
        output.qualificationCard.classList.toggle('is-qualified', qualifies);
      }
      if (output.qualificationNote) {
        if (qualifies) {
          output.qualificationNote.innerHTML = 'Result: <strong>Suitable under current assumptions.</strong> Geschätzt is lower than your final balance after expenses, which means your monthly capacity can cover the modeled payment.';
        } else {
          var shortfall = estimatedPayment - finalBalance;
          var reasons = [];
          if (finalBalance <= 0) {
            reasons.push('your current monthly expenses are consuming most (or all) available income');
          }
          if (estimatedPayment > finalBalance) {
            reasons.push('the estimated monthly payment is about <strong>' + formatEur(shortfall) + '</strong> above your available final balance');
          }
          if (equityPct < 12) {
            reasons.push('upfront payment is below 12%, which can reduce financing strength');
          }
          output.qualificationNote.innerHTML = 'Result: <strong>Not suitable yet under current assumptions.</strong> Main reason(s): ' + reasons.join('; ') + '. You can improve this by increasing upfront payment, reducing property price, lowering other monthly obligations, or targeting better financing terms.';
        }
      }

      if (resultsWrap) resultsWrap.hidden = false;
    }

    function scrollResultsIntoViewIfNeeded() {
      if (!resultsWrap || resultsWrap.hidden) return;
      var rect = resultsWrap.getBoundingClientRect();
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      var topPadding = 120;
      var fullyVisible = rect.top >= topPadding && rect.bottom <= viewportHeight - 20;
      if (fullyVisible) return;

      var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var targetTop = Math.max(0, window.scrollY + rect.top - topPadding);
      window.scrollTo({
        top: targetTop,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        showStep(currentStep - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        showStep(currentStep + 1);
      });
    }
    if (runBtn) {
      runBtn.addEventListener('click', function () {
        runCalculator();
        scrollResultsIntoViewIfNeeded();
      });
    }

    // If users edit values after calculating, keep results hidden until they recalculate.
    [
      salaryInput,
      loansInput,
      insuranceInput,
      adultsInput,
      childrenInput,
      propertyPriceInput,
      equityPctInput,
      debtServiceRateInput
    ].filter(Boolean).forEach(function (input) {
      input.addEventListener('input', function () {
        if (resultsWrap) resultsWrap.hidden = true;
        if (output.qualificationNote) {
          output.qualificationNote.innerHTML = 'Inputs updated. Click <strong>Calculate suitability</strong> to refresh your result.';
        }
      });
    });

    showStep(1);
  }

  var mechanicsRoot = document.querySelector('.strategy-mechanics__process');
  if (mechanicsRoot) {
    var mechanicPoints = Array.prototype.slice.call(mechanicsRoot.querySelectorAll('[data-mechanics-step]'));
    var activeMechanicStep = 1;

    function setMechanicStep(step) {
      var nextStep = Math.max(1, Math.min(mechanicPoints.length, Number(step) || 1));
      if (nextStep === activeMechanicStep) return;
      activeMechanicStep = nextStep;

      mechanicPoints.forEach(function (point) {
        var isActive = Number(point.getAttribute('data-mechanics-step')) === activeMechanicStep;
        point.classList.toggle('is-active', isActive);
      });
    }

    mechanicPoints.forEach(function (point) {
      var step = Number(point.getAttribute('data-mechanics-step'));
      point.addEventListener('click', function () { setMechanicStep(step); });
      point.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setMechanicStep(step);
        }
      });
    });

    if ('IntersectionObserver' in window && mechanicPoints.length > 1) {
      var mechanicsObserver = new IntersectionObserver(function (entries) {
        var visible = entries
          .filter(function (entry) { return entry.isIntersecting; })
          .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
        if (!visible.length) return;
        var step = Number(visible[0].target.getAttribute('data-mechanics-step')) || 1;
        setMechanicStep(step);
      }, {
        threshold: [0.35, 0.55, 0.75],
        rootMargin: '-18% 0px -34% 0px'
      });
      mechanicPoints.forEach(function (point) { mechanicsObserver.observe(point); });
    }

    setMechanicStep(1);
  }

  const form = document.getElementById('berlinInvestorStrategyForm');
  const messageEl = form ? form.querySelector('.form-status') : null;
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!submitBtn) return;

    submitBtn.disabled = true;
    if (messageEl) {
      messageEl.style.display = 'none';
      messageEl.className = 'form-status';
      messageEl.textContent = '';
    }

    try {
      const body = new FormData(form);
      const params = new URLSearchParams(window.location.search);
      const setIf = (key, val) => { if (!body.get(key) && val) body.set(key, val); };
      setIf('utm_source', params.get('utm_source'));
      setIf('utm_medium', params.get('utm_medium'));
      setIf('utm_campaign', params.get('utm_campaign'));
      setIf('utm_term', params.get('utm_term'));
      setIf('utm_content', params.get('utm_content'));
      setIf('referrer', document.referrer);
      setIf('page_path', window.location.pathname);

      // Ensure recaptcha token exists if site key is configured
      var siteKey = form.getAttribute('data-recaptcha-site-key');
      if (siteKey && window.grecaptcha && typeof grecaptcha.execute === 'function') {
        try {
          const token = await grecaptcha.execute(siteKey, { action: 'contact' });
          if (!body.get('recaptchaToken')) body.set('recaptchaToken', token || '');
        } catch (_) {}
      }

      const urlBody = new URLSearchParams();
      for (const [k, v] of body.entries()) urlBody.append(k, v);

      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const res = await fetch('/api/leads/berlin-investor-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          ...(csrfMeta ? { 'x-csrf-token': csrfMeta.getAttribute('content') } : {})
        },
        body: urlBody.toString()
      });

      const data = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !data.success) {
        throw new Error((data && data.message) || 'Unable to submit. Please try again.');
      }

      if (window.analytics && window.analytics.trackFormSubmit) {
        window.analytics.trackFormSubmit('berlin_investor_strategy_form', null, null);
      }

      showSuccessMessage('Thank you! Your form was submitted successfully. A team member will contact you shortly.');
      form.reset();
    } catch (err) {
      showMessage(err.message || 'Something went wrong. Please try again later.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
