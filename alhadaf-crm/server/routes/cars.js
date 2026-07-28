const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const cars = db.prepare('SELECT * FROM car_inventory ORDER BY brand, model, year, color').all();
  res.render('cars', { cars, error: req.query.error || null });
});

router.post('/', (req, res) => {
  const brand = (req.body.brand || '').trim();
  const model = (req.body.model || '').trim();
  const year = (req.body.year || '').trim();
  const color = (req.body.color || '').trim();
  const purchase_price = req.body.purchase_price ? parseFloat(req.body.purchase_price) : null;

  if (!brand || !model || !year || !color) {
    return res.redirect('/cars?error=' + encodeURIComponent('لازم تعبي الشركة والموديل والسنة واللون كلهم'));
  }

  const existing = db.prepare('SELECT 1 FROM car_inventory WHERE brand=? AND model=? AND year=? AND color=?')
    .get(brand, model, year, color);
  if (existing) {
    return res.redirect('/cars?error=' + encodeURIComponent('هذي السيارة (نفس الشركة والموديل والسنة واللون) موجودة أصلاً بالقائمة'));
  }

  db.prepare('INSERT INTO car_inventory (brand, model, year, color, purchase_price, is_demo, created_at) VALUES (?,?,?,?,?,0,?)')
    .run(brand, model, year, color, purchase_price, new Date().toISOString());
  res.redirect('/cars');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM car_inventory WHERE id = ?').run(req.params.id);
  res.redirect('/cars');
});

module.exports = router;
