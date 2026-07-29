const express = require('express');
const router = express.Router();
const db = require('../db');
const { logActivity } = require('../lib/activity');

router.get('/', (req, res) => {
  const salespeople = db.prepare('SELECT * FROM salespeople ORDER BY name').all();
  res.render('settings', { salespeople, error: req.query.error || null });
});

router.post('/salespeople', (req, res) => {
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
  const sp = db.prepare('SELECT * FROM salespeople WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM salespeople WHERE id = ?').run(req.params.id);
  if (sp) logActivity(req, 'حذف بائع', { entityType: 'salesperson', entityId: req.params.id, details: sp.name });
  res.redirect('/settings');
});

module.exports = router;
