const express = require('express');
const router = express.Router();
const db = require('../db');

const PAGE_SIZE = 40;

router.get('/', (req, res) => {
  const { q = '', user = '' } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);

  let where = [];
  let params = {};
  if (q) {
    where.push(`(action LIKE @q OR details LIKE @q OR entity_type LIKE @q)`);
    params.q = `%${q}%`;
  }
  if (user) { where.push('user_name = @user'); params.user = user; }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) c FROM activity_log ${whereSql}`).get(params).c;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;

  const rows = db.prepare(`SELECT * FROM activity_log ${whereSql} ORDER BY id DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`).all(params);
  const users = db.prepare(`SELECT DISTINCT user_name FROM activity_log WHERE user_name IS NOT NULL ORDER BY user_name`).all().map(r => r.user_name);

  res.render('activity', { rows, total, totalPages, page: safePage, q, user, users });
});

module.exports = router;
