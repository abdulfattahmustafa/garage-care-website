const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const db = require('../db');
const { isReportOverdue, isFollowupDue, fmtDate } = require('../lib/util');

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

// Full Excel (.xlsx) report: a "basic info" summary block on top, then the
// full customer table below — this is the report the showroom owner opens
// and reads directly, as opposed to backup.json which is a technical file
// only meant to be re-imported via the "استعادة" (restore) page.
router.get('/export.xlsx', async (req, res) => {
  const CHARCOAL = 'FF17181A';
  const GOLD = 'FFBD8E54';
  const GOLD_LIGHT = 'FFD9B98A';
  const WHITE = 'FFFFFFFF';
  const BG_LIGHT = 'FFF3EEE7';
  const BORDER = 'FFE3DCD2';

  const now = new Date();
  const rows = db.prepare('SELECT * FROM customers ORDER BY sale_date DESC').all();

  const thisMonth = now.toISOString().slice(0, 7);
  const thisYear = now.toISOString().slice(0, 4);
  const totalCustomers = rows.length;
  const salesThisMonth = rows.filter(c => c.sale_date.slice(0, 7) === thisMonth).length;
  const salesThisYear = rows.filter(c => c.sale_date.slice(0, 4) === thisYear).length;
  const overdueCount = rows.filter(c => isReportOverdue(c, now)).length;
  const pendingFollowupCount = rows.filter(c => isFollowupDue(c, now)).length;

  const headers = ['اسم العميل', 'رقم الهوية', 'تاريخ البيع', 'طريقة الدفع', 'وقت التسليم', 'نوع السيارة',
    'رقم الهيكل VIN', 'رقم الاستمارة', 'الجوال', 'البائع', 'السعر', 'الحالة', 'تم التبليغ', 'متابعة ما بعد البيع', 'ملاحظات'];
  const widths = [20, 14, 12, 20, 16, 20, 20, 16, 14, 16, 12, 14, 12, 16, 30];
  const colCount = headers.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'alhadaf-crm';
  wb.created = now;
  const ws = wb.addWorksheet('عملاء الهدف الأميز', { views: [{ rightToLeft: true }] });
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  let r = 1;

  // ---- Title ----
  ws.mergeCells(r, 1, r, colCount);
  const title = ws.getCell(r, 1);
  title.value = 'نظام إدارة علاقات العملاء - معرض الهدف الأميز';
  title.font = { name: 'Arial', size: 16, bold: true, color: { argb: GOLD_LIGHT } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CHARCOAL } };
  ws.getRow(r).height = 30;
  r += 2;

  // ---- Basic info block ----
  ws.mergeCells(r, 1, r, colCount);
  const infoHeader = ws.getCell(r, 1);
  infoHeader.value = 'المعلومات الأساسية';
  infoHeader.font = { bold: true, size: 12, color: { argb: WHITE } };
  infoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
  infoHeader.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(r).height = 20;
  r++;

  const stats = [
    ['تاريخ التصدير', fmtDate(now.toISOString().slice(0, 10))],
    ['إجمالي عدد العملاء', totalCustomers],
    ['مبيعات هذا الشهر', salesThisMonth],
    ['مبيعات هذه السنة', salesThisYear],
    ['تبليغ مبيعات متأخر عن الموعد', overdueCount],
    ['متابعات ما بعد بيع مستحقة', pendingFollowupCount],
  ];
  stats.forEach(([label, val]) => {
    ws.mergeCells(r, 1, r, 3);
    const c1 = ws.getCell(r, 1);
    c1.value = label;
    c1.font = { bold: true };
    c1.alignment = { horizontal: 'right' };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_LIGHT } };

    ws.mergeCells(r, 4, r, 5);
    const c2 = ws.getCell(r, 4);
    c2.value = val;
    c2.alignment = { horizontal: 'right' };
    r++;
  });
  r++;

  // ---- Customer table ----
  ws.mergeCells(r, 1, r, colCount);
  const tableHeader = ws.getCell(r, 1);
  tableHeader.value = 'بيانات العملاء';
  tableHeader.font = { bold: true, size: 12, color: { argb: WHITE } };
  tableHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
  tableHeader.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(r).height = 20;
  r++;

  const headerRowIndex = r;
  headers.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: GOLD_LIGHT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CHARCOAL } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  ws.getRow(headerRowIndex).height = 26;
  r++;

  rows.forEach((c, idx) => {
    const values = [
      c.customer_name, c.national_id, c.sale_date, c.payment_method,
      c.delivery_at ? c.delivery_at.replace('T', ' ') : '', c.car_type, c.vin, c.estimara_number,
      c.phone || '', c.salesperson || '', c.price || '', c.status,
      c.reported ? 'نعم' : 'لا',
      c.followup_done ? (c.followup_result || 'تمت') : 'لم تتم بعد',
      c.notes || '',
    ];
    values.forEach((v, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = v;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } };
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_LIGHT } };
    });
    r++;
  });

  ws.views = [{ state: 'frozen', ySplit: headerRowIndex, rightToLeft: true }];

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="alhadaf-crm-report-${now.toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

router.get('/backup.json', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers').all();
  const contact_log = db.prepare('SELECT * FROM contact_log').all();
  const sop = db.prepare('SELECT * FROM sop').all();
  const salespeople = db.prepare('SELECT * FROM salespeople').all();
  const car_inventory = db.prepare('SELECT * FROM car_inventory').all();
  const payload = { exported_at: new Date().toISOString(), customers, contact_log, sop, salespeople, car_inventory };

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

    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM contact_log').run();
      db.prepare('DELETE FROM customers').run();
      db.prepare('DELETE FROM car_inventory').run();
      db.prepare('DELETE FROM salespeople').run();

      if (Array.isArray(payload.car_inventory)) {
        const insCar = db.prepare(`INSERT INTO car_inventory (id, brand, model, year, trim, color, purchase_price, is_demo, created_at) VALUES (@id, @brand, @model, @year, @trim, @color, @purchase_price, @is_demo, @created_at)`);
        for (const c of payload.car_inventory) insCar.run(c);
      }

      if (Array.isArray(payload.salespeople)) {
        const insSalesperson = db.prepare(`INSERT INTO salespeople (id, name, is_demo, created_at) VALUES (@id, @name, @is_demo, @created_at)`);
        for (const s of payload.salespeople) insSalesperson.run(s);
      }

      const insCustomer = db.prepare(`INSERT INTO customers
        (id, customer_name, national_id, sale_date, payment_method, delivery_at, car_type, car_inventory_id, vin, estimara_number, phone, salesperson, price, notes, status, reported, reported_at, followup_done, followup_result, followup_note, followup_at, is_demo, created_at, updated_at)
        VALUES (@id, @customer_name, @national_id, @sale_date, @payment_method, @delivery_at, @car_type, @car_inventory_id, @vin, @estimara_number, @phone, @salesperson, @price, @notes, @status, @reported, @reported_at, @followup_done, @followup_result, @followup_note, @followup_at, @is_demo, @created_at, @updated_at)`);
      for (const c of payload.customers) insCustomer.run(c);

      if (Array.isArray(payload.contact_log)) {
        const insContact = db.prepare(`INSERT INTO contact_log (id, customer_id, contact_date, type, note, created_at) VALUES (@id, @customer_id, @contact_date, @type, @note, @created_at)`);
        for (const l of payload.contact_log) insContact.run(l);
      }

      if (Array.isArray(payload.sop) && payload.sop[0]) {
        db.prepare('UPDATE sop SET content=?, updated_at=? WHERE id=1').run(payload.sop[0].content, payload.sop[0].updated_at);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    res.render('restore', { done: payload.customers.length, error: null });
  } catch (err) {
    res.render('restore', { done: null, error: 'حصل خطأ أثناء الاستعادة: ' + err.message });
  }
});

module.exports = router;
