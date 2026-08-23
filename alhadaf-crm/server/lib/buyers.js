// A buyer profile (customer_type + national_id identifies "the same
// person/dealer") is looked up or created every time a sale is saved, so
// the caller never has to think about whether this buyer already exists —
// the identity fields the user typed (or picked via the search-and-fill
// autocomplete on the form) are always authoritative.
function findOrCreateBuyer(db, { customerType, customerName, nationalId, phone }, ts) {
  const existing = db.prepare('SELECT id FROM buyers WHERE customer_type = ? AND national_id = ?').get(customerType, nationalId);
  if (existing) {
    db.prepare('UPDATE buyers SET customer_name = ?, phone = ?, updated_at = ? WHERE id = ?')
      .run(customerName, phone || null, ts, existing.id);
    return existing.id;
  }
  const info = db.prepare('INSERT INTO buyers (customer_type, customer_name, national_id, phone, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run(customerType, customerName, nationalId, phone || null, ts, ts);
  return info.lastInsertRowid;
}

// Every other sale under the same buyer, most recent first.
function getBuyerSales(db, buyerId, excludeCustomerId) {
  if (!buyerId) return [];
  return db.prepare('SELECT * FROM customers WHERE buyer_id = ? AND id != ? ORDER BY sale_date DESC')
    .all(buyerId, excludeCustomerId || -1);
}

module.exports = { findOrCreateBuyer, getBuyerSales };
