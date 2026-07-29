const db = require('../db');

function logActivity(req, action, { entityType, entityId, details } = {}) {
  const userName = (req.session && req.session.userName) || 'غير معروف';
  db.prepare(`INSERT INTO activity_log (user_name, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(userName, action, entityType || null, entityId || null, details || null, new Date().toISOString());
}

module.exports = { logActivity };
