// controllers/analyticsController.js
const Analytics = require('../models/Analytics');
const { query } = require('../config/db');

// Helper to get pending count (reused from adminController)
async function getPendingCount() {
  const res = await query(`
    SELECT COUNT(*)
      FROM users
     WHERE role IN ('Admin','SuperAdmin')
       AND approved = false
  `);
  return parseInt(res.rows[0].count, 10);
}

/**
 * Render the Analytics Dashboard
 */
exports.dashboard = async (req, res, next) => {
  try {
    const pendingCount = await getPendingCount();
    
    // Get date range from query params (default to last 30 days)
    const dateFrom = req.query.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = req.query.date_to || new Date().toISOString().split('T')[0];

    // Fetch all analytics data in parallel
    const [
      topProperties,
      topProjects,
      agentPerformance,
      locationAnalytics,
      timeBasedAnalytics,
      conversionMetrics
    ] = await Promise.all([
      Analytics.getTopProperties({ limit: 10, dateFrom, dateTo }),
      Analytics.getTopProjects({ limit: 10, dateFrom, dateTo }),
      Analytics.getAgentPerformance({ dateFrom, dateTo }),
      Analytics.getLocationAnalytics({ dateFrom, dateTo }),
      Analytics.getTimeBasedAnalytics({ dateFrom, dateTo, groupBy: 'day' }),
      Analytics.getConversionMetrics({ dateFrom, dateTo })
    ]);

    // Calculate summary stats
    const totalViews = topProperties.reduce((sum, p) => sum + (Number(p.views) || 0), 0) +
                      topProjects.reduce((sum, p) => sum + (Number(p.views) || 0), 0);
    const totalLeads = conversionMetrics.reduce((sum, m) => sum + (Number(m.total_leads) || 0), 0);
    const avgConversionRate = conversionMetrics.length > 0
      ? conversionMetrics.reduce((sum, m) => sum + (Number(m.conversion_rate) || 0), 0) / conversionMetrics.length
      : 0;

    res.render('superadmin/analytics/dashboard', {
      topProperties,
      topProjects,
      agentPerformance,
      locationAnalytics,
      timeBasedAnalytics,
      conversionMetrics,
      summary: {
        totalViews,
        totalLeads,
        avgConversionRate: Math.round(avgConversionRate * 100) / 100
      },
      dateFrom,
      dateTo,
      pendingCount,
      currentUser: req.session.user,
      activePage: 'analytics'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Export analytics data as CSV/JSON
 */
exports.export = async (req, res, next) => {
  try {
    const { type, format } = req.query; // type: 'properties', 'projects', 'agents', 'locations'
    const dateFrom = req.query.date_from || null;
    const dateTo = req.query.date_to || null;

    let data = [];
    let filename = 'analytics';

    switch (type) {
      case 'properties':
        data = await Analytics.getTopProperties({ limit: 1000, dateFrom, dateTo });
        filename = 'top-properties';
        break;
      case 'projects':
        data = await Analytics.getTopProjects({ limit: 1000, dateFrom, dateTo });
        filename = 'top-projects';
        break;
      case 'agents':
        data = await Analytics.getAgentPerformance({ dateFrom, dateTo });
        filename = 'agent-performance';
        break;
      case 'locations':
        data = await Analytics.getLocationAnalytics({ dateFrom, dateTo });
        filename = 'location-analytics';
        break;
      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.json(data);
    } else {
      // CSV format
      if (data.length === 0) {
        return res.status(404).send('No data to export');
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle arrays and objects
            if (Array.isArray(value)) return JSON.stringify(value);
            if (typeof value === 'object' && value !== null) return JSON.stringify(value);
            // Escape commas and quotes in CSV
            return `"${String(value || '').replace(/"/g, '""')}"`;
          }).join(',')
        )
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csvRows.join('\n'));
    }
  } catch (err) {
    next(err);
  }
};

