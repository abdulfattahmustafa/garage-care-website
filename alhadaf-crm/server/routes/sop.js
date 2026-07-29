const express = require('express');
const router = express.Router();
const db = require('../db');
const { logActivity } = require('../lib/activity');

router.get('/', (req, res) => {
  const sop = db.prepare('SELECT * FROM sop WHERE id = 1').get();
  res.render('sop', { sop, saved: req.query.saved === '1' });
});

router.post('/', (req, res) => {
  db.prepare('UPDATE sop SET content = ?, updated_at = ? WHERE id = 1')
    .run(req.body.content || '', new Date().toISOString());
  logActivity(req, 'تعديل إجراءات التعامل (SOP)', {});
  res.redirect('/sop?saved=1');
});

module.exports = router;
