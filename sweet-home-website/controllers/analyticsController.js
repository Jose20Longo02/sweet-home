const { query } = require('../config/db');
const {
  sanitizeDate,
  getSummary,
  getTimeSeries,
  getTopProperties,
  getTopProjects,
  getAgentPerformance,
  getLocationInsights,
  getTopPages,
  getRecentLeads
} = require('../models/Analytics');

async function getPendingCount() {
  const { rows } = await query(`
    SELECT COUNT(*) AS count
      FROM users
     WHERE role IN ('Admin','SuperAdmin')
       AND approved = false
  `);
  return parseInt(rows[0]?.count || 0, 10);
}

exports.dashboard = async (req, res, next) => {
  try {
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - 29);
    const defaultStartStr = defaultStart.toISOString().slice(0, 10);
    const defaultEndStr = today.toISOString().slice(0, 10);

    let dateFrom = sanitizeDate(req.query.date_from, defaultStartStr);
    let dateTo = sanitizeDate(req.query.date_to, defaultEndStr);
    const quickRange = req.query.quick_range || '';
    const metric = req.query.metric === 'forms' ? 'forms' : 'views';

    if (quickRange) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let start = new Date(today);
      if (quickRange === 'today') {
        // already today
      } else if (quickRange === 'ytd') {
        start = new Date(today.getFullYear(), 0, 1);
      } else {
        const days = parseInt(quickRange, 10);
        if (!Number.isNaN(days)) {
          start.setDate(today.getDate() - (days - 1));
        }
      }
      dateFrom = start.toISOString().slice(0, 10);
      dateTo = today.toISOString().slice(0, 10);
    }

    const [
      summary,
      timeSeries,
      topProperties,
      topProjects,
      agentPerformance,
      locationInsights,
      topPages,
      recentLeads,
      pendingCount
    ] = await Promise.all([
      getSummary({ startDate: dateFrom, endDate: dateTo }),
      getTimeSeries({ startDate: dateFrom, endDate: dateTo }),
      getTopProperties({ startDate: dateFrom, endDate: dateTo, sortBy: metric }),
      getTopProjects({ startDate: dateFrom, endDate: dateTo, sortBy: metric }),
      getAgentPerformance({ startDate: dateFrom, endDate: dateTo, sortBy: metric }),
      getLocationInsights({ startDate: dateFrom, endDate: dateTo }),
      getTopPages({ startDate: dateFrom, endDate: dateTo }),
      getRecentLeads(8),
      getPendingCount()
    ]);

    res.render('superadmin/analytics/dashboard', {
      dateFrom,
      dateTo,
      metric,
      summary,
      timeSeries,
      topProperties,
      topProjects,
      agentPerformance,
      locationInsights,
      topPages,
      recentLeads,
      pendingCount,
      quickRange,
      activePage: 'analytics'
    });
  } catch (err) {
    next(err);
  }
};

