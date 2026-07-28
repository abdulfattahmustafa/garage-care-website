const express = require('express');
const router = express.Router();
const db = require('../db');
const { validateNationalId, validateVin, validatePhone, isReportOverdue } = require('../lib/util');

const PAYMENT_METHODS = ['نقدي', 'تمويل (إيجار تمويلي)', 'مرابحة', 'شركات', 'جهات حكومية'];
const STATUSES = ['جديد', 'تم التسليم', 'تمت المتابعة', 'عميل متكرر'];
const PAGE_SIZE = 20;

function nowISO() { return new Date().toISOString(); }

function getSalespeople() {
  return db.prepare(`SELECT DISTINCT salesperson FROM customers WHERE salesperson IS NOT NULL AND salesperson != '' ORDER BY salesperson`)
    .all().map(r => r.salesperson);
}

// --- List with search / filter / sort / pagination ---
router.get('/', (req, res) => {
  const { q = '', payment_method = '', salesperson = '', month = '', status = '' } = req.query;
  const sortCol = ['sale_date', 'customer_name', 'car_type', 'price', 'status'].includes(req.query.sort) ? req.query.sort : 'sale_date';
  const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC';
  const page = Math.max(1, parseInt(req.query.page) || 1);

  let where = [];
  let params = {};

  if (q) {
    where.push(`(customer_name LIKE @q OR national_id LIKE @q OR vin LIKE @q OR estimara_number LIKE @q OR phone LIKE @q OR car_type LIKE @q)`);
    params.q = `%${q}%`;
  }
  if (payment_method) { where.push('payment_method = @payment_method'); params.payment_method = payment_method; }
  if (salesperson) { where.push('salesperson = @salesperson'); params.salesperson = salesperson; }
  if (status) { where.push('status = @status'); params.status = status; }
  if (month) { where.push(`substr(sale_date, 1, 7) = @month`); params.month = month; }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) c FROM customers ${whereSql}`).get(params).c;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;

  const rows = db.prepare(`SELECT * FROM customers ${whereSql} ORDER BY ${sortCol} ${dir} LIMIT ${PAGE_SIZE} OFFSET ${offset}`).all(params);

  res.render('customers/list', {
    rows, total, totalPages, page: safePage,
    q, payment_method, salesperson, month, status,
    sort: sortCol, dir: dir.toLowerCase(),
    PAYMENT_METHODS, STATUSES, salespeople: getSalespeople(),
    isReportOverdue,
  });
});

router.get('/new', (req, res) => {
  res.render('customers/form', { customer: null, errors: {}, PAYMENT_METHODS, STATUSES });
});

function validateBody(body) {
  const errors = {};
  if (!body.customer_name || !body.customer_name.trim()) errors.customer_name = 'اسم العميل إلزامي';
  if (!validateNationalId(body.national_id)) errors.national_id = 'رقم الهوية لازم يكون 10 أرقام بالضبط';
  if (!body.sale_date) errors.sale_date = 'تاريخ البيع إلزامي';
  if (!PAYMENT_METHODS.includes(body.payment_method)) errors.payment_method = 'اختر طريقة دفع صحيحة';
  if (!body.car_type || !body.car_type.trim()) errors.car_type = 'نوع السيارة إلزامي';
  if (!validateVin(body.vin)) errors.vin = 'رقم الهيكل (VIN) لازم يكون 17 خانة (أحرف وأرقام)';
  if (!body.estimara_number || !body.estimara_number.trim()) errors.estimara_number = 'رقم الاستمارة إلزامي';
  if (body.phone && !validatePhone(body.phone)) errors.phone = 'الجوال لازم يبدأ بـ 05 ويتكون من 10 أرقام';
  return errors;
}

router.post('/', (req, res) => {
  const body = req.body;
  const errors = validateBody(body);

  if (!errors.vin) {
    const dupVin = db.prepare('SELECT id FROM customers WHERE vin = ?').get(body.vin.toUpperCase());
    if (dupVin) errors.vin = 'رقم الهيكل هذا مسجل مسبقًا لعميل آخر';
  }
  if (!errors.estimara_number) {
    const dupEst = db.prepare('SELECT id FROM customers WHERE estimara_number = ?').get(body.estimara_number.trim());
    if (dupEst) errors.estimara_number = 'رقم الاستمارة هذا مسجل مسبقًا';
  }

  if (Object.keys(errors).length) {
    return res.status(400).render('customers/form', { customer: body, errors, PAYMENT_METHODS, STATUSES });
  }

  const ts = nowISO();
  const stmt = db.prepare(`INSERT INTO customers
    (customer_name, national_id, sale_date, payment_method, delivery_at, car_type, vin, estimara_number, phone, salesperson, price, notes, status, reported, followup_done, is_demo, created_at, updated_at)
    VALUES (@customer_name, @national_id, @sale_date, @payment_method, @delivery_at, @car_type, @vin, @estimara_number, @phone, @salesperson, @price, @notes, @status, 0, 0, 0, @created_at, @updated_at)`);

  const info = stmt.run({
    customer_name: body.customer_name.trim(),
    national_id: body.national_id.trim(),
    sale_date: body.sale_date,
    payment_method: body.payment_method,
    delivery_at: body.delivery_at || null,
    car_type: body.car_type.trim(),
    vin: body.vin.toUpperCase(),
    estimara_number: body.estimara_number.trim(),
    phone: body.phone ? body.phone.trim() : null,
    salesperson: body.salesperson ? body.salesperson.trim() : null,
    price: body.price ? parseFloat(body.price) : null,
    notes: body.notes || null,
    status: STATUSES.includes(body.status) ? body.status : 'جديد',
    created_at: ts, updated_at: ts,
  });

  res.redirect('/customers/' + info.lastInsertRowid);
});

router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).render('404');
  const contacts = db.prepare('SELECT * FROM contact_log WHERE customer_id = ? ORDER BY contact_date DESC, id DESC').all(customer.id);
  res.render('customers/detail', { customer, contacts, isReportOverdue });
});

router.get('/:id/edit', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).render('404');
  res.render('customers/form', { customer, errors: {}, PAYMENT_METHODS, STATUSES });
});

router.post('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).render('404');

  const body = req.body;
  const errors = validateBody(body);

  if (!errors.vin) {
    const dupVin = db.prepare('SELECT id FROM customers WHERE vin = ? AND id != ?').get(body.vin.toUpperCase(), req.params.id);
    if (dupVin) errors.vin = 'رقم الهيكل هذا مسجل مسبقًا لعميل آخر';
  }
  if (!errors.estimara_number) {
    const dupEst = db.prepare('SELECT id FROM customers WHERE estimara_number = ? AND id != ?').get(body.estimara_number.trim(), req.params.id);
    if (dupEst) errors.estimara_number = 'رقم الاستمارة هذا مسجل مسبقًا';
  }

  if (Object.keys(errors).length) {
    return res.status(400).render('customers/form', { customer: { ...body, id: req.params.id }, errors, PAYMENT_METHODS, STATUSES });
  }

  db.prepare(`UPDATE customers SET
    customer_name=@customer_name, national_id=@national_id, sale_date=@sale_date, payment_method=@payment_method,
    delivery_at=@delivery_at, car_type=@car_type, vin=@vin, estimara_number=@estimara_number, phone=@phone,
    salesperson=@salesperson, price=@price, notes=@notes, status=@status, updated_at=@updated_at
    WHERE id=@id`).run({
    customer_name: body.customer_name.trim(),
    national_id: body.national_id.trim(),
    sale_date: body.sale_date,
    payment_method: body.payment_method,
    delivery_at: body.delivery_at || null,
    car_type: body.car_type.trim(),
    vin: body.vin.toUpperCase(),
    estimara_number: body.estimara_number.trim(),
    phone: body.phone ? body.phone.trim() : null,
    salesperson: body.salesperson ? body.salesperson.trim() : null,
    price: body.price ? parseFloat(body.price) : null,
    notes: body.notes || null,
    status: STATUSES.includes(body.status) ? body.status : existing.status,
    updated_at: nowISO(),
    id: req.params.id,
  });

  res.redirect('/customers/' + req.params.id);
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.redirect('/customers');
});

router.post('/:id/contact', (req, res) => {
  const { contact_date, type, note } = req.body;
  db.prepare('INSERT INTO contact_log (customer_id, contact_date, type, note, created_at) VALUES (?,?,?,?,?)')
    .run(req.params.id, contact_date || nowISO().slice(0, 10), type || null, note || null, nowISO());
  res.redirect('/customers/' + req.params.id);
});

router.post('/:id/followup', (req, res) => {
  const { followup_result, followup_note } = req.body;
  db.prepare(`UPDATE customers SET followup_done=1, followup_result=?, followup_note=?, followup_at=?, updated_at=? WHERE id=?`)
    .run(followup_result || null, followup_note || null, nowISO(), nowISO(), req.params.id);
  res.redirect('/customers/' + req.params.id);
});

router.post('/:id/report', (req, res) => {
  const customer = db.prepare('SELECT reported FROM customers WHERE id = ?').get(req.params.id);
  const newVal = customer.reported ? 0 : 1;
  db.prepare(`UPDATE customers SET reported=?, reported_at=?, updated_at=? WHERE id=?`)
    .run(newVal, newVal ? nowISO() : null, nowISO(), req.params.id);
  res.redirect(req.get('referer') || '/customers/' + req.params.id);
});

module.exports = router;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.STATUSES = STATUSES;
