(() => {
  'use strict';

  let analyticsTimeSeries = [];
  let quickRangeValue = '';
  let chartInstance = null;

  function getRoot() {
    return document.querySelector('.analytics-page');
  }

  function parseMeta() {
    const root = getRoot();
    if (!root) return;

    const seriesPayload = root.dataset.timeSeries || '[]';
    try {
      analyticsTimeSeries = JSON.parse(seriesPayload);
    } catch (_) {
      analyticsTimeSeries = [];
    }
    quickRangeValue = root.dataset.quickRange || '';
  }

  function setupQuickRangeControls() {
    const fromInput = document.getElementById('date_from');
    const toInput = document.getElementById('date_to');
    const quickButtons = document.querySelectorAll('.quick-ranges button');
    if (!fromInput || !toInput || !quickButtons.length) return;

    const parseDate = (str) => (str ? new Date(`${str}T00:00:00`) : null);

    const highlightRange = (range) => {
      quickButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-range') === range);
      });
    };

    const detectRange = () => {
      const fromDate = parseDate(fromInput.value);
      const toDate = parseDate(toInput.value);
      if (!fromDate || !toDate) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.round((toDate - fromDate) / 86400000) + 1;

      if (diffDays === 1 && toDate.getTime() === today.getTime()) {
        return 'today';
      }

      if (toDate.getTime() === today.getTime()) {
        const presets = [7, 30, 90, 365];
        const match = presets.find((days) => diffDays === days);
        if (match) return String(match);
      }

      const ytdStart = new Date(today.getFullYear(), 0, 1);
      if (toDate.getTime() === today.getTime() && fromDate.getTime() === ytdStart.getTime()) {
        return 'ytd';
      }
      return null;
    };

    const syncQuickRanges = () => {
      const detected = detectRange();
      highlightRange(detected || '');
    };

    if (quickRangeValue) {
      highlightRange(quickRangeValue);
    } else {
      const detected = detectRange();
      if (detected) highlightRange(detected);
    }

    fromInput.addEventListener('change', syncQuickRanges);
    toInput.addEventListener('change', syncQuickRanges);
    quickButtons.forEach((btn) => {
      btn.addEventListener('click', () => highlightRange(btn.getAttribute('data-range')));
    });
  }

  function formatDateLabel(dateValue) {
    const dateObj = new Date(dateValue);
    if (Number.isNaN(dateObj.getTime())) return dateValue;
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function buildChartSeries() {
    const labels = [];
    const pageViews = [];
    const propertyViews = [];
    const projectViews = [];
    const formSubmissions = [];

    analyticsTimeSeries.forEach((item) => {
      labels.push(formatDateLabel(item.date));
      pageViews.push(Number(item.page_views || 0));
      propertyViews.push(Number(item.property_views || 0));
      projectViews.push(Number(item.project_views || 0));
      formSubmissions.push(Number(item.form_submissions || 0));
    });

    return { labels, pageViews, propertyViews, projectViews, formSubmissions };
  }

  function initChart() {
    const ctx = document.getElementById('trafficChart');
    const loadingEl = document.getElementById('chartLoading');
    const errorEl = document.getElementById('chartError');

    if (!ctx) return;

    const ChartConstructor = (window.Chart && (window.Chart.Chart || window.Chart)) || null;
    if (!ChartConstructor) {
      setTimeout(initChart, 100);
      return;
    }

    if (!analyticsTimeSeries || analyticsTimeSeries.length === 0) {
      if (loadingEl) {
        loadingEl.innerHTML = '<p style="margin:0;color:#64748b;">No data available for the selected date range.</p>';
        loadingEl.style.display = 'block';
      }
      return;
    }

    const { labels, pageViews, propertyViews, projectViews, formSubmissions } = buildChartSeries();

    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    ctx.style.display = 'block';

    try {
      if (chartInstance) {
        chartInstance.destroy();
      }

      chartInstance = new ChartConstructor(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Page views',
              data: pageViews,
              borderColor: '#2ea862',
              backgroundColor: 'rgba(46, 168, 98, 0.08)',
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: '#2ea862',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2.5,
              pointHoverBackgroundColor: '#23824b',
              pointHoverBorderColor: '#ffffff',
              pointHoverBorderWidth: 3
            },
            {
              label: 'Property views',
              data: propertyViews,
              borderColor: '#23824b',
              backgroundColor: 'rgba(35, 130, 75, 0.08)',
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: '#23824b',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2.5,
              pointHoverBackgroundColor: '#1e6b3f',
              pointHoverBorderColor: '#ffffff',
              pointHoverBorderWidth: 3
            },
            {
              label: 'Project views',
              data: projectViews,
              borderColor: '#2ea862',
              backgroundColor: 'rgba(46, 168, 98, 0.06)',
              borderWidth: 2.5,
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#2ea862',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointHoverBackgroundColor: '#23824b',
              pointHoverBorderColor: '#ffffff',
              pointHoverBorderWidth: 2.5,
              borderDash: [5, 5]
            },
            {
              label: 'Form submissions',
              data: formSubmissions,
              borderColor: '#23824b',
              backgroundColor: 'rgba(35, 130, 75, 0.06)',
              borderWidth: 2.5,
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#23824b',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointHoverBackgroundColor: '#1e6b3f',
              pointHoverBorderColor: '#ffffff',
              pointHoverBorderWidth: 2.5,
              borderDash: [8, 4]
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
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                font: { size: 12, weight: '500' },
                color: '#64748b',
                padding: 8
              },
              grid: {
                color: 'rgba(46, 168, 98, 0.08)',
                drawBorder: false,
                lineWidth: 1
              }
            },
            x: {
              ticks: {
                font: { size: 12, weight: '500' },
                color: '#64748b',
                padding: 8
              },
              grid: {
                display: false
              }
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: { size: 12, weight: '500' },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.98)',
              padding: 14,
              titleFont: { size: 13, weight: '700' },
              bodyFont: { size: 12, weight: '500' },
              borderColor: '#2ea862',
              borderWidth: 2,
              cornerRadius: 10,
              displayColors: true,
              titleColor: '#ffffff',
              bodyColor: '#f1f5f9',
              titleSpacing: 6,
              bodySpacing: 4,
              boxPadding: 8
            }
          }
        }
      });
    } catch (error) {
      ctx.style.display = 'none';
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl) {
        errorEl.innerHTML = `<p style="margin:0;color:#ef4444;">Error loading chart: ${error.message}</p>`;
        errorEl.style.display = 'block';
      }
    }
  }

  function startChartInit() {
    let attempts = 0;
    const maxAttempts = 50;
    const loadingEl = document.getElementById('chartLoading');
    const errorEl = document.getElementById('chartError');

    const tryInit = () => {
      attempts += 1;
      const chartReady = !!(window.Chart && (window.Chart.Chart || typeof window.Chart === 'function'));
      if (chartReady) {
        initChart();
      } else if (attempts < maxAttempts) {
        setTimeout(tryInit, 100);
      } else {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
          errorEl.innerHTML = '<p style="margin:0;color:#ef4444;">Failed to load chart library. Please refresh the page.</p>';
          errorEl.style.display = 'block';
        }
      }
    };

    tryInit();
  }

  document.addEventListener('DOMContentLoaded', () => {
    parseMeta();
    setupQuickRangeControls();
    startChartInit();
  });
})();

