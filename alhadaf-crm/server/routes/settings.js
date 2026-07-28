const express = require('express');
const router = express.Router();
const db = require('../db');

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
  db.prepare('INSERT INTO salespeople (name, is_demo, created_at) VALUES (?, 0, ?)')
    .run(name, new Date().toISOString());
  res.redirect('/settings');
});

router.post('/salespeople/:id/delete', (req, res) => {
  db.prepare('DELETE FROM salespeople WHERE id = ?').run(req.params.id);
  res.redirect('/settings');
});

module.exports = router;
