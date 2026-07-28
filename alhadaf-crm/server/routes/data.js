const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const db = require('../db');

const CSV_FIELDS = [
  { label: 'اسم العميل', value: 'customer_name' },
  { label: 'رقم الهوية', value: 'national_id' },
  { label: 'تاريخ البيع', value: 'sale_date' },
  { label: 'طريقة الدفع', value: 'payment_method' },
  { label: 'وقت التسليم', value: 'delivery_at' },
  { label: 'نوع السيارة', value: 'car_type' },
  { label: 'رقم الهيكل VIN', value: 'vin' },
  { label: 'رقم الاستمارة', value: 'estimara_number' },
  { label: 'الجوال', value: 'phone' },
  { label: 'البائع', value: 'salesperson' },
  { label: 'السعر', value: 'price' },
  { label: 'الحالة', value: 'status' },
  { label: 'تم التبليغ', value: (r) => (r.reported ? 'نعم' : 'لا') },
  { label: 'ملاحظات', value: 'notes' },
];

// Export to CSV (opens correctly in Excel with UTF-8 BOM), respects the same
// filters used on the customers list page so a filtered search can be exported.
router.get('/export.csv', (req, res) => {
  const { q = '', payment_method = '', salesperson = '', month = '', status = '' } = req.query;
  let where = [];
  let params = {};
  if (q) { where.push(`(customer_name LIKE @q OR national_id LIKE @q OR vin LIKE @q OR estimara_number LIKE @q OR phone LIKE @q OR car_type LIKE @q)`); params.q = `%${q}%`; }
  if (payment_method) { where.push('payment_method = @payment_method'); params.payment_method = payment_method; }
  if (salesperson) { where.push('salesperson = @salesperson'); params.salesperson = salesperson; }
  if (status) { where.push('status = @status'); params.status = status; }
  if (month) { where.push(`substr(sale_date, 1, 7) = @month`); params.month = month; }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const rows = db.prepare(`SELECT * FROM customers ${whereSql} ORDER BY sale_date DESC`).all(params);

  const parser = new Parser({ fields: CSV_FIELDS });
  const csv = parser.parse(rows);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="alhadaf-customers-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send('﻿' + csv); // BOM so Excel renders Arabic correctly
});

router.get('/backup.json', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers').all();
  const contact_log = db.prepare('SELECT * FROM contact_log').all();
  const sop = db.prepare('SELECT * FROM sop').all();
  const payload = { exported_at: new Date().toISOString(), customers, contact_log, sop };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="alhadaf-crm-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

router.get('/restore', (req, res) => {
  res.render('restore', { done: null, error: null });
});

router.post('/restore', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !Array.isArray(payload.customers)) {
      return res.render('restore', { done: null, error: 'ملف النسخة الاحتياطية غير صالح' });
    }

    const restoreAll = db.transaction(() => {
      db.prepare('DELETE FROM contact_log').run();
      db.prepare('DELETE FROM customers').run();

      const insCustomer = db.prepare(`INSERT INTO customers
        (id, customer_name, national_id, sale_date, payment_method, delivery_at, car_type, vin, estimara_number, phone, salesperson, price, notes, status, reported, reported_at, followup_done, followup_result, followup_note, followup_at, is_demo, created_at, updated_at)
        VALUES (@id, @customer_name, @national_id, @sale_date, @payment_method, @delivery_at, @car_type, @vin, @estimara_number, @phone, @salesperson, @price, @notes, @status, @reported, @reported_at, @followup_done, @followup_result, @followup_note, @followup_at, @is_demo, @created_at, @updated_at)`);
      for (const c of payload.customers) insCustomer.run(c);

      if (Array.isArray(payload.contact_log)) {
        const insContact = db.prepare(`INSERT INTO contact_log (id, customer_id, contact_date, type, note, created_at) VALUES (@id, @customer_id, @contact_date, @type, @note, @created_at)`);
        for (const l of payload.contact_log) insContact.run(l);
      }

      if (Array.isArray(payload.sop) && payload.sop[0]) {
        db.prepare('UPDATE sop SET content=?, updated_at=? WHERE id=1').run(payload.sop[0].content, payload.sop[0].updated_at);
      }
    });

    restoreAll();
    res.render('restore', { done: payload.customers.length, error: null });
  } catch (err) {
    res.render('restore', { done: null, error: 'حصل خطأ أثناء الاستعادة: ' + err.message });
  }
});

module.exports = router;
