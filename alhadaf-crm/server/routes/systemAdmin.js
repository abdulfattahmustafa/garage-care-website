const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const tenantDb = require('../tenantDb');

// Single owner account, defined only via env vars — never stored in any
// tenant's database, and completely decoupled from tenant login/session so a
// leaked tenant password can never grant cross-tenant visibility.
function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function requireSystemAdmin(req, res, next) {
  if (req.session && req.session.isSystemAdmin) return next();
  return res.redirect('/system-admin/login');
}

router.get('/login', (req, res) => {
  if (req.session && req.session.isSystemAdmin) return res.redirect('/system-admin');
  res.render('systemAdminLogin', { error: null });
});

router.post('/login', (req, res) => {
  const configuredUser = process.env.SYSTEM_ADMIN_USERNAME;
  const configuredPass = process.env.SYSTEM_ADMIN_PASSWORD;
  const genericError = 'اسم المستخدم أو كلمة المرور غير صحيح';

  if (!configuredUser || !configuredPass) {
    return res.render('systemAdminLogin', { error: 'حساب مدير النظام غير مُعدّ بعد — أضف SYSTEM_ADMIN_USERNAME و SYSTEM_ADMIN_PASSWORD في ملف .env' });
  }

  const username = req.body.username || '';
  const password = req.body.password || '';
  if (!safeEqual(username, configuredUser) || !safeEqual(password, configuredPass)) {
    return res.render('systemAdminLogin', { error: genericError });
  }

  req.session.isSystemAdmin = true;
  res.redirect('/system-admin');
});

router.post('/logout', (req, res) => {
  delete req.session.isSystemAdmin;
  res.redirect('/system-admin/login');
});

router.get('/', requireSystemAdmin, (req, res) => {
  const tenants = tenantDb.listTenants().map(t => {
    const db = tenantDb.getTenantDb(t.slug);
    const customerCount = db.prepare('SELECT COUNT(*) c FROM customers').get().c;
    const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
    return { ...t, customerCount, userCount };
  });
  res.render('systemAdmin', { tenants });
});

router.post('/tenants/:slug/toggle', requireSystemAdmin, (req, res) => {
  const tenant = tenantDb.getTenantBySlug(req.params.slug);
  if (tenant) tenantDb.setTenantActive(tenant.slug, !tenant.is_active);
  res.redirect('/system-admin');
});

module.exports = router;
