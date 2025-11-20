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
   * Get all activity logs, ordered by most recent first
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of logs to return
   * @param {number} options.offset - Offset for pagination
   */
  static async findAll({ limit = 100, offset = 0 } = {}) {
    const text = `
      SELECT 
        al.*,
        u.name as current_user_name,
        u.email as current_user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const values = [limit, offset];
    const res = await query(text, values);
    return res.rows;
  }

  /**
   * Get total count of activity logs
   */
  static async count() {
    const res = await query('SELECT COUNT(*) as total FROM activity_logs');
    return parseInt(res.rows[0].total, 10);
  }
}

module.exports = ActivityLog;

