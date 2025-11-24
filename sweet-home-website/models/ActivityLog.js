// models/ActivityLog.js
const { query } = require('../config/db');

class ActivityLog {
  /**
   * Log an activity
   * @param {Object} data - Activity data
   * @param {string} data.actionType - 'property_created', 'property_updated', 'property_deleted', 'project_created', 'project_updated', 'project_deleted'
   * @param {string} data.entityType - 'property' or 'project'
   * @param {number} data.entityId - ID of the property/project
   * @param {string} data.entityTitle - Title of the property/project
   * @param {number} data.userId - ID of the user who performed the action
   * @param {string} data.userName - Name of the user
   */
  static async log({ actionType, entityType, entityId, entityTitle, userId, userName }) {
    const text = `
      INSERT INTO activity_logs (action_type, entity_type, entity_id, entity_title, user_id, user_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [actionType, entityType, entityId, entityTitle, userId, userName];
    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Get all activity logs with optional filters, ordered by most recent first
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of logs to return
   * @param {number} options.offset - Offset for pagination
   * @param {string} options.actionType - Filter by action type (e.g., 'property_created', 'project_updated')
   * @param {string} options.entityType - Filter by entity type ('property' or 'project')
   * @param {number} options.userId - Filter by user ID
   * @param {string} options.search - Search in entity_title
   * @param {string} options.dateFrom - Filter from date (YYYY-MM-DD)
   * @param {string} options.dateTo - Filter to date (YYYY-MM-DD)
   */
  static async findAll({ 
    limit = 100, 
    offset = 0,
    actionType = null,
    entityType = null,
    userId = null,
    search = null,
    dateFrom = null,
    dateTo = null
  } = {}) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (actionType) {
      conditions.push(`al.action_type = $${paramIndex}`);
      values.push(actionType);
      paramIndex++;
    }

    if (entityType) {
      conditions.push(`al.entity_type = $${paramIndex}`);
      values.push(entityType);
      paramIndex++;
    }

    if (userId) {
      conditions.push(`al.user_id = $${paramIndex}`);
      values.push(userId);
      paramIndex++;
    }

    if (search && search.trim()) {
      conditions.push(`LOWER(al.entity_title) LIKE LOWER($${paramIndex})`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`al.created_at >= $${paramIndex}::date`);
      values.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      // Add one day to include the entire end date
      conditions.push(`al.created_at < ($${paramIndex}::date + INTERVAL '1 day')`);
      values.push(dateTo);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const text = `
      SELECT 
        al.*,
        u.name as current_user_name,
        u.email as current_user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    const res = await query(text, values);
    return res.rows;
  }

  /**
   * Get total count of activity logs with optional filters
   * @param {Object} options - Filter options (same as findAll)
   */
  static async count({ 
    actionType = null,
    entityType = null,
    userId = null,
    search = null,
    dateFrom = null,
    dateTo = null
  } = {}) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Build WHERE conditions (same logic as findAll)
    if (actionType) {
      conditions.push(`action_type = $${paramIndex}`);
      values.push(actionType);
      paramIndex++;
    }

    if (entityType) {
      conditions.push(`entity_type = $${paramIndex}`);
      values.push(entityType);
      paramIndex++;
    }

    if (userId) {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(userId);
      paramIndex++;
    }

    if (search && search.trim()) {
      conditions.push(`LOWER(entity_title) LIKE LOWER($${paramIndex})`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`created_at >= $${paramIndex}::date`);
      values.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`created_at < ($${paramIndex}::date + INTERVAL '1 day')`);
      values.push(dateTo);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const text = `SELECT COUNT(*) as total FROM activity_logs ${whereClause}`;
    const res = await query(text, values);
    return parseInt(res.rows[0].total, 10);
  }

  /**
   * Get distinct users who have performed actions (for filter dropdown)
   */
  static async getDistinctUsers() {
    const text = `
      SELECT DISTINCT 
        al.user_id,
        al.user_name,
        u.name as current_user_name,
        u.email,
        COALESCE(u.name, al.user_name) as display_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id IS NOT NULL
      ORDER BY display_name ASC
    `;
    const res = await query(text);
    return res.rows;
  }
}

module.exports = ActivityLog;

