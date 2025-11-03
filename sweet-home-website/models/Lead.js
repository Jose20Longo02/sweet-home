// models/Lead.js
const { query } = require('../config/db');

class Lead {
  static async create({ property_id, project_id, agent_id, name, email, phone, message, source = 'property_form', preferred_language, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, page_path, ip_address, user_agent, seller_neighborhood, seller_size, seller_rooms, seller_occupancy_status }) {
    const hasProject = typeof project_id !== 'undefined';
    const hasSellerFields = typeof seller_neighborhood !== 'undefined' || typeof seller_size !== 'undefined' || typeof seller_rooms !== 'undefined' || typeof seller_occupancy_status !== 'undefined';
    
    let text, values;
    if (hasProject && hasSellerFields) {
      text = `INSERT INTO leads (property_id, project_id, agent_id, name, email, phone, message, source, preferred_language, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, page_path, ip_address, user_agent, seller_neighborhood, seller_size, seller_rooms, seller_occupancy_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
        RETURNING *`;
      values = [property_id || null, project_id || null, agent_id || null, name, email, phone || null, message || null, source, preferred_language || null, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, referrer || null, page_path || null, ip_address || null, user_agent || null, seller_neighborhood || null, seller_size || null, seller_rooms || null, seller_occupancy_status || null];
    } else if (hasProject) {
      text = `INSERT INTO leads (property_id, project_id, agent_id, name, email, phone, message, source, preferred_language, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, page_path, ip_address, user_agent)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING *`;
      values = [property_id || null, project_id || null, agent_id || null, name, email, phone || null, message || null, source, preferred_language || null, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, referrer || null, page_path || null, ip_address || null, user_agent || null];
    } else if (hasSellerFields) {
      text = `INSERT INTO leads (property_id, agent_id, name, email, phone, message, source, preferred_language, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, page_path, ip_address, user_agent, seller_neighborhood, seller_size, seller_rooms, seller_occupancy_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        RETURNING *`;
      values = [property_id || null, agent_id || null, name, email, phone || null, message || null, source, preferred_language || null, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, referrer || null, page_path || null, ip_address || null, user_agent || null, seller_neighborhood || null, seller_size || null, seller_rooms || null, seller_occupancy_status || null];
    } else {
      text = `INSERT INTO leads (property_id, agent_id, name, email, phone, message, source, preferred_language, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, page_path, ip_address, user_agent)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING *`;
      values = [property_id || null, agent_id || null, name, email, phone || null, message || null, source, preferred_language || null, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, referrer || null, page_path || null, ip_address || null, user_agent || null];
    }
    const res = await query(text, values);
    return res.rows[0];
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM leads WHERE id = $1', [id]);
    return rows[0];
  }

  static async listForAgent(agentId, { q, status, from, to, propertyId, projectId, leadType, page = 1, pageSize = 20 } = {}) {
    const where = ['l.agent_id = $1'];
    const params = [agentId];
    let idx = 2;
    if (q) { where.push(`(LOWER(l.name) LIKE LOWER($${idx}) OR LOWER(l.email) LIKE LOWER($${idx}) OR LOWER(l.phone) LIKE LOWER($${idx}) OR LOWER(l.message) LIKE LOWER($${idx}))`); params.push(`%${q}%`); idx++; }
    if (status) { where.push(`l.status = $${idx}`); params.push(status); idx++; }
    if (from) { where.push(`l.created_at >= $${idx}`); params.push(from); idx++; }
    if (to) { where.push(`l.created_at <= $${idx}`); params.push(to); idx++; }
    if (propertyId) { where.push(`l.property_id = $${idx}`); params.push(propertyId); idx++; }
    if (projectId) { where.push(`l.project_id = $${idx}`); params.push(projectId); idx++; }
    if (leadType === 'property') { where.push(`l.property_id IS NOT NULL`); }
    if (leadType === 'project')  { where.push(`l.project_id IS NOT NULL`); }

    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));

    const listSql = `
      SELECT l.*, 
             p.title AS property_title, p.slug AS property_slug, p.neighborhood AS property_neighborhood, p.city AS property_city, p.country AS property_country,
             pr.title AS project_title, pr.slug AS project_slug, pr.neighborhood AS project_neighborhood, pr.city AS project_city, pr.country AS project_country
        FROM leads l
        LEFT JOIN properties p ON p.id = l.property_id
        LEFT JOIN projects pr ON pr.id = l.project_id
       WHERE ${where.join(' AND ')}
       ORDER BY l.created_at DESC
       LIMIT ${limit} OFFSET ${offset}
    `;
    const countSql = `SELECT COUNT(*) FROM leads l WHERE ${where.join(' AND ')}`;
    const [listRes, countRes] = await Promise.all([
      query(listSql, params),
      query(countSql, params)
    ]);
    return { rows: listRes.rows, total: parseInt(countRes.rows[0].count, 10) };
  }

  static async listAll({ q, status, from, to, agentId, propertyId, projectId, leadType, leadKind, page = 1, pageSize = 20 } = {}) {
    const where = ['TRUE'];
    const params = [];
    let idx = 1;
    if (q) { where.push(`(LOWER(l.name) LIKE LOWER($${idx}) OR LOWER(l.email) LIKE LOWER($${idx}) OR LOWER(l.phone) LIKE LOWER($${idx}) OR LOWER(l.message) LIKE LOWER($${idx}))`); params.push(`%${q}%`); idx++; }
    if (status) { where.push(`l.status = $${idx}`); params.push(status); idx++; }
    if (from) { where.push(`l.created_at >= $${idx}`); params.push(from); idx++; }
    if (to) { where.push(`l.created_at <= $${idx}`); params.push(to); idx++; }
    if (agentId) { where.push(`l.agent_id = $${idx}`); params.push(agentId); idx++; }
    if (propertyId) { where.push(`l.property_id = $${idx}`); params.push(propertyId); idx++; }
    if (projectId) { where.push(`l.project_id = $${idx}`); params.push(projectId); idx++; }
    if (leadType === 'property') { where.push(`l.property_id IS NOT NULL`); }
    if (leadType === 'project')  { where.push(`l.project_id IS NOT NULL`); }
    // leadKind differentiates buyer/seller/unknown by source, independent of relation type
    if (leadKind === 'buyer')    { where.push(`(l.source = 'property_form' OR l.source = 'project_form')`); }
    if (leadKind === 'seller')   { where.push(`l.source = 'seller_form'`); }
    if (leadKind === 'unknown')  { where.push(`(l.source IS NULL OR l.source NOT IN ('property_form','project_form','seller_form'))`); }
    if (leadType === 'buyer')    { where.push(`(l.source = 'property_form' OR l.source = 'project_form')`); }
    if (leadType === 'seller')   { where.push(`l.source = 'seller_form'`); }
    if (leadType === 'unknown')  { where.push(`(l.source IS NULL OR l.source NOT IN ('property_form','project_form','seller_form'))`); }

    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const listSql = `
      SELECT l.*, 
             p.title AS property_title, p.slug AS property_slug, p.neighborhood AS property_neighborhood, p.city AS property_city, p.country AS property_country,
             pr.title AS project_title, pr.slug AS project_slug, pr.neighborhood AS project_neighborhood, pr.city AS project_city, pr.country AS project_country,
             u.name AS agent_name
        FROM leads l
        LEFT JOIN properties p ON p.id = l.property_id
        LEFT JOIN projects pr ON pr.id = l.project_id
        LEFT JOIN users u ON u.id = l.agent_id
       WHERE ${where.join(' AND ')}
       ORDER BY l.created_at DESC
       LIMIT ${limit} OFFSET ${offset}
    `;
    const countSql = `SELECT COUNT(*) FROM leads l WHERE ${where.join(' AND ')}`;
    const [listRes, countRes] = await Promise.all([
      query(listSql, params),
      query(countSql, params)
    ]);
    return { rows: listRes.rows, total: parseInt(countRes.rows[0].count, 10) };
  }

  static async update(id, fields) {
    const sets = [];
    const params = [];
    let idx = 1;
    for (const [key, value] of Object.entries(fields)) {
      sets.push(`${key} = $${idx++}`);
      params.push(value);
    }
    params.push(id);
    const { rows } = await query(`UPDATE leads SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`, params);
    return rows[0];
  }

  static async remove(id) {
    await query('DELETE FROM leads WHERE id = $1', [id]);
    return true;
  }
}

module.exports = Lead;


