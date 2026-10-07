/**
 * Pure formulas for the three German calculator pages.
 * Mortgage math matches calculateMortgage() in public/js/home.js.
 * Yield math matches /blog/mietrendite-berechnen.
 * Notary range and buyer agent share match /blog/kaufnebenkosten-berlin.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SweetHomeCalc = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function parseMoney(value) {
    const digits = String(value == null ? '' : value).replace(/[^0-9]/g, '');
    const n = parseInt(digits, 10);
    return Number.isFinite(n) ? n : 0;
  }

  function parseDecimal(value) {
    const raw = String(value == null ? '' : value).trim().replace(/\s/g, '').replace(',', '.');
    if (!raw) return 0;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function mortgage(input) {
    const price = input.price;
    const down = input.down;
    const years = input.years;
    const annualRatePercent = input.annualRatePercent;
    const loan = price - down;
    const monthlyRate = annualRatePercent / 100 / 12;
    const payments = years * 12;
    let payment = 0;
    if (monthlyRate > 0 && payments > 0) {
      const pow = Math.pow(1 + monthlyRate, payments);
      payment = loan * (monthlyRate * pow) / (pow - 1);
    }
    const totalPaid = payment * payments;
    const monthlyTax = (price * 0.015) / 12;
    const monthlyInsurance = (price * 0.0075) / 12;
    return {
      loan: loan,
      payment: payment,
      totalInterest: totalPaid - loan,
      totalPaid: totalPaid,
      monthlyTax: monthlyTax,
      monthlyInsurance: monthlyInsurance,
      totalMonthly: payment + monthlyTax + monthlyInsurance
    };
  }

  function purchaseCosts(input) {
    const price = input.price;
    const rate = input.rate;
    const tax = price * rate;
    const notaryLow = price * 0.015;
    const notaryHigh = price * 0.02;
    const agentAmount = input.agent ? price * 0.0357 : 0;
    const totalLow = tax + notaryLow + agentAmount;
    const totalHigh = tax + notaryHigh + agentAmount;
    return {
      tax: tax,
      notaryLow: notaryLow,
      notaryHigh: notaryHigh,
      agentAmount: agentAmount,
      totalLow: totalLow,
      totalHigh: totalHigh,
      pctLow: price ? (totalLow / price) * 100 : 0,
      pctHigh: price ? (totalHigh / price) * 100 : 0
    };
  }

  function rentalYield(input) {
    const price = input.price;
    const annual = input.monthlyRent * 12;
    const purchaseCostsAmount = price * (input.purchaseCostPercent / 100);
    const invested = price + purchaseCostsAmount;
    const netIncome = annual - input.nonRecoverable;
    return {
      annual: annual,
      gross: price ? (annual / price) * 100 : 0,
      net: invested ? (netIncome / invested) * 100 : 0,
      multiple: annual ? price / annual : 0,
      purchaseCostsAmount: purchaseCostsAmount
    };
  }

  return {
    parseMoney: parseMoney,
    parseDecimal: parseDecimal,
    mortgage: mortgage,
    purchaseCosts: purchaseCosts,
    rentalYield: rentalYield
  };
});
