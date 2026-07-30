require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const tenantDb = require('./tenantDb');
const { logActivity } = require('./lib/activity');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'alhadaf-crm-secret';

// One-time transition for installs that ran the earlier single-showroom
// version of this app: if an old data/alhadaf.db exists and no tenant has
// been registered yet, adopt it as the first tenant instead of orphaning
// whatever real data was already entered.
function migrateLegacySingleTenantIfNeeded() {
  const legacyDbPath = path.join(tenantDb.baseDataDir, 'alhadaf.db');
  const alreadyHasTenants = tenantDb.listTenants().length > 0;
  if (!fs.existsSync(legacyDbPath) || alreadyHasTenants) return;

  const slug = 'alhadaf';
  const dir = path.join(tenantDb.baseDataDir, 'tenants', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(legacyDbPath, path.join(dir, 'data.db'));
  ['-wal', '-shm'].forEach(suffix => {
    const p = legacyDbPath + suffix;
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(dir, 'data.db' + suffix));
  });
  const legacyUploads = path.join(tenantDb.baseDataDir, 'uploads');
  if (fs.existsSync(legacyUploads)) {
    fs.cpSync(legacyUploads, path.join(dir, 'uploads'), { recursive: true });
  }

  tenantDb.registerLegacyTenant(slug, 'معرض الهدف الأميز');
  console.log(`\n📦 لقينا بيانات من نسخة سابقة — تم نقلها تلقائيًا. رمز الدخول الجديد لمعرضك: "${slug}"\n`);
}

migrateLegacySingleTenantIfNeeded();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '15mb' })); // needed for JSON backup restore
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.userId && req.session.tenantSlug) return next();
  return res.redirect('/login');
}

// Gates the admin-only pages (settings, users, activity log, backup/restore)
// from regular employee accounts — managers see everything, employees don't.
function requireManager(req, res, next) {
  if (req.session && req.session.userRole === 'manager') return next();
  return res.status(403).render('403');
}

app.locals.util = require('./lib/util');

// --- Public routes (no tenant/session yet) ---
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/');
  res.render('login', { error: null, tenant: req.query.tenant || '' });
});

app.post('/login', (req, res) => {
  const slug = (req.body.tenant || '').trim().toLowerCase();
  const username = (req.body.username || '').trim().toLowerCase();
  const password = req.body.password || '';
  const genericError = 'رمز المعرض أو اسم المستخدم أو كلمة المرور غير صحيح';

  const tenantMeta = tenantDb.getTenantBySlug(slug);
  if (!tenantMeta || !tenantMeta.is_active) {
    return res.render('login', { error: genericError, tenant: slug });
  }

  const db = tenantDb.getTenantDb(slug);
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.render('login', { error: genericError, tenant: slug });
  }

  req.session.tenantSlug = slug;
  req.session.tenantName = tenantMeta.name;
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userRole = user.role;

  req.db = db;
  logActivity(req, 'تسجيل دخول', {});
  res.redirect('/');
});

app.get('/signup', (req, res) => {
  res.render('signup', { error: null, values: {} });
});

app.post('/signup', (req, res) => {
  const showroomName = (req.body.showroom_name || '').trim();
  const slug = (req.body.slug || '').trim().toLowerCase();
  const adminName = (req.body.admin_name || '').trim();
  const username = (req.body.username || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!showroomName || !slug || !adminName || !username || !password) {
    return res.render('signup', { error: 'عبّي كل الحقول', values: req.body });
  }
  if (!/^[a-z0-9_.]+$/.test(username)) {
    return res.render('signup', { error: 'اسم المستخدم لازم يكون حروف إنجليزية وأرقام بس', values: req.body });
  }
  if (password.length < 4) {
    return res.render('signup', { error: 'كلمة المرور لازم تكون 4 خانات على الأقل', values: req.body });
  }

  let db;
  try {
    db = tenantDb.createTenant(slug, showroomName);
  } catch (err) {
    return res.render('signup', { error: err.message, values: req.body });
  }

  const ts = new Date().toISOString();
  // The account that creates a tenant is always its manager — every
  // subsequent account added via /users defaults to 'employee'.
  db.prepare('INSERT INTO users (name, username, password_hash, role, is_active, created_at) VALUES (?,?,?,\'manager\',1,?)')
    .run(adminName, username, bcrypt.hashSync(password, 10), ts);

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  req.session.tenantSlug = slug;
  req.session.tenantName = showroomName;
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userRole = user.role;

  req.db = db;
  logActivity(req, 'إنشاء المعرض', { details: showroomName });
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// --- System-admin routes (platform owner, fully separate from any tenant) ---
app.use('/system-admin', require('./routes/systemAdmin'));

// --- Protected routes ---
app.use(requireAuth);

app.use((req, res, next) => {
  req.db = tenantDb.getTenantDb(req.session.tenantSlug);
  req.tenantSlug = req.session.tenantSlug;
  res.locals.currentUserName = req.session.userName;
  res.locals.currentUserId = req.session.userId;
  res.locals.tenantName = req.session.tenantName;
  res.locals.userRole = req.session.userRole;
  next();
});

app.use('/', require('./routes/dashboard'));
app.use('/customers', require('./routes/customers'));
app.use('/sop', require('./routes/sop'));
app.use('/data', requireManager, require('./routes/data'));
app.use('/settings', requireManager, require('./routes/settings'));
app.use('/cars', require('./routes/cars'));
app.use('/users', requireManager, require('./routes/users'));
app.use('/prospects', require('./routes/prospects'));
app.use('/activity', requireManager, require('./routes/activity'));

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`\n✅ نظام إدارة علاقات العملاء يعمل الآن (متعدد المعارض)`);
  console.log(`🔗 افتح المتصفح على: http://localhost:${PORT}\n`);
});
