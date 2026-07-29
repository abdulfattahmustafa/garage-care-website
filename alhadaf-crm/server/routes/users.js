const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { logActivity } = require('../lib/activity');

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, name, username, is_active, created_at FROM users ORDER BY name').all();
  res.render('users', { users, error: req.query.error || null });
});

router.post('/', (req, res) => {
  const name = (req.body.name || '').trim();
  const username = (req.body.username || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!name || !username || !password) {
    return res.redirect('/users?error=' + encodeURIComponent('عبّي كل الحقول (الاسم، اسم المستخدم، كلمة المرور)'));
  }
  if (!/^[a-z0-9_.]+$/.test(username)) {
    return res.redirect('/users?error=' + encodeURIComponent('اسم المستخدم لازم يكون حروف إنجليزية وأرقام بس (بدون مسافات)'));
  }
  if (password.length < 4) {
    return res.redirect('/users?error=' + encodeURIComponent('كلمة المرور لازم تكون 4 خانات على الأقل'));
  }
  const existing = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.redirect('/users?error=' + encodeURIComponent('اسم المستخدم هذا مستخدم أصلاً'));
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, username, password_hash, is_active, created_at) VALUES (?,?,?,1,?)')
    .run(name, username, hash, new Date().toISOString());
  logActivity(req, 'إضافة مستخدم', { entityType: 'user', entityId: info.lastInsertRowid, details: `${name} (${username})` });
  res.redirect('/users');
});

router.post('/:id/toggle', (req, res) => {
  if (String(req.params.id) === String(req.session.userId)) {
    return res.redirect('/users?error=' + encodeURIComponent('ما تقدر تعطّل حسابك انت نفسك وأنت داخل فيه'));
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.redirect('/users');
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, req.params.id);
  logActivity(req, user.is_active ? 'تعطيل مستخدم' : 'تفعيل مستخدم', { entityType: 'user', entityId: user.id, details: user.name });
  res.redirect('/users');
});

router.post('/:id/reset-password', (req, res) => {
  const password = req.body.password || '';
  if (password.length < 4) {
    return res.redirect('/users?error=' + encodeURIComponent('كلمة المرور لازم تكون 4 خانات على الأقل'));
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.redirect('/users');
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  logActivity(req, 'إعادة تعيين كلمة مرور', { entityType: 'user', entityId: user.id, details: user.name });
  res.redirect('/users');
});

router.post('/:id/delete', (req, res) => {
  if (String(req.params.id) === String(req.session.userId)) {
    return res.redirect('/users?error=' + encodeURIComponent('ما تقدر تحذف حسابك انت نفسك وأنت داخل فيه'));
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (user) {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    logActivity(req, 'حذف مستخدم', { entityType: 'user', entityId: user.id, details: user.name });
  }
  res.redirect('/users');
});

module.exports = router;
