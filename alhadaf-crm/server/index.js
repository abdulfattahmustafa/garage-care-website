require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const express = require('express');
const session = require('express-session');

require('./db'); // ensure DB + schema are initialized

const app = express();
const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || 'alhadaf2026';
const SESSION_SECRET = process.env.SESSION_SECRET || 'alhadaf-crm-secret';

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
  if (req.session && req.session.authed) return next();
  return res.redirect('/login');
}

app.locals.util = require('./lib/util');

// --- Auth routes ---
app.get('/login', (req, res) => {
  if (req.session && req.session.authed) return res.redirect('/');
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === APP_PASSWORD) {
    req.session.authed = true;
    return res.redirect('/');
  }
  res.render('login', { error: 'كلمة المرور غير صحيحة' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// --- Protected routes ---
app.use(requireAuth);

app.use('/', require('./routes/dashboard'));
app.use('/customers', require('./routes/customers'));
app.use('/sop', require('./routes/sop'));
app.use('/data', require('./routes/data'));

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`\n✅ نظام إدارة علاقات العملاء - معرض الهدف الأميز يعمل الآن`);
  console.log(`🔗 افتح المتصفح على: http://localhost:${PORT}\n`);
});
