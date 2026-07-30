const express = require('express');
const router = express.Router();
const { logActivity } = require('../lib/activity');
const { validatePhone } = require('../lib/util');

const STAGES = ['جديد', 'تواصل أولي', 'زار المعرض', 'تجربة قيادة', 'تفاوض على السعر', 'لم يتم البيع', 'تحوّل لعميل'];
const TERMINAL_STAGES = ['لم يتم البيع', 'تحوّل لعميل'];
const SOURCES = ['زيارة مباشرة', 'اتصال هاتفي', 'إنستقرام', 'سناب شات', 'تيك توك', 'واتساب', 'توصية من عميل', 'موقع إلكتروني', 'أخرى'];
const PAGE_SIZE = 20;

function nowISO() { return new Date().toISOString(); }

function getSalespeople(db) {
  return db.prepare(`
    SELECT name FROM salespeople
    UNION
    SELECT salesperson AS name FROM prospects WHERE salesperson IS NOT NULL AND salesperson != ''
    ORDER BY name`)
    .all().map(r => r.name);
}

// Picks the roster salesperson with the fewest currently-open prospects
// (not yet converted or lost) — a simple load-balanced assignment, so new
// leads land on whoever has the lightest active pipeline right now.
function pickAutoAssignee(db) {
  const roster = db.prepare('SELECT name FROM salespeople ORDER BY name').all().map(r => r.name);
  if (!roster.length) return null;

  const openCount = db.prepare(`
    SELECT salesperson, COUNT(*) c FROM prospects
    WHERE stage NOT IN (${TERMINAL_STAGES.map(() => '?').join(',')})
    GROUP BY salesperson`).all(...TERMINAL_STAGES);
  const countByName = Object.fromEntries(openCount.map(r => [r.salesperson, r.c]));

  let best = roster[0];
  let bestCount = countByName[best] || 0;
  for (const name of roster.slice(1)) {
    const c = countByName[name] || 0;
    if (c < bestCount) { best = name; bestCount = c; }
  }
  return best;
}

router.get('/', (req, res) => {
  const db = req.db;
  const { q = '', stage = '', salesperson = '' } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);

  let where = [];
  let params = {};
  if (q) { where.push(`(name LIKE @q OR phone LIKE @q OR interested_car LIKE @q)`); params.q = `%${q}%`; }
  if (stage) { where.push('stage = @stage'); params.stage = stage; }
  if (salesperson) { where.push('salesperson = @salesperson'); params.salesperson = salesperson; }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) c FROM prospects ${whereSql}`).get(params).c;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;

  const rows = db.prepare(`SELECT * FROM prospects ${whereSql} ORDER BY updated_at DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`).all(params);

  res.render('prospects/list', {
    rows, total, totalPages, page: safePage,
    q, stage, salesperson,
    STAGES, salespeople: getSalespeople(db),
  });
});

router.get('/new', (req, res) => {
  res.render('prospects/form', { prospect: null, errors: {}, STAGES, SOURCES, salespeople: getSalespeople(req.db) });
});

function validateBody(body) {
  const errors = {};
  if (!body.name || !body.name.trim()) errors.name = 'اسم العميل المحتمل إلزامي';
  if (body.phone && !validatePhone(body.phone)) errors.phone = 'الجوال لازم يبدأ بـ 05 ويتكون من 10 أرقام';
  return errors;
}

router.post('/', (req, res) => {
  const db = req.db;
  const body = req.body;
  const errors = validateBody(body);
  if (Object.keys(errors).length) {
    return res.status(400).render('prospects/form', { prospect: body, errors, STAGES, SOURCES, salespeople: getSalespeople(db) });
  }

  let salesperson = body.salesperson ? body.salesperson.trim() : '';
  let autoAssigned = false;
  if (!salesperson) {
    const appSettings = db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
    if (appSettings && appSettings.auto_assign_prospects) {
      const picked = pickAutoAssignee(db);
      if (picked) { salesperson = picked; autoAssigned = true; }
    }
  }

  const ts = nowISO();
  const info = db.prepare(`INSERT INTO prospects
    (name, phone, source, interested_car, stage, salesperson, notes, is_demo, created_by, created_at, updated_at)
    VALUES (@name, @phone, @source, @interested_car, @stage, @salesperson, @notes, 0, @created_by, @created_at, @updated_at)`)
    .run({
      name: body.name.trim(),
      phone: body.phone ? body.phone.trim() : null,
      source: body.source || null,
      interested_car: body.interested_car ? body.interested_car.trim() : null,
      stage: STAGES.includes(body.stage) ? body.stage : 'جديد',
      salesperson: salesperson || null,
      notes: body.notes || null,
      created_by: req.session.userName,
      created_at: ts, updated_at: ts,
    });

  logActivity(req, 'إضافة عميل محتمل', { entityType: 'prospect', entityId: info.lastInsertRowid, details: body.name.trim() + (autoAssigned ? ` (توزيع تلقائي على ${salesperson})` : '') });
  res.redirect('/prospects/' + info.lastInsertRowid);
});

router.get('/:id', (req, res) => {
  const db = req.db;
  const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
  if (!prospect) return res.status(404).render('404');
  const logs = db.prepare('SELECT * FROM prospect_log WHERE prospect_id = ? ORDER BY contact_date DESC, id DESC').all(prospect.id);
  res.render('prospects/detail', { prospect, logs, STAGES });
});

router.get('/:id/edit', (req, res) => {
  const db = req.db;
  const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
  if (!prospect) return res.status(404).render('404');
  res.render('prospects/form', { prospect, errors: {}, STAGES, SOURCES, salespeople: getSalespeople(db) });
});

router.post('/:id', (req, res) => {
  const db = req.db;
  const existing = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).render('404');

  const body = req.body;
  const errors = validateBody(body);
  if (Object.keys(errors).length) {
    return res.status(400).render('prospects/form', { prospect: { ...body, id: req.params.id }, errors, STAGES, SOURCES, salespeople: getSalespeople(db) });
  }

  db.prepare(`UPDATE prospects SET
    name=@name, phone=@phone, source=@source, interested_car=@interested_car, stage=@stage,
    salesperson=@salesperson, notes=@notes, updated_at=@updated_at WHERE id=@id`)
    .run({
      name: body.name.trim(),
      phone: body.phone ? body.phone.trim() : null,
      source: body.source || null,
      interested_car: body.interested_car ? body.interested_car.trim() : null,
      stage: STAGES.includes(body.stage) ? body.stage : existing.stage,
      salesperson: body.salesperson ? body.salesperson.trim() : null,
      notes: body.notes || null,
      updated_at: nowISO(),
      id: req.params.id,
    });

  logActivity(req, 'تعديل عميل محتمل', { entityType: 'prospect', entityId: req.params.id, details: body.name.trim() });
  res.redirect('/prospects/' + req.params.id);
});

router.post('/:id/delete', (req, res) => {
  const db = req.db;
  const prospect = db.prepare('SELECT name FROM prospects WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM prospects WHERE id = ?').run(req.params.id);
  if (prospect) logActivity(req, 'حذف عميل محتمل', { entityType: 'prospect', entityId: req.params.id, details: prospect.name });
  res.redirect('/prospects');
});

router.post('/:id/contact', (req, res) => {
  const db = req.db;
  const { contact_date, type, note } = req.body;
  db.prepare('INSERT INTO prospect_log (prospect_id, contact_date, type, note, created_at) VALUES (?,?,?,?,?)')
    .run(req.params.id, contact_date || nowISO().slice(0, 10), type || null, note || null, nowISO());
  db.prepare('UPDATE prospects SET updated_at = ? WHERE id = ?').run(nowISO(), req.params.id);
  logActivity(req, 'إضافة تواصل (عميل محتمل)', { entityType: 'prospect', entityId: req.params.id, details: type || 'تواصل' });
  res.redirect('/prospects/' + req.params.id);
});

module.exports = router;
module.exports.STAGES = STAGES;
