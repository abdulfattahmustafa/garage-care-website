require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const db = require('./db'); // ensure DB + schema are initialized
const { logActivity } = require('./lib/activity');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || 'alhadaf2026';
const SESSION_SECRET = process.env.SESSION_SECRET || 'alhadaf-crm-secret';

// First run: seed a single "المدير" account from APP_PASSWORD so the
// existing shared-password owners can still log in immediately, then
// create named accounts for staff from the "المستخدمون" page.
const hasAnyUser = db.prepare('SELECT 1 FROM users LIMIT 1').get();
if (!hasAnyUser) {
  db.prepare('INSERT INTO users (name, username, password_hash, is_active, created_at) VALUES (?,?,?,1,?)')
    .run('المدير', 'admin', bcrypt.hashSync(APP_PASSWORD, 10), new Date().toISOString());
}

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
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

app.locals.util = require('./lib/util');

// --- Auth routes ---
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/');
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const username = (req.body.username || '').trim().toLowerCase();
  const password = req.body.password || '';
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.render('login', { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  req.session.userId = user.id;
  req.session.userName = user.name;
  logActivity(req, 'تسجيل دخول', {});
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// --- Protected routes ---
app.use(requireAuth);

app.use((req, res, next) => {
  res.locals.currentUserName = req.session.userName;
  res.locals.currentUserId = req.session.userId;
  next();
});

app.use('/', require('./routes/dashboard'));
app.use('/customers', require('./routes/customers'));
app.use('/sop', require('./routes/sop'));
app.use('/data', require('./routes/data'));
app.use('/settings', require('./routes/settings'));
app.use('/cars', require('./routes/cars'));
app.use('/users', require('./routes/users'));
app.use('/prospects', require('./routes/prospects'));
app.use('/activity', require('./routes/activity'));

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`\n✅ نظام إدارة علاقات العملاء - معرض الهدف الأميز يعمل الآن`);
  console.log(`🔗 افتح المتصفح على: http://localhost:${PORT}\n`);
});
