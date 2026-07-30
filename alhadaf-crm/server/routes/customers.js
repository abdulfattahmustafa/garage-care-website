const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { validateNationalId, validatePhone, isReportOverdue } = require('../lib/util');
const { logActivity } = require('../lib/activity');
const { uploadSingle, getUploadsDir } = require('../lib/upload');

const PAYMENT_METHODS = ['نقدي', 'تمويل', 'شركات', 'جهات حكومية'];
const STATUSES = ['جديد', 'تم التسليم', 'تمت المتابعة', 'عميل متكرر'];
const CUSTOMER_TYPES = ['رخصة واستمارة', 'معارض'];
const PAGE_SIZE = 20;

function nowISO() { return new Date().toISOString(); }

// Merges the managed list (Settings page) with any older free-text names
// already used on existing customer records, so past records never
// disappear from filters even after someone is removed from Settings.
function getSalespeople(db) {
  return db.prepare(`
    SELECT name FROM salespeople
    UNION
    SELECT salesperson AS name FROM customers WHERE salesperson IS NOT NULL AND salesperson != ''
    ORDER BY name`)
    .all().map(r => r.name);
}

function getCarInventory(db) {
  return db.prepare('SELECT * FROM car_inventory ORDER BY brand, model, year, trim, color').all();
}

// --- List with search / filter / sort / pagination ---
router.get('/', (req, res) => {
  const db = req.db;
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
    PAYMENT_METHODS, STATUSES, salespeople: getSalespeople(db),
    isReportOverdue,
  });
});

router.get('/new', (req, res) => {
  const db = req.db;
  let prefill = null;
  if (req.query.from_prospect) {
    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.query.from_prospect);
    if (prospect) {
      prefill = {
        customer_name: prospect.name,
        phone: prospect.phone,
        salesperson: prospect.salesperson,
        car_type: prospect.interested_car,
        from_prospect_id: prospect.id,
      };
    }
  }
  res.render('customers/form', { customer: prefill, errors: {}, PAYMENT_METHODS, STATUSES, CUSTOMER_TYPES, salespeople: getSalespeople(db), carInventory: getCarInventory(db) });
});

// "رخصة واستمارة" is a normal retail sale to an individual; "معارض" is a
// wholesale sale to another dealer — same underlying columns (customer_name,
// national_id, etc.) but different required fields and labels, decided here
// by customer_type rather than a second set of columns.
function validateBody(body) {
  const errors = {};
  const customerType = CUSTOMER_TYPES.includes(body.customer_type) ? body.customer_type : CUSTOMER_TYPES[0];
  const isDealer = customerType === 'معارض';

  if (!body.customer_name || !body.customer_name.trim()) {
    errors.customer_name = isDealer ? 'اسم المعرض إلزامي' : 'اسم العميل إلزامي';
  }
  if (isDealer) {
    if (!body.national_id || !body.national_id.trim()) errors.national_id = 'رقم ال700 إلزامي';
  } else if (!validateNationalId(body.national_id)) {
    errors.national_id = 'رقم الهوية لازم يكون 10 أرقام بالضبط';
  }
  if (!body.sale_date) errors.sale_date = 'تاريخ البيع إلزامي';
  const allowedPayments = isDealer ? ['نقدي'] : PAYMENT_METHODS;
  if (!allowedPayments.includes(body.payment_method)) errors.payment_method = 'اختر طريقة دفع صحيحة';
  if (!body.car_type || !body.car_type.trim()) errors.car_type = 'نوع السيارة إلزامي';
  if (!body.vin || !body.vin.trim()) errors.vin = 'رقم الهيكل إلزامي';
  if (!isDealer && (!body.estimara_number || !body.estimara_number.trim())) errors.estimara_number = 'رقم الاستمارة إلزامي';
  if (body.phone && !validatePhone(body.phone)) errors.phone = 'الجوال لازم يبدأ بـ 05 ويتكون من 10 أرقام';
  return errors;
}

router.post('/', (req, res) => {
  const db = req.db;
  const body = req.body;
  const errors = validateBody(body);

  if (!errors.vin) {
    const dupVin = db.prepare('SELECT id FROM customers WHERE vin = ?').get(body.vin.toUpperCase());
    if (dupVin) errors.vin = 'رقم الهيكل هذا مسجل مسبقًا لعميل آخر';
  }
  if (!errors.estimara_number && body.estimara_number && body.estimara_number.trim()) {
    const dupEst = db.prepare('SELECT id FROM customers WHERE estimara_number = ?').get(body.estimara_number.trim());
    if (dupEst) errors.estimara_number = 'رقم الاستمارة هذا مسجل مسبقًا';
  }

  if (Object.keys(errors).length) {
    return res.status(400).render('customers/form', { customer: body, errors, PAYMENT_METHODS, STATUSES, CUSTOMER_TYPES, salespeople: getSalespeople(db), carInventory: getCarInventory(db) });
  }

  const ts = nowISO();
  const stmt = db.prepare(`INSERT INTO customers
    (customer_type, customer_name, national_id, sale_date, payment_method, delivery_at, car_type, car_inventory_id, vin, estimara_number, phone, salesperson, price, notes, status, reported, followup_done, created_by, updated_by, is_demo, created_at, updated_at)
    VALUES (@customer_type, @customer_name, @national_id, @sale_date, @payment_method, @delivery_at, @car_type, @car_inventory_id, @vin, @estimara_number, @phone, @salesperson, @price, @notes, @status, 0, 0, @created_by, @updated_by, 0, @created_at, @updated_at)`);

  const info = stmt.run({
    customer_type: CUSTOMER_TYPES.includes(body.customer_type) ? body.customer_type : CUSTOMER_TYPES[0],
    customer_name: body.customer_name.trim(),
    national_id: body.national_id.trim(),
    sale_date: body.sale_date,
    payment_method: body.payment_method,
    delivery_at: body.delivery_at || null,
    car_type: body.car_type.trim(),
    car_inventory_id: body.car_inventory_id ? parseInt(body.car_inventory_id) : null,
    vin: body.vin.toUpperCase(),
    estimara_number: body.estimara_number && body.estimara_number.trim() ? body.estimara_number.trim() : null,
    phone: body.phone ? body.phone.trim() : null,
    salesperson: body.salesperson ? body.salesperson.trim() : null,
    price: body.price ? parseFloat(body.price) : null,
    notes: body.notes || null,
    status: STATUSES.includes(body.status) ? body.status : 'جديد',
    created_by: req.session.userName, updated_by: req.session.userName,
    created_at: ts, updated_at: ts,
  });

  logActivity(req, 'إضافة عميل', { entityType: 'customer', entityId: info.lastInsertRowid, details: body.customer_name.trim() });

  if (body.from_prospect_id) {
    db.prepare(`UPDATE prospects SET stage='تحوّل لعميل', converted_customer_id=?, updated_at=? WHERE id=?`)
      .run(info.lastInsertRowid, nowISO(), body.from_prospect_id);
    logActivity(req, 'تحويل عميل محتمل لعميل', { entityType: 'prospect', entityId: body.from_prospect_id, details: body.customer_name.trim() });
  }

  res.redirect('/customers/' + info.lastInsertRowid);
});

router.get('/:id', (req, res) => {
  const db = req.db;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).render('404');
  const contacts = db.prepare('SELECT * FROM contact_log WHERE customer_id = ? ORDER BY contact_date DESC, id DESC').all(customer.id);
  const attachments = db.prepare('SELECT * FROM attachments WHERE customer_id = ? ORDER BY created_at DESC').all(customer.id);
  res.render('customers/detail', { customer, contacts, attachments, isReportOverdue, uploadError: req.query.error || null });
});

router.get('/:id/edit', (req, res) => {
  const db = req.db;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).render('404');
  res.render('customers/form', { customer, errors: {}, PAYMENT_METHODS, STATUSES, CUSTOMER_TYPES, salespeople: getSalespeople(db), carInventory: getCarInventory(db) });
});

router.post('/:id', (req, res) => {
  const db = req.db;
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).render('404');

  const body = req.body;
  const errors = validateBody(body);

  if (!errors.vin) {
    const dupVin = db.prepare('SELECT id FROM customers WHERE vin = ? AND id != ?').get(body.vin.toUpperCase(), req.params.id);
    if (dupVin) errors.vin = 'رقم الهيكل هذا مسجل مسبقًا لعميل آخر';
  }
  if (!errors.estimara_number && body.estimara_number && body.estimara_number.trim()) {
    const dupEst = db.prepare('SELECT id FROM customers WHERE estimara_number = ? AND id != ?').get(body.estimara_number.trim(), req.params.id);
    if (dupEst) errors.estimara_number = 'رقم الاستمارة هذا مسجل مسبقًا';
  }

  if (Object.keys(errors).length) {
    return res.status(400).render('customers/form', { customer: { ...body, id: req.params.id }, errors, PAYMENT_METHODS, STATUSES, CUSTOMER_TYPES, salespeople: getSalespeople(db), carInventory: getCarInventory(db) });
  }

  db.prepare(`UPDATE customers SET
    customer_type=@customer_type, customer_name=@customer_name, national_id=@national_id, sale_date=@sale_date, payment_method=@payment_method,
    delivery_at=@delivery_at, car_type=@car_type, car_inventory_id=@car_inventory_id, vin=@vin, estimara_number=@estimara_number, phone=@phone,
    salesperson=@salesperson, price=@price, notes=@notes, status=@status, updated_by=@updated_by, updated_at=@updated_at
    WHERE id=@id`).run({
    customer_type: CUSTOMER_TYPES.includes(body.customer_type) ? body.customer_type : CUSTOMER_TYPES[0],
    customer_name: body.customer_name.trim(),
    national_id: body.national_id.trim(),
    sale_date: body.sale_date,
    payment_method: body.payment_method,
    delivery_at: body.delivery_at || null,
    car_type: body.car_type.trim(),
    car_inventory_id: body.car_inventory_id ? parseInt(body.car_inventory_id) : null,
    vin: body.vin.toUpperCase(),
    estimara_number: body.estimara_number && body.estimara_number.trim() ? body.estimara_number.trim() : null,
    phone: body.phone ? body.phone.trim() : null,
    salesperson: body.salesperson ? body.salesperson.trim() : null,
    price: body.price ? parseFloat(body.price) : null,
    notes: body.notes || null,
    status: STATUSES.includes(body.status) ? body.status : existing.status,
    updated_by: req.session.userName,
    updated_at: nowISO(),
    id: req.params.id,
  });

  logActivity(req, 'تعديل عميل', { entityType: 'customer', entityId: req.params.id, details: body.customer_name.trim() });
  res.redirect('/customers/' + req.params.id);
});

router.post('/:id/delete', (req, res) => {
  const db = req.db;
  const customer = db.prepare('SELECT customer_name FROM customers WHERE id = ?').get(req.params.id);
  const files = db.prepare('SELECT stored_name FROM attachments WHERE customer_id = ?').all(req.params.id);
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id); // cascades to attachments/contact_log rows
  const uploadsDir = getUploadsDir(req.tenantSlug);
  files.forEach(f => fs.unlink(path.join(uploadsDir, f.stored_name), () => {}));
  if (customer) logActivity(req, 'حذف عميل', { entityType: 'customer', entityId: req.params.id, details: customer.customer_name });
  res.redirect('/customers');
});

router.post('/:id/contact', (req, res) => {
  const db = req.db;
  const { contact_date, type, note } = req.body;
  db.prepare('INSERT INTO contact_log (customer_id, contact_date, type, note, created_at) VALUES (?,?,?,?,?)')
    .run(req.params.id, contact_date || nowISO().slice(0, 10), type || null, note || null, nowISO());
  logActivity(req, 'إضافة تواصل', { entityType: 'customer', entityId: req.params.id, details: type || 'تواصل' });
  res.redirect('/customers/' + req.params.id);
});

router.post('/:id/followup', (req, res) => {
  const db = req.db;
  const { followup_result, followup_note } = req.body;
  db.prepare(`UPDATE customers SET followup_done=1, followup_result=?, followup_note=?, followup_at=?, updated_by=?, updated_at=? WHERE id=?`)
    .run(followup_result || null, followup_note || null, nowISO(), req.session.userName, nowISO(), req.params.id);
  logActivity(req, 'تسجيل متابعة ما بعد البيع', { entityType: 'customer', entityId: req.params.id, details: followup_result || '' });
  res.redirect('/customers/' + req.params.id);
});

router.post('/:id/report', (req, res) => {
  const db = req.db;
  const customer = db.prepare('SELECT reported FROM customers WHERE id = ?').get(req.params.id);
  const newVal = customer.reported ? 0 : 1;
  db.prepare(`UPDATE customers SET reported=?, reported_at=?, updated_by=?, updated_at=? WHERE id=?`)
    .run(newVal, newVal ? nowISO() : null, req.session.userName, nowISO(), req.params.id);
  logActivity(req, newVal ? 'وضع علامة تم التبليغ' : 'التراجع عن التبليغ', { entityType: 'customer', entityId: req.params.id });
  res.redirect(req.get('referer') || '/customers/' + req.params.id);
});

router.post('/:id/attachments',
  uploadSingle('file', (req, res, message) => res.redirect(`/customers/${req.params.id}?error=${encodeURIComponent(message)}`)),
  (req, res) => {
    const db = req.db;
    if (!req.file) {
      return res.redirect(`/customers/${req.params.id}?error=${encodeURIComponent('اختر ملف أولاً')}`);
    }
    const label = (req.body.label || '').trim() || 'مستند';
    db.prepare(`INSERT INTO attachments (customer_id, label, original_name, stored_name, mime_type, size, uploaded_by, created_at)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(req.params.id, label, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.session.userName, nowISO());
    logActivity(req, 'رفع مرفق', { entityType: 'customer', entityId: req.params.id, details: label });
    res.redirect('/customers/' + req.params.id);
  });

router.get('/:id/attachments/:attId/download', (req, res) => {
  const db = req.db;
  const att = db.prepare('SELECT * FROM attachments WHERE id = ? AND customer_id = ?').get(req.params.attId, req.params.id);
  if (!att) return res.status(404).render('404');
  res.download(path.join(getUploadsDir(req.tenantSlug), att.stored_name), att.original_name);
});

router.post('/:id/attachments/:attId/delete', (req, res) => {
  const db = req.db;
  const att = db.prepare('SELECT * FROM attachments WHERE id = ? AND customer_id = ?').get(req.params.attId, req.params.id);
  if (att) {
    fs.unlink(path.join(getUploadsDir(req.tenantSlug), att.stored_name), () => {});
    db.prepare('DELETE FROM attachments WHERE id = ?').run(att.id);
    logActivity(req, 'حذف مرفق', { entityType: 'customer', entityId: req.params.id, details: att.label });
  }
  res.redirect('/customers/' + req.params.id);
});

module.exports = router;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.STATUSES = STATUSES;
module.exports.CUSTOMER_TYPES = CUSTOMER_TYPES;
