const { query } = require('../config/db');

function sanitizeDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : value;
}

function metricColumn(sortBy) {
  return sortBy === 'forms' ? 'total_leads' : 'total_views';
}

async function getSummary({ startDate, endDate }) {
  const { rows } = await query(
    `
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
        COUNT(*) FILTER (WHERE event_type = 'property_view') AS property_views,
        COUNT(*) FILTER (WHERE event_type = 'project_view') AS project_views,
        COUNT(*) FILTER (WHERE event_type = 'contact_form_submit') AS form_submissions,
        (
          SELECT COUNT(DISTINCT session_id)
          FROM analytics_events
          WHERE event_type = 'page_view'
            AND session_id IS NOT NULL
            AND created_at >= $1::date
            AND created_at < ($2::date + INTERVAL '1 day')
        ) AS unique_visits
      FROM analytics_events
      WHERE created_at >= $1::date
        AND created_at < ($2::date + INTERVAL '1 day')
    `,
    [startDate, endDate]
  );
  return rows[0] || { page_views: 0, property_views: 0, project_views: 0, form_submissions: 0, unique_visits: 0 };
}

async function getTimeSeries({ startDate, endDate }) {
  const { rows } = await query(
    `
      WITH date_series AS (
        SELECT generate_series($1::date, $2::date, '1 day') AS day
      )
      SELECT
        day::date AS date,
        COUNT(e.*) FILTER (WHERE e.event_type = 'page_view') AS page_views,
        COUNT(e.*) FILTER (WHERE e.event_type = 'property_view') AS property_views,
        COUNT(e.*) FILTER (WHERE e.event_type = 'project_view') AS project_views,
        COUNT(e.*) FILTER (WHERE e.event_type = 'contact_form_submit') AS form_submissions,
        (
          SELECT COUNT(DISTINCT session_id)
          FROM analytics_events e2
          WHERE e2.event_type = 'page_view'
            AND e2.session_id IS NOT NULL
            AND e2.created_at >= ds.day
            AND e2.created_at < ds.day + INTERVAL '1 day'
        ) AS unique_visits
      FROM date_series ds
      LEFT JOIN analytics_events e
        ON e.created_at >= ds.day
       AND e.created_at < ds.day + INTERVAL '1 day'
      GROUP BY ds.day
      ORDER BY ds.day
    `,
    [startDate, endDate]
  );
  return rows;
}

async function getTopProperties({ 
  startDate, 
  endDate, 
  limit = 40, 
  sortBy = 'views',
  search = '',
  country = '',
  city = '',
  type = '',
  minPrice = null,
  maxPrice = null,
  minRooms = null
}) {
  const orderColumn = sortBy === 'forms' ? 'total_leads' : 'total_views';
  const conditions = ['p.status = \'active\''];
  const params = [startDate, endDate];
  let paramIndex = 3;

  if (search) {
    conditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  if (country) {
    conditions.push(`p.country = $${paramIndex}`);
    params.push(country);
    paramIndex++;
  }
  if (city) {
    conditions.push(`p.city = $${paramIndex}`);
    params.push(city);
    paramIndex++;
  }
  if (type) {
    conditions.push(`p.type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }
  if (minPrice !== null) {
    conditions.push(`p.price >= $${paramIndex}`);
    params.push(minPrice);
    paramIndex++;
  }
  if (maxPrice !== null) {
    conditions.push(`p.price <= $${paramIndex}`);
    params.push(maxPrice);
    paramIndex++;
  }
  if (minRooms !== null) {
    conditions.push(`p.rooms >= $${paramIndex}`);
    params.push(minRooms);
    paramIndex++;
  }

  params.push(limit);

  const { rows } = await query(
    `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.city,
        p.country,
        p.type,
        p.price,
        p.rooms,
        COUNT(e.*) FILTER (WHERE e.event_type = 'property_view') AS total_views,
        COUNT(e.*) FILTER (WHERE e.event_type = 'contact_form_submit') AS total_leads
      FROM properties p
      LEFT JOIN analytics_events e
        ON e.entity_type = 'property'
       AND e.entity_id = p.id
       AND e.created_at >= $1::date
       AND e.created_at < ($2::date + INTERVAL '1 day')
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id
      ORDER BY ${orderColumn} DESC, total_views DESC
      LIMIT $${paramIndex}
    `,
    params
  );
  return rows;
}

async function getTopProjects({ 
  startDate, 
  endDate, 
  limit = 40, 
  sortBy = 'views',
  search = '',
  country = '',
  city = '',
  minPrice = null,
  maxPrice = null
}) {
  const orderColumn = sortBy === 'forms' ? 'total_leads' : 'total_views';
  const conditions = ['p.status = \'active\''];
  const params = [startDate, endDate];
  let paramIndex = 3;

  if (search) {
    conditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  if (country) {
    conditions.push(`p.country = $${paramIndex}`);
    params.push(country);
    paramIndex++;
  }
  if (city) {
    conditions.push(`p.city = $${paramIndex}`);
    params.push(city);
    paramIndex++;
  }
  if (minPrice !== null) {
    conditions.push(`p.min_price >= $${paramIndex}`);
    params.push(minPrice);
    paramIndex++;
  }
  if (maxPrice !== null) {
    conditions.push(`p.max_price <= $${paramIndex}`);
    params.push(maxPrice);
    paramIndex++;
  }

  params.push(limit);

  const { rows } = await query(
    `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.city,
        p.country,
        p.min_price,
        p.max_price,
        COUNT(e.*) FILTER (WHERE e.event_type = 'project_view') AS total_views,
        COUNT(e.*) FILTER (WHERE e.event_type = 'contact_form_submit') AS total_leads
      FROM projects p
      LEFT JOIN analytics_events e
        ON e.entity_type = 'project'
       AND e.entity_id = p.id
       AND e.created_at >= $1::date
       AND e.created_at < ($2::date + INTERVAL '1 day')
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id
      ORDER BY ${orderColumn} DESC, total_views DESC
      LIMIT $${paramIndex}
    `,
    params
  );
  return rows;
}

async function getAgentPerformance({ 
  startDate, 
  endDate, 
  limit = 40, 
  sortBy = 'views',
  search = ''
}) {
  const orderColumn = sortBy === 'forms' ? 'total_form_submissions' : 'total_views';
  const conditions = [
    '(pe.agent_id IS NOT NULL OR pre.agent_id IS NOT NULL)',
    'u.role IN (\'Admin\',\'SuperAdmin\')'
  ];
  const params = [startDate, endDate];
  let paramIndex = 3;

  if (search) {
    conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  params.push(limit);

  const { rows } = await query(
    `
      WITH property_events AS (
        SELECT
          p.agent_id,
          COUNT(e.*) FILTER (WHERE e.event_type = 'property_view') AS views,
          COUNT(e.*) FILTER (WHERE e.event_type = 'contact_form_submit') AS leads
        FROM properties p
        LEFT JOIN analytics_events e
          ON e.entity_type = 'property'
         AND e.entity_id = p.id
         AND e.created_at >= $1::date
         AND e.created_at < ($2::date + INTERVAL '1 day')
        GROUP BY p.agent_id
      ),
      project_events AS (
        SELECT
          pr.agent_id,
          COUNT(e.*) FILTER (WHERE e.event_type = 'project_view') AS views,
          COUNT(e.*) FILTER (WHERE e.event_type = 'contact_form_submit') AS leads
        FROM projects pr
        LEFT JOIN analytics_events e
          ON e.entity_type = 'project'
         AND e.entity_id = pr.id
         AND e.created_at >= $1::date
         AND e.created_at < ($2::date + INTERVAL '1 day')
        GROUP BY pr.agent_id
      )
      SELECT
        u.id,
        u.name,
        u.email,
        COALESCE(pe.views, 0) + COALESCE(pre.views, 0) AS total_views,
        COALESCE(pe.leads, 0) + COALESCE(pre.leads, 0) AS total_form_submissions,
        COALESCE(pe.views, 0) AS property_views,
        COALESCE(pe.leads, 0) AS property_leads,
        COALESCE(pre.views, 0) AS project_views,
        COALESCE(pre.leads, 0) AS project_leads
      FROM users u
      LEFT JOIN property_events pe ON pe.agent_id = u.id
      LEFT JOIN project_events pre ON pre.agent_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderColumn} DESC, total_views DESC
      LIMIT $${paramIndex}
    `,
    params
  );
  return rows;
}

async function getLocationInsights({ startDate, endDate, limit = 6 }) {
  const { rows } = await query(
    `
      WITH property_locations AS (
        SELECT
          p.country,
          p.city,
          COUNT(e.*) FILTER (WHERE e.event_type = 'property_view') AS views,
          COUNT(e.*) FILTER (WHERE e.event_type = 'contact_form_submit') AS leads
        FROM properties p
        LEFT JOIN analytics_events e
          ON e.entity_type = 'property'
         AND e.entity_id = p.id
         AND e.created_at >= $1::date
         AND e.created_at < ($2::date + INTERVAL '1 day')
        GROUP BY p.country, p.city
      ),
      project_locations AS (
        SELECT
          pr.country,
          pr.city,
          COUNT(e.*) FILTER (WHERE e.event_type = 'project_view') AS views,
          COUNT(e.*) FILTER (WHERE e.event_type = 'contact_form_submit') AS leads
        FROM projects pr
        LEFT JOIN analytics_events e
          ON e.entity_type = 'project'
         AND e.entity_id = pr.id
         AND e.created_at >= $1::date
         AND e.created_at < ($2::date + INTERVAL '1 day')
        GROUP BY pr.country, pr.city
      )
      SELECT
        COALESCE(pl.country, jl.country) AS country,
        COALESCE(pl.city, jl.city) AS city,
        COALESCE(pl.views, 0) + COALESCE(jl.views, 0) AS total_views,
        COALESCE(pl.leads, 0) + COALESCE(jl.leads, 0) AS total_leads
      FROM property_locations pl
      FULL JOIN project_locations jl USING (country, city)
      WHERE COALESCE(pl.views, 0) + COALESCE(jl.views, 0) > 0
      ORDER BY total_views DESC
      LIMIT $3
    `,
    [startDate, endDate, limit]
  );
  return rows;
}

async function getTopPages({ startDate, endDate, limit = 6 }) {
  const { rows } = await query(
    `
      SELECT
        COALESCE(meta->>'path', 'unknown') AS path,
        COUNT(*) AS views
      FROM analytics_events
      WHERE event_type = 'page_view'
        AND created_at >= $1::date
        AND created_at < ($2::date + INTERVAL '1 day')
      GROUP BY path
      ORDER BY views DESC
      LIMIT $3
    `,
    [startDate, endDate, limit]
  );
  return rows;
}

async function getRecentLeads(limit = 10) {
  const { rows } = await query(
    `
      SELECT
        l.id,
        l.name,
        l.email,
        l.phone,
        COALESCE(l.source, 'contact_form') AS source,
        l.created_at,
        p.title AS property_title,
        pr.title AS project_title
      FROM leads l
      LEFT JOIN properties p ON l.property_id = p.id
      LEFT JOIN projects pr ON l.project_id = pr.id
      ORDER BY l.created_at DESC
      LIMIT $1
    `,
    [limit]
  );
  return rows;
}

async function getCountryBreakdown({ startDate, endDate, limit = 10 }) {
  const { rows } = await query(
    `
      SELECT
        country,
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view' AND session_id IS NOT NULL) AS unique_visits,
        COUNT(*) FILTER (WHERE event_type = 'property_view') AS property_views,
        COUNT(*) FILTER (WHERE event_type = 'project_view') AS project_views,
        COUNT(*) FILTER (WHERE event_type = 'contact_form_submit') AS form_submissions
      FROM analytics_events
      WHERE created_at >= $1::date
        AND created_at < ($2::date + INTERVAL '1 day')
        AND country IS NOT NULL
      GROUP BY country
      ORDER BY unique_visits DESC, page_views DESC
      LIMIT $3
    `,
    [startDate, endDate, limit]
  );
  return rows;
}

module.exports = {
  sanitizeDate,
  getSummary,
  getTimeSeries,
  getTopProperties,
  getTopProjects,
  getAgentPerformance,
  getLocationInsights,
  getTopPages,
  getRecentLeads,
  getCountryBreakdown,
  metricColumn
};

