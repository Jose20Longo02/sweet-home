// models/Analytics.js
const { query } = require('../config/db');

class Analytics {
  /**
   * Track an analytics event
   */
  static async trackEvent({ eventType, entityType, entityId, userId = null, sessionId = null, ipAddress = null, userAgent = null, referrer = null, country = null, city = null }) {
    const text = `
      INSERT INTO analytics_events (event_type, entity_type, entity_id, user_id, session_id, ip_address, user_agent, referrer, country, city)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [eventType, entityType, entityId, userId, sessionId, ipAddress, userAgent, referrer, country, city];
    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Get most viewed properties (filtered by date range using analytics_events)
   */
  static async getTopProperties({ limit = 10, dateFrom = null, dateTo = null } = {}) {
    const values = [];
    let paramIndex = 1;
    let dateFilter = '';
    let eventDateFilter = '';

    if (dateFrom) {
      dateFilter = ` AND ps.last_updated >= $${paramIndex}::date`;
      eventDateFilter = ` AND created_at >= $${paramIndex}::date`;
      values.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      dateFilter += ` AND ps.last_updated < ($${paramIndex}::date + INTERVAL '1 day')`;
      eventDateFilter += ` AND created_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      values.push(dateTo);
      paramIndex++;
    }

    // Use analytics_events for accurate date filtering, fallback to stats if no events
    const text = `
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.country,
        p.city,
        p.neighborhood,
        p.price,
        p.photos,
        COALESCE(view_counts.view_count, ps.views, 0) as views,
        COALESCE(click_counts.email_clicks, ps.email_clicks, 0) as email_clicks,
        COALESCE(click_counts.whatsapp_clicks, ps.whatsapp_clicks, 0) as whatsapp_clicks,
        COALESCE(click_counts.phone_clicks, ps.phone_clicks, 0) as phone_clicks,
        u.name as agent_name,
        u.id as agent_id
      FROM properties p
      LEFT JOIN property_stats ps ON p.id = ps.property_id
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN (
        SELECT 
          entity_id,
          COUNT(*) FILTER (WHERE event_type = 'property_view') as view_count
        FROM analytics_events
        WHERE entity_type = 'property' ${eventDateFilter || ''}
        GROUP BY entity_id
      ) view_counts ON p.id = view_counts.entity_id
      LEFT JOIN (
        SELECT 
          entity_id,
          COUNT(*) FILTER (WHERE event_type = 'email_click') as email_clicks,
          COUNT(*) FILTER (WHERE event_type = 'whatsapp_click') as whatsapp_clicks,
          COUNT(*) FILTER (WHERE event_type = 'phone_click') as phone_clicks
        FROM analytics_events
        WHERE entity_type = 'property' ${eventDateFilter || ''}
        GROUP BY entity_id
      ) click_counts ON p.id = click_counts.entity_id
      WHERE p.status = 'active' ${dateFilter || ''}
      ORDER BY COALESCE(view_counts.view_count, ps.views, 0) DESC
      LIMIT $${paramIndex}
    `;
    values.push(limit);
    const res = await query(text, values);
    return res.rows;
  }

  /**
   * Get most viewed projects (filtered by date range using analytics_events)
   */
  static async getTopProjects({ limit = 10, dateFrom = null, dateTo = null } = {}) {
    const values = [];
    let paramIndex = 1;
    let dateFilter = '';
    let eventDateFilter = '';

    if (dateFrom) {
      dateFilter = ` AND ps.last_updated >= $${paramIndex}::date`;
      eventDateFilter = ` AND created_at >= $${paramIndex}::date`;
      values.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      dateFilter += ` AND ps.last_updated < ($${paramIndex}::date + INTERVAL '1 day')`;
      eventDateFilter += ` AND created_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      values.push(dateTo);
      paramIndex++;
    }

    // Use analytics_events for accurate date filtering, fallback to stats if no events
    const text = `
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.country,
        p.city,
        p.neighborhood,
        p.photos,
        COALESCE(view_counts.view_count, ps.views, 0) as views,
        COALESCE(click_counts.email_clicks, ps.email_clicks, 0) as email_clicks,
        COALESCE(click_counts.whatsapp_clicks, ps.whatsapp_clicks, 0) as whatsapp_clicks,
        COALESCE(click_counts.phone_clicks, ps.phone_clicks, 0) as phone_clicks,
        u.name as agent_name,
        u.id as agent_id
      FROM projects p
      LEFT JOIN project_stats ps ON p.id = ps.project_id
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN (
        SELECT 
          entity_id,
          COUNT(*) FILTER (WHERE event_type = 'project_view') as view_count
        FROM analytics_events
        WHERE entity_type = 'project' ${eventDateFilter || ''}
        GROUP BY entity_id
      ) view_counts ON p.id = view_counts.entity_id
      LEFT JOIN (
        SELECT 
          entity_id,
          COUNT(*) FILTER (WHERE event_type = 'email_click') as email_clicks,
          COUNT(*) FILTER (WHERE event_type = 'whatsapp_click') as whatsapp_clicks,
          COUNT(*) FILTER (WHERE event_type = 'phone_click') as phone_clicks
        FROM analytics_events
        WHERE entity_type = 'project' ${eventDateFilter || ''}
        GROUP BY entity_id
      ) click_counts ON p.id = click_counts.entity_id
      WHERE p.status = 'active' ${dateFilter || ''}
      ORDER BY COALESCE(view_counts.view_count, ps.views, 0) DESC
      LIMIT $${paramIndex}
    `;
    values.push(limit);
    const res = await query(text, values);
    return res.rows;
  }

  /**
   * Get agent performance metrics (using analytics_events for accurate date filtering)
   */
  static async getAgentPerformance({ dateFrom = null, dateTo = null } = {}) {
    const values = [];
    let paramIndex = 1;
    let eventDateFilter = '';

    if (dateFrom) {
      eventDateFilter = ` AND ae.created_at >= $${paramIndex}::date`;
      values.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      eventDateFilter += ` AND ae.created_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      values.push(dateTo);
      paramIndex++;
    }

    // Use analytics_events for accurate date filtering
    const text = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.profile_picture,
        COUNT(DISTINCT p.id) as property_count,
        COUNT(DISTINCT pr.id) as project_count,
        COALESCE(SUM(CASE WHEN ae.event_type = 'property_view' AND ae.entity_type = 'property' THEN 1 ELSE 0 END), 0) as total_property_views,
        COALESCE(SUM(CASE WHEN ae.event_type = 'project_view' AND ae.entity_type = 'project' THEN 1 ELSE 0 END), 0) as total_project_views,
        COALESCE(SUM(CASE WHEN (ae.event_type = 'property_view' AND ae.entity_type = 'property') OR (ae.event_type = 'project_view' AND ae.entity_type = 'project') THEN 1 ELSE 0 END), 0) as total_views,
        COALESCE(SUM(CASE WHEN ae.event_type = 'email_click' THEN 1 ELSE 0 END), 0) as total_email_clicks,
        COALESCE(SUM(CASE WHEN ae.event_type = 'whatsapp_click' THEN 1 ELSE 0 END), 0) as total_whatsapp_clicks,
        COALESCE(SUM(CASE WHEN ae.event_type = 'phone_click' THEN 1 ELSE 0 END), 0) as total_phone_clicks
      FROM users u
      LEFT JOIN properties p ON u.id = p.agent_id AND p.status = 'active'
      LEFT JOIN projects pr ON u.id = pr.agent_id AND pr.status = 'active'
      LEFT JOIN analytics_events ae ON (
        (ae.entity_type = 'property' AND ae.entity_id = p.id) OR
        (ae.entity_type = 'project' AND ae.entity_id = pr.id)
      ) ${eventDateFilter}
      WHERE u.role IN ('Admin', 'SuperAdmin') AND u.approved = true
      GROUP BY u.id, u.name, u.email, u.profile_picture
      HAVING COUNT(DISTINCT p.id) > 0 OR COUNT(DISTINCT pr.id) > 0
      ORDER BY total_views DESC
    `;
    
    let res;
    try {
      res = await query(text, values);
      // If we got results, return them
      if (res.rows.length > 0 || (dateFrom || dateTo)) {
        return res.rows;
      }
    } catch (err) {
      // If analytics_events doesn't exist, fall through to stats
    }
    
    // Fallback to stats (less accurate for date filtering)
    const fallbackValues = [];
    let fallbackParamIndex = 1;
    let psDateFilter = '';
    let pstDateFilter = '';

    if (dateFrom) {
      psDateFilter = ` AND ps.last_updated >= $${fallbackParamIndex}::date`;
      pstDateFilter = ` AND pst.last_updated >= $${fallbackParamIndex}::date`;
      fallbackValues.push(dateFrom);
      fallbackParamIndex++;
    }
    if (dateTo) {
      psDateFilter += ` AND ps.last_updated < ($${fallbackParamIndex}::date + INTERVAL '1 day')`;
      pstDateFilter += ` AND pst.last_updated < ($${fallbackParamIndex}::date + INTERVAL '1 day')`;
      fallbackValues.push(dateTo);
      fallbackParamIndex++;
    }

    const fallbackText = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.profile_picture,
        COUNT(DISTINCT p.id) as property_count,
        COUNT(DISTINCT pr.id) as project_count,
        COALESCE(SUM(CASE WHEN ps.property_id IS NOT NULL THEN ps.views ELSE 0 END), 0) as total_property_views,
        COALESCE(SUM(CASE WHEN pst.project_id IS NOT NULL THEN pst.views ELSE 0 END), 0) as total_project_views,
        COALESCE(SUM(CASE WHEN ps.property_id IS NOT NULL THEN ps.views ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN pst.project_id IS NOT NULL THEN pst.views ELSE 0 END), 0) as total_views,
        COALESCE(SUM(CASE WHEN ps.property_id IS NOT NULL THEN ps.email_clicks ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN pst.project_id IS NOT NULL THEN pst.email_clicks ELSE 0 END), 0) as total_email_clicks,
        COALESCE(SUM(CASE WHEN ps.property_id IS NOT NULL THEN ps.whatsapp_clicks ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN pst.project_id IS NOT NULL THEN pst.whatsapp_clicks ELSE 0 END), 0) as total_whatsapp_clicks,
        COALESCE(SUM(CASE WHEN ps.property_id IS NOT NULL THEN ps.phone_clicks ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN pst.project_id IS NOT NULL THEN pst.phone_clicks ELSE 0 END), 0) as total_phone_clicks
      FROM users u
      LEFT JOIN properties p ON u.id = p.agent_id AND p.status = 'active'
      LEFT JOIN projects pr ON u.id = pr.agent_id AND pr.status = 'active'
      LEFT JOIN property_stats ps ON p.id = ps.property_id ${psDateFilter}
      LEFT JOIN project_stats pst ON pr.id = pst.project_id ${pstDateFilter}
      WHERE u.role IN ('Admin', 'SuperAdmin') AND u.approved = true
      GROUP BY u.id, u.name, u.email, u.profile_picture
      HAVING COUNT(DISTINCT p.id) > 0 OR COUNT(DISTINCT pr.id) > 0
      ORDER BY total_views DESC
    `;
    res = await query(fallbackText, fallbackValues);
    return res.rows;
  }

  /**
   * Get location analytics (using analytics_events for accurate date filtering)
   */
  static async getLocationAnalytics({ dateFrom = null, dateTo = null } = {}) {
    const values = [];
    let paramIndex = 1;
    let eventDateFilter = '';

    if (dateFrom) {
      eventDateFilter = ` AND ae.created_at >= $${paramIndex}::date`;
      values.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      eventDateFilter += ` AND ae.created_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      values.push(dateTo);
      paramIndex++;
    }

    // Use analytics_events for accurate date filtering
    const text = `
      SELECT 
        COALESCE(p.country, pr.country) as country,
        COALESCE(p.city, pr.city) as city,
        COUNT(DISTINCT p.id) as property_count,
        COUNT(DISTINCT pr.id) as project_count,
        COALESCE(SUM(CASE WHEN ae.event_type = 'property_view' AND ae.entity_type = 'property' THEN 1 ELSE 0 END), 0) as property_views,
        COALESCE(SUM(CASE WHEN ae.event_type = 'project_view' AND ae.entity_type = 'project' THEN 1 ELSE 0 END), 0) as project_views,
        COALESCE(SUM(CASE WHEN (ae.event_type = 'property_view' AND ae.entity_type = 'property') OR (ae.event_type = 'project_view' AND ae.entity_type = 'project') THEN 1 ELSE 0 END), 0) as total_views
      FROM properties p
      FULL OUTER JOIN projects pr ON p.country = pr.country AND p.city = pr.city
      LEFT JOIN analytics_events ae ON (
        (ae.entity_type = 'property' AND ae.entity_id = p.id) OR
        (ae.entity_type = 'project' AND ae.entity_id = pr.id)
      ) ${eventDateFilter}
      WHERE (p.status = 'active' OR pr.status = 'active' OR (p.id IS NULL AND pr.id IS NULL))
      GROUP BY COALESCE(p.country, pr.country), COALESCE(p.city, pr.city)
      HAVING COUNT(DISTINCT p.id) > 0 OR COUNT(DISTINCT pr.id) > 0
      ORDER BY total_views DESC
    `;
    
    let res;
    try {
      res = await query(text, values);
      // If we got results or date filter is applied, return them
      if (res.rows.length > 0 || (dateFrom || dateTo)) {
        return res.rows;
      }
    } catch (err) {
      // If analytics_events doesn't exist, fall through to stats
    }
    
    // Fallback to stats (less accurate for date filtering)
    const fallbackValues = [];
    let fallbackParamIndex = 1;
    let psDateFilter = '';
    let pstDateFilter = '';

    if (dateFrom) {
      psDateFilter = ` AND ps.last_updated >= $${fallbackParamIndex}::date`;
      pstDateFilter = ` AND pst.last_updated >= $${fallbackParamIndex}::date`;
      fallbackValues.push(dateFrom);
      fallbackParamIndex++;
    }
    if (dateTo) {
      psDateFilter += ` AND ps.last_updated < ($${fallbackParamIndex}::date + INTERVAL '1 day')`;
      pstDateFilter += ` AND pst.last_updated < ($${fallbackParamIndex}::date + INTERVAL '1 day')`;
      fallbackValues.push(dateTo);
      fallbackParamIndex++;
    }

    const fallbackText = `
      SELECT 
        COALESCE(p.country, pr.country) as country,
        COALESCE(p.city, pr.city) as city,
        COUNT(DISTINCT p.id) as property_count,
        COUNT(DISTINCT pr.id) as project_count,
        COALESCE(SUM(CASE WHEN ps.property_id IS NOT NULL THEN ps.views ELSE 0 END), 0) as property_views,
        COALESCE(SUM(CASE WHEN pst.project_id IS NOT NULL THEN pst.views ELSE 0 END), 0) as project_views,
        COALESCE(SUM(CASE WHEN ps.property_id IS NOT NULL THEN ps.views ELSE 0 END), 0) + 
        COALESCE(SUM(CASE WHEN pst.project_id IS NOT NULL THEN pst.views ELSE 0 END), 0) as total_views
      FROM properties p
      FULL OUTER JOIN projects pr ON p.country = pr.country AND p.city = pr.city
      LEFT JOIN property_stats ps ON p.id = ps.property_id ${psDateFilter}
      LEFT JOIN project_stats pst ON pr.id = pst.project_id ${pstDateFilter}
      WHERE (p.status = 'active' OR pr.status = 'active' OR (p.id IS NULL AND pr.id IS NULL))
      GROUP BY COALESCE(p.country, pr.country), COALESCE(p.city, pr.city)
      HAVING COUNT(DISTINCT p.id) > 0 OR COUNT(DISTINCT pr.id) > 0
      ORDER BY total_views DESC
    `;
    res = await query(fallbackText, fallbackValues);
    return res.rows;
  }

  /**
   * Get time-based analytics (views over time)
   */
  static async getTimeBasedAnalytics({ entityType = null, dateFrom = null, dateTo = null, groupBy = 'day' } = {}) {
    let dateFilter = '';
    const values = [];
    let paramIndex = 1;
    let entityFilter = '';

    if (dateFrom) {
      dateFilter += ` AND created_at >= $${paramIndex}::date`;
      values.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      dateFilter += ` AND created_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      values.push(dateTo);
      paramIndex++;
    }
    if (entityType) {
      entityFilter = ` AND entity_type = $${paramIndex}`;
      values.push(entityType);
      paramIndex++;
    }

    let groupByClause = '';
    if (groupBy === 'day') {
      groupByClause = `DATE(created_at)`;
    } else if (groupBy === 'week') {
      groupByClause = `DATE_TRUNC('week', created_at)`;
    } else if (groupBy === 'month') {
      groupByClause = `DATE_TRUNC('month', created_at)`;
    }

    const text = `
      SELECT 
        ${groupByClause} as period,
        event_type,
        COUNT(*) as event_count
      FROM analytics_events
      WHERE 1=1 ${dateFilter} ${entityFilter}
      GROUP BY ${groupByClause}, event_type
      ORDER BY period DESC, event_type
    `;
    const res = await query(text, values);
    return res.rows;
  }

  /**
   * Get total views across all properties and projects (filtered by date range)
   */
  static async getTotalViews({ dateFrom = null, dateTo = null } = {}) {
    // First try to get from analytics_events (most accurate)
    const eventValues = [];
    let eventParamIndex = 1;
    let eventDateFilter = '';

    if (dateFrom) {
      eventDateFilter = ` AND created_at >= $${eventParamIndex}::date`;
      eventValues.push(dateFrom);
      eventParamIndex++;
    }
    if (dateTo) {
      eventDateFilter += ` AND created_at < ($${eventParamIndex}::date + INTERVAL '1 day')`;
      eventValues.push(dateTo);
      eventParamIndex++;
    }

    const eventQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE event_type = 'property_view' AND entity_type = 'property') as property_views,
        COUNT(*) FILTER (WHERE event_type = 'project_view' AND entity_type = 'project') as project_views,
        COUNT(*) FILTER (WHERE (event_type = 'property_view' AND entity_type = 'property') OR (event_type = 'project_view' AND entity_type = 'project')) as total_views
      FROM analytics_events
      WHERE 1=1 ${eventDateFilter}
    `;
    
    try {
      const eventRes = await query(eventQuery, eventValues);
      const eventRow = eventRes.rows[0] || {};
      const totalFromEvents = Number(eventRow.total_views || 0);
      
      // If we have data from analytics_events OR if a date filter is applied, use it
      // (even if 0, because that means no views in that period)
      if (totalFromEvents > 0 || dateFrom || dateTo) {
        return {
          property_views: Number(eventRow.property_views || 0),
          project_views: Number(eventRow.project_views || 0),
          total_views: totalFromEvents
        };
      }
    } catch (err) {
      // If analytics_events table doesn't exist or has issues, fall through to stats
    }
    
    // Fallback to stats tables with date filtering
    // Note: When using stats, date filtering is based on last_updated which only shows
    // when the last view occurred. This is less accurate than analytics_events but
    // still provides some date-based filtering.
    const propertyValues = [];
    const projectValues = [];
    let psWhereFilter = '';
    let pstWhereFilter = '';
    let fallbackParamIndex = 1;

    if (dateFrom) {
      psWhereFilter = ` AND last_updated >= $${fallbackParamIndex}::date`;
      pstWhereFilter = ` AND last_updated >= $${fallbackParamIndex}::date`;
      propertyValues.push(dateFrom);
      projectValues.push(dateFrom);
      fallbackParamIndex++;
    }
    if (dateTo) {
      psWhereFilter += ` AND last_updated < ($${fallbackParamIndex}::date + INTERVAL '1 day')`;
      pstWhereFilter += ` AND last_updated < ($${fallbackParamIndex}::date + INTERVAL '1 day')`;
      propertyValues.push(dateTo);
      projectValues.push(dateTo);
    }

    const propertyQuery = `
      SELECT COALESCE(SUM(views), 0) as views
      FROM property_stats
      WHERE 1=1 ${psWhereFilter}
    `;
    
    const projectQuery = `
      SELECT COALESCE(SUM(views), 0) as views
      FROM project_stats
      WHERE 1=1 ${pstWhereFilter}
    `;
    
    const [propertyRes, projectRes] = await Promise.all([
      query(propertyQuery, propertyValues),
      query(projectQuery, projectValues)
    ]);
    
    const propertyViews = Number(propertyRes.rows[0]?.views || 0);
    const projectViews = Number(projectRes.rows[0]?.views || 0);
    
    return {
      property_views: propertyViews,
      project_views: projectViews,
      total_views: propertyViews + projectViews
    };
  }

  /**
   * Get conversion metrics (views to leads)
   */
  static async getConversionMetrics({ dateFrom = null, dateTo = null } = {}) {
    const values = [];
    let paramIndex = 1;
    let psWhereFilter = '';
    let pstWhereFilter = '';
    let leadsJoinFilter1 = '';
    let leadsJoinFilter2 = '';

    if (dateFrom) {
      psWhereFilter = ` AND ps.last_updated >= $${paramIndex}::date`;
      pstWhereFilter = ` AND pst.last_updated >= $${paramIndex}::date`;
      leadsJoinFilter1 = ` AND l.created_at >= $${paramIndex}::date`;
      leadsJoinFilter2 = ` AND l2.created_at >= $${paramIndex}::date`;
      values.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      psWhereFilter += ` AND ps.last_updated < ($${paramIndex}::date + INTERVAL '1 day')`;
      pstWhereFilter += ` AND pst.last_updated < ($${paramIndex}::date + INTERVAL '1 day')`;
      leadsJoinFilter1 += ` AND l.created_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      leadsJoinFilter2 += ` AND l2.created_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      values.push(dateTo);
      paramIndex++;
    }

    const text = `
      SELECT 
        'property' as entity_type,
        COUNT(DISTINCT ps.property_id) as total_entities,
        COALESCE(SUM(ps.views), 0) as total_views,
        COUNT(DISTINCT l.id) as total_leads,
        CASE 
          WHEN COALESCE(SUM(ps.views), 0) > 0 
          THEN ROUND((COUNT(DISTINCT l.id)::numeric / COALESCE(SUM(ps.views), 1)) * 100, 2)
          ELSE 0
        END as conversion_rate
      FROM property_stats ps
      LEFT JOIN leads l ON ps.property_id = l.property_id ${leadsJoinFilter1}
      WHERE 1=1 ${psWhereFilter}
      
      UNION ALL
      
      SELECT 
        'project' as entity_type,
        COUNT(DISTINCT pst.project_id) as total_entities,
        COALESCE(SUM(pst.views), 0) as total_views,
        COUNT(DISTINCT l2.id) as total_leads,
        CASE 
          WHEN COALESCE(SUM(pst.views), 0) > 0 
          THEN ROUND((COUNT(DISTINCT l2.id)::numeric / COALESCE(SUM(pst.views), 1)) * 100, 2)
          ELSE 0
        END as conversion_rate
      FROM project_stats pst
      LEFT JOIN leads l2 ON pst.project_id = l2.project_id ${leadsJoinFilter2}
      WHERE 1=1 ${pstWhereFilter}
    `;
    const res = await query(text, values);
    return res.rows;
  }
}

module.exports = Analytics;

