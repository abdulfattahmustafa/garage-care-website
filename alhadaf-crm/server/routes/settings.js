const express = require('express');
const router = express.Router();
const { logActivity } = require('../lib/activity');

const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'select'];

router.get('/', (req, res) => {
  const db = req.db;
  const salespeople = db.prepare('SELECT * FROM salespeople ORDER BY name').all();
  const appSettings = db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
  const customFields = db.prepare('SELECT * FROM custom_fields ORDER BY entity_type, id').all();
  res.render('settings', { salespeople, appSettings, customFields, error: req.query.error || null });
});

router.post('/auto-assign', (req, res) => {
  const db = req.db;
  const enabled = req.body.enabled === '1' ? 1 : 0;
  db.prepare('UPDATE app_settings SET auto_assign_prospects = ? WHERE id = 1').run(enabled);
  logActivity(req, enabled ? 'تفعيل التوزيع التلقائي للعملاء المحتملين' : 'إيقاف التوزيع التلقائي للعملاء المحتملين', {});
  res.redirect('/settings');
});

router.post('/salespeople', (req, res) => {
  const db = req.db;
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.redirect('/settings?error=' + encodeURIComponent('اكتب اسم البائع أولاً'));
  }
  const existing = db.prepare('SELECT 1 FROM salespeople WHERE name = ?').get(name);
  if (existing) {
    return res.redirect('/settings?error=' + encodeURIComponent('هذا الاسم موجود أصلاً بالقائمة'));
  }
  const info = db.prepare('INSERT INTO salespeople (name, is_demo, created_at) VALUES (?, 0, ?)')
    .run(name, new Date().toISOString());
  logActivity(req, 'إضافة بائع', { entityType: 'salesperson', entityId: info.lastInsertRowid, details: name });
  res.redirect('/settings');
});

router.post('/salespeople/:id/delete', (req, res) => {
  const db = req.db;
  const sp = db.prepare('SELECT * FROM salespeople WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM salespeople WHERE id = ?').run(req.params.id);
  if (sp) logActivity(req, 'حذف بائع', { entityType: 'salesperson', entityId: req.params.id, details: sp.name });
  res.redirect('/settings');
});

router.post('/custom-fields', (req, res) => {
  const db = req.db;
  const label = (req.body.label || '').trim();
  const entityType = ['customer', 'prospect'].includes(req.body.entity_type) ? req.body.entity_type : null;
  const fieldType = CUSTOM_FIELD_TYPES.includes(req.body.field_type) ? req.body.field_type : null;
  const required = req.body.required === '1' ? 1 : 0;
  const options = (req.body.options || '').trim();

  if (!label || !entityType || !fieldType) {
    return res.redirect('/settings?error=' + encodeURIComponent('عبّي كل الحقول المطلوبة'));
  }
  if (fieldType === 'select' && !options) {
    return res.redirect('/settings?error=' + encodeURIComponent('اكتب خيارات القائمة مفصولة بفاصلة'));
  }

  const info = db.prepare('INSERT INTO custom_fields (entity_type, label, field_type, options, required, created_at) VALUES (?,?,?,?,?,?)')
    .run(entityType, label, fieldType, fieldType === 'select' ? options : null, required, new Date().toISOString());
  logActivity(req, 'إضافة حقل مخصص', { entityType: 'custom_field', entityId: info.lastInsertRowid, details: label });
  res.redirect('/settings');
});

router.post('/custom-fields/:id/delete', (req, res) => {
  const db = req.db;
  const f = db.prepare('SELECT * FROM custom_fields WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM custom_fields WHERE id = ?').run(req.params.id);
  if (f) logActivity(req, 'حذف حقل مخصص', { entityType: 'custom_field', entityId: req.params.id, details: f.label });
  res.redirect('/settings');
});

module.exports = router;
