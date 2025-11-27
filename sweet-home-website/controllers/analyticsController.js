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

    // Get filter parameters
    const limit = parseInt(req.query.limit, 10) || 40;
    const searchQuery = req.query.search || '';
    const filterCountry = req.query.filter_country || '';
    const filterCity = req.query.filter_city || '';
    const filterType = req.query.filter_type || '';
    const filterMinPrice = req.query.filter_min_price ? parseFloat(req.query.filter_min_price) : null;
    const filterMaxPrice = req.query.filter_max_price ? parseFloat(req.query.filter_max_price) : null;
    const filterMinRooms = req.query.filter_min_rooms ? parseInt(req.query.filter_min_rooms, 10) : null;

    let [
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
      getTopProperties({ 
        startDate: dateFrom, 
        endDate: dateTo, 
        sortBy: metric,
        limit,
        search: searchQuery,
        country: filterCountry,
        city: filterCity,
        type: filterType,
        minPrice: filterMinPrice,
        maxPrice: filterMaxPrice,
        minRooms: filterMinRooms
      }),
      getTopProjects({ 
        startDate: dateFrom, 
        endDate: dateTo, 
        sortBy: metric,
        limit,
        search: searchQuery,
        country: filterCountry,
        city: filterCity,
        minPrice: filterMinPrice,
        maxPrice: filterMaxPrice
      }),
      getAgentPerformance({ 
        startDate: dateFrom, 
        endDate: dateTo, 
        sortBy: metric,
        limit,
        search: searchQuery
      }),
      getLocationInsights({ startDate: dateFrom, endDate: dateTo }),
      getTopPages({ startDate: dateFrom, endDate: dateTo }),
      getRecentLeads(8),
      getPendingCount()
    ]);

    const normalizedSummary = {
      page_views: Number(summary.page_views || 0),
      property_views: Number(summary.property_views || 0),
      project_views: Number(summary.project_views || 0),
      form_submissions: Number(summary.form_submissions || 0)
    };
    const fallbackVisits = normalizedSummary.property_views + normalizedSummary.project_views;
    normalizedSummary.total_visits = normalizedSummary.page_views > 0
      ? normalizedSummary.page_views
      : fallbackVisits;

    res.render('superadmin/analytics/dashboard', {
      dateFrom,
      dateTo,
      metric,
      summary: normalizedSummary,
      timeSeries,
      topProperties,
      topProjects,
      agentPerformance,
      locationInsights,
      topPages,
      recentLeads,
      pendingCount,
      quickRange,
      limit,
      filters: {
        search: searchQuery,
        country: filterCountry,
        city: filterCity,
        type: filterType,
        minPrice: filterMinPrice,
        maxPrice: filterMaxPrice,
        minRooms: filterMinRooms
      },
      activePage: 'analytics'
    });
  } catch (err) {
    next(err);
  }
};

// Export functions
function convertToCSV(data, headers) {
  const rows = [headers.join(',')];
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header] || '';
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    rows.push(row.join(','));
  });
  return rows.join('\n');
}

exports.exportProperties = async (req, res, next) => {
  try {
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - 29);
    const defaultStartStr = defaultStart.toISOString().slice(0, 10);
    const defaultEndStr = today.toISOString().slice(0, 10);

    let dateFrom = sanitizeDate(req.query.date_from, defaultStartStr);
    let dateTo = sanitizeDate(req.query.date_to, defaultEndStr);
    const metric = req.query.metric === 'forms' ? 'forms' : 'views';
    const limit = parseInt(req.query.limit, 10) || 1000;
    const searchQuery = req.query.search || '';
    const filterCountry = req.query.filter_country || '';
    const filterCity = req.query.filter_city || '';
    const filterType = req.query.filter_type || '';
    const filterMinPrice = req.query.filter_min_price ? parseFloat(req.query.filter_min_price) : null;
    const filterMaxPrice = req.query.filter_max_price ? parseFloat(req.query.filter_max_price) : null;
    const filterMinRooms = req.query.filter_min_rooms ? parseInt(req.query.filter_min_rooms, 10) : null;

    const properties = await getTopProperties({ 
      startDate: dateFrom, 
      endDate: dateTo, 
      sortBy: metric,
      limit,
      search: searchQuery,
      country: filterCountry,
      city: filterCity,
      type: filterType,
      minPrice: filterMinPrice,
      maxPrice: filterMaxPrice,
      minRooms: filterMinRooms
    });

    const csvData = properties.map(p => ({
      'Property Title': p.title || '',
      'Location': `${p.city || ''}, ${p.country || ''}`,
      'Type': p.type || '',
      'Price': p.price || '',
      'Bedrooms': p.bedrooms || '',
      'Views': p.total_views || 0,
      'Form Submissions': p.total_leads || 0,
      'URL': p.slug ? `https://${req.get('host')}/properties/${p.slug}` : ''
    }));

    const csv = convertToCSV(csvData, ['Property Title', 'Location', 'Type', 'Price', 'Bedrooms', 'Views', 'Form Submissions', 'URL']);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="properties-analytics-${dateFrom}-to-${dateTo}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

exports.exportProjects = async (req, res, next) => {
  try {
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - 29);
    const defaultStartStr = defaultStart.toISOString().slice(0, 10);
    const defaultEndStr = today.toISOString().slice(0, 10);

    let dateFrom = sanitizeDate(req.query.date_from, defaultStartStr);
    let dateTo = sanitizeDate(req.query.date_to, defaultEndStr);
    const metric = req.query.metric === 'forms' ? 'forms' : 'views';
    const limit = parseInt(req.query.limit, 10) || 1000;
    const searchQuery = req.query.search || '';
    const filterCountry = req.query.filter_country || '';
    const filterCity = req.query.filter_city || '';
    const filterMinPrice = req.query.filter_min_price ? parseFloat(req.query.filter_min_price) : null;
    const filterMaxPrice = req.query.filter_max_price ? parseFloat(req.query.filter_max_price) : null;

    const projects = await getTopProjects({ 
      startDate: dateFrom, 
      endDate: dateTo, 
      sortBy: metric,
      limit,
      search: searchQuery,
      country: filterCountry,
      city: filterCity,
      minPrice: filterMinPrice,
      maxPrice: filterMaxPrice
    });

    const csvData = projects.map(p => ({
      'Project Title': p.title || '',
      'Location': `${p.city || ''}, ${p.country || ''}`,
      'Min Price': p.min_price || '',
      'Max Price': p.max_price || '',
      'Views': p.total_views || 0,
      'Form Submissions': p.total_leads || 0,
      'URL': p.slug ? `https://${req.get('host')}/projects/${p.slug}` : ''
    }));

    const csv = convertToCSV(csvData, ['Project Title', 'Location', 'Min Price', 'Max Price', 'Views', 'Form Submissions', 'URL']);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="projects-analytics-${dateFrom}-to-${dateTo}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

exports.exportAgents = async (req, res, next) => {
  try {
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - 29);
    const defaultStartStr = defaultStart.toISOString().slice(0, 10);
    const defaultEndStr = today.toISOString().slice(0, 10);

    let dateFrom = sanitizeDate(req.query.date_from, defaultStartStr);
    let dateTo = sanitizeDate(req.query.date_to, defaultEndStr);
    const metric = req.query.metric === 'forms' ? 'forms' : 'views';
    const limit = parseInt(req.query.limit, 10) || 1000;
    const searchQuery = req.query.search || '';

    const agents = await getAgentPerformance({ 
      startDate: dateFrom, 
      endDate: dateTo, 
      sortBy: metric,
      limit,
      search: searchQuery
    });

    const csvData = agents.map(a => ({
      'Agent Name': a.name || '',
      'Email': a.email || '',
      'Total Views': a.total_views || 0,
      'Total Form Submissions': a.total_form_submissions || 0,
      'Property Views': a.property_views || 0,
      'Property Leads': a.property_leads || 0,
      'Project Views': a.project_views || 0,
      'Project Leads': a.project_leads || 0
    }));

    const csv = convertToCSV(csvData, ['Agent Name', 'Email', 'Total Views', 'Total Form Submissions', 'Property Views', 'Property Leads', 'Project Views', 'Project Leads']);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="agents-analytics-${dateFrom}-to-${dateTo}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

