const express = require('express');
const router = express.Router();
const db = require('../db');
const { logActivity } = require('../lib/activity');

router.get('/', (req, res) => {
  const cars = db.prepare('SELECT * FROM car_inventory ORDER BY brand, model, year, trim, color').all();
  res.render('cars', { cars, error: req.query.error || null });
});

router.post('/', (req, res) => {
  const brand = (req.body.brand || '').trim();
  const model = (req.body.model || '').trim();
  const year = (req.body.year || '').trim();
  const trim = (req.body.trim || '').trim();
  const color = (req.body.color || '').trim();
  const purchase_price = req.body.purchase_price ? parseFloat(req.body.purchase_price) : null;

  if (!brand || !model || !year || !trim || !color) {
    return res.redirect('/cars?error=' + encodeURIComponent('لازم تعبي الشركة والموديل والسنة والفئة واللون كلهم'));
  }

  const existing = db.prepare('SELECT 1 FROM car_inventory WHERE brand=? AND model=? AND year=? AND trim=? AND color=?')
    .get(brand, model, year, trim, color);
  if (existing) {
    return res.redirect('/cars?error=' + encodeURIComponent('هذي السيارة (نفس الشركة والموديل والسنة والفئة واللون) موجودة أصلاً بالقائمة'));
  }

  const info = db.prepare('INSERT INTO car_inventory (brand, model, year, trim, color, purchase_price, is_demo, created_at) VALUES (?,?,?,?,?,?,0,?)')
    .run(brand, model, year, trim, color, purchase_price, new Date().toISOString());
  logActivity(req, 'إضافة سيارة للكتالوج', { entityType: 'car', entityId: info.lastInsertRowid, details: `${brand} ${model} ${year} ${trim} - ${color}` });
  res.redirect('/cars');
});

router.post('/:id/delete', (req, res) => {
  const car = db.prepare('SELECT * FROM car_inventory WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM car_inventory WHERE id = ?').run(req.params.id);
  if (car) logActivity(req, 'حذف سيارة من الكتالوج', { entityType: 'car', entityId: req.params.id, details: `${car.brand} ${car.model} ${car.year} ${car.trim} - ${car.color}` });
  res.redirect('/cars');
});

module.exports = router;
