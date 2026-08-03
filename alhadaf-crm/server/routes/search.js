const express = require('express');
const router = express.Router();

// Read-only, same access level as the customers/dealers/prospects lists it
// searches across — no role gate needed here since anyone who can already
// browse those lists can already see everything a search result would show.
const RESULT_LIMIT = 25;

router.get('/', (req, res) => {
  const db = req.db;
  const q = (req.query.q || '').trim();

  if (!q) {
    return res.render('search', { q, customers: [], dealers: [], prospects: [] });
  }

  const like = `%${q}%`;

  const customers = db.prepare(`
    SELECT * FROM customers
    WHERE customer_type = 'رخصة واستمارة'
      AND (customer_name LIKE @like OR national_id LIKE @like OR phone LIKE @like OR vin LIKE @like OR estimara_number LIKE @like OR car_type LIKE @like)
    ORDER BY sale_date DESC LIMIT @limit`).all({ like, limit: RESULT_LIMIT });

  const dealers = db.prepare(`
    SELECT * FROM customers
    WHERE customer_type = 'معارض'
      AND (customer_name LIKE @like OR national_id LIKE @like OR phone LIKE @like OR vin LIKE @like OR car_type LIKE @like)
    ORDER BY sale_date DESC LIMIT @limit`).all({ like, limit: RESULT_LIMIT });

  const prospects = db.prepare(`
    SELECT * FROM prospects
    WHERE name LIKE @like OR phone LIKE @like OR interested_car LIKE @like
    ORDER BY updated_at DESC LIMIT @limit`).all({ like, limit: RESULT_LIMIT });

  res.render('search', { q, customers, dealers, prospects });
});

module.exports = router;
