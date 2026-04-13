(function () {
  function parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    var normalized = String(value).replace(',', '.').replace(/[^0-9.-]/g, '');
    var parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatEur(value) {
    var amount = Number.isFinite(value) ? value : 0;
    return 'EUR ' + amount.toLocaleString('de-DE', { maximumFractionDigits: 0 });
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
        output.qualificationStatus.textContent = qualifies ? 'Unter aktuellen Annahmen geeignet' : 'Unter aktuellen Annahmen nicht geeignet';
      }
      if (output.qualificationCard) {
        output.qualificationCard.classList.toggle('is-qualified', qualifies);
      }
      if (output.qualificationNote) {
        if (qualifies) {
          output.qualificationNote.innerHTML = 'Ergebnis: <strong>Unter den aktuellen Annahmen geeignet.</strong> Die geschaetzte Rate liegt unter Ihrem verfuegbaren Rest nach Ausgaben.';
        } else {
          var shortfall = estimatedPayment - finalBalance;
          var reasons = [];
          if (finalBalance <= 0) {
            reasons.push('Ihre aktuellen monatlichen Ausgaben binden den groessten Teil des verfuegbaren Einkommens');
          }
          if (estimatedPayment > finalBalance) {
            reasons.push('die geschaetzte Monatsrate liegt etwa <strong>' + formatEur(shortfall) + '</strong> ueber Ihrem verfuegbaren Rest');
          }
          if (equityPct < 12) {
            reasons.push('der Eigenanteil liegt unter 12% und kann die Finanzierungsstaerke reduzieren');
          }
          output.qualificationNote.innerHTML = 'Ergebnis: <strong>Noch nicht geeignet unter den aktuellen Annahmen.</strong> Hauptgrund/Hauptgruende: ' + reasons.join('; ') + '. Verbessern koennen Sie das Ergebnis durch hoeheren Eigenanteil, niedrigeren Kaufpreis, geringere laufende Verpflichtungen oder bessere Finanzierungskonditionen.';
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

    if (prevBtn) prevBtn.addEventListener('click', function () { showStep(currentStep - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { showStep(currentStep + 1); });
    if (runBtn) {
      runBtn.addEventListener('click', function () {
        runCalculator();
        scrollResultsIntoViewIfNeeded();
      });
    }

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
          output.qualificationNote.innerHTML = 'Eingaben aktualisiert. Klicken Sie auf <strong>Eignung berechnen</strong>, um das Ergebnis zu aktualisieren.';
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

  var form = document.getElementById('berlinInvestorStrategyForm');
  var messageEl = form ? form.querySelector('.form-status') : null;
  if (!form || !messageEl) return;

  var submitBtn = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!submitBtn) return;

    submitBtn.disabled = true;
    messageEl.style.display = 'block';
    messageEl.className = 'form-status';
    messageEl.textContent = '';

    try {
      var body = new FormData(form);
      var params = new URLSearchParams(window.location.search);
      var setIf = function (key, val) { if (!body.get(key) && val) body.set(key, val); };
      setIf('utm_source', params.get('utm_source'));
      setIf('utm_medium', params.get('utm_medium'));
      setIf('utm_campaign', params.get('utm_campaign'));
      setIf('utm_term', params.get('utm_term'));
      setIf('utm_content', params.get('utm_content'));
      setIf('referrer', document.referrer);
      setIf('page_path', window.location.pathname);

      var siteKey = form.getAttribute('data-recaptcha-site-key');
      if (siteKey && window.grecaptcha && typeof grecaptcha.execute === 'function') {
        try {
          var token = await grecaptcha.execute(siteKey, { action: 'contact' });
          if (!body.get('recaptchaToken')) body.set('recaptchaToken', token || '');
        } catch (_) {}
      }

      var urlBody = new URLSearchParams();
      for (var entry of body.entries()) urlBody.append(entry[0], entry[1]);

      var csrfMeta = document.querySelector('meta[name="csrf-token"]');
      var res = await fetch('/api/leads/berlin-investor-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          ...(csrfMeta ? { 'x-csrf-token': csrfMeta.getAttribute('content') } : {})
        },
        body: urlBody.toString()
      });

      var data = await res.json().catch(function () { return { success: false }; });
      if (!res.ok || !data.success) {
        throw new Error((data && data.message) || 'Senden derzeit nicht moeglich. Bitte erneut versuchen.');
      }

      if (window.analytics && window.analytics.trackFormSubmit) {
        window.analytics.trackFormSubmit('berlin_investor_strategy_form', null, null);
      }

      messageEl.classList.add('success');
      messageEl.textContent = 'Vielen Dank. Unser Team meldet sich zeitnah bei Ihnen.';
      form.reset();
    } catch (err) {
      messageEl.classList.add('error');
      messageEl.textContent = err.message || 'Es ist ein Fehler aufgetreten. Bitte spaeter erneut versuchen.';
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
