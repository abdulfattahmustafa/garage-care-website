// Official Toyota (توتيوتا) catalog — car_inventory seed data, requested by
// the owner to replace whatever Toyota entries existed with the exact
// lineup/trim names from toyota.com.sa (25 models / 117 trims, transcribed
// from a snapshot the owner captured 2026-08-23). color/purchase_price are
// intentionally left blank — sellers fill those in per actual unit later.
const TOYOTA_CATALOG = [
  { model: 'Yaris', year: '2026', trims: ['Y', 'Y Plus', 'YX'] },
  { model: 'Corolla', year: '2026', trims: ['1.5L XLI', '1.5L XLI Executive', '1.8L XLI Hybrid', '1.8L XLI EXECUTIVE HEV M/R', '2.0L XLI', '2.0L XLI Executive', '2.0L XLI Executive MR', '2.0L GLI MR'] },
  { model: 'Camry', year: '2026', trims: ['E', 'LE', 'Grande', 'E HEV', 'E Plus HEV', 'LE HEV', 'Lumiere HEV'] },
  { model: 'Crown', year: '2026', trims: ['Prestige', 'Premium', 'Majesta'] },
  { model: 'GR86', year: '2026', trims: ['GR86 AT', 'GR86 RS MT'] },
  { model: 'Supra', year: '2026', trims: ['Track Edition MT', 'Track Edition AT'] },
  { model: 'Raize', year: '2026', trims: ['XLE', 'Limited'] },
  { model: 'Urban Cruiser', year: '2026', trims: ['GL', 'GLX'] },
  { model: 'Veloz', year: '2026', trims: ['GLX'] },
  { model: 'Corolla Cross', year: '2025', trims: ['LE HEV', 'XLE HEV', 'Limited HEV', 'Limited Plus HEV'] },
  { model: 'RAV4', year: '2026', trims: ['LE 4X2', 'LE 4X4', 'XLE 4x4', 'LE 4X2 HEV', 'LE 4X4 HEV', 'XLE 4x4 HEV', 'ADV 4x4 HEV', 'XSE 4x4 HEV', 'LTD 4X4 HEV'] },
  { model: 'Innova', year: '2026', trims: ['GL', 'GL HEV', 'VIP7 HEV'] },
  { model: 'Land Cruiser Hardtop', year: '2026', trims: ['DX - 5 Doors 4x4 MT', 'DX - 5 Doors 4x4 AT', 'DLX3 - 5 Doors 4x4 AT', 'S-DLX - 5 Doors 4x4 AT', 'DLX2 DSL - 5 Doors 4x4 AT', 'S-DLX DSL - 5 Doors 4x4 AT'] },
  { model: 'Fortuner', year: '2026', trims: ['GX2 4X2', 'GX2 4X4', 'VX1 4x4', 'VX3-S 4x4', 'GX2 4X4 DSL', 'VX2-S DSL'] },
  { model: 'Highlander', year: '2026', trims: ['LE HEV 4X2', 'GLE HEV 4X4', 'GLE PLUS HEV 4x4', 'LTD HEV 4X4'] },
  { model: 'Prado', year: '2026', trims: ['TX-2', 'TXL-1', 'TXL-3', 'ADV-2 2T', 'ADV-2', 'VXL-3', 'TX-2 DSL', 'TXL-2 DSL', 'ADV-1 DSL'] },
  { model: 'Land Cruiser 300', year: '2026', trims: ['GXR1', 'GXR2', 'GXR3', 'GXR4', 'VX', 'VX-R'] },
  { model: 'Land Cruiser 300 HEV MAX', year: '2026', trims: ['GXR-S HEV MAX'] },
  { model: 'Land Cruiser Pickup', year: '2026', trims: ['S-DLX - SC 4x4 AT', 'S-DLX - DC 4x4 AT', 'DX DSL - SC 4x4 MT', 'DX DSL - SC 4x4 AT', 'DLX3 DSL - SC 4x4 MT', 'DLX2 DSL - SC 4x4 AT', 'S-DLX DSL - SC 4x4 AT'] },
  { model: 'Hilux غمارة (Single Cab)', year: '2026', trims: ['GLX 2.7L 4X2 MT', 'GLX 2.7L 4×4 MT', 'Deckless 2.4 DSL 4X2 MT', 'GL 2.4L DSL 4×2 MT', 'GL 2.8L DSL 4×2 MT', 'GLX 2.4L DSL 4X4 MT', 'GLX 2.8L DSL 4×4 MT', 'GLX 2.8L DSL 4×4 AT'] },
  { model: 'Hilux دبل كاب (Double Cab)', year: '2026', trims: ['GLX1 2.7L 4X2 AT', 'GLX2 2.7L 4X2 MT', 'SGLX 2.7L 4X4 MT', 'SGLX 2.7L 4X4 AT', 'GR-S Rally Edition 4X4 4.0L AT', 'GR-S 4.0LS 4X4 AT', 'Adventure 4.0L 4X4 AT', 'GL 2.4L DSL 4X2 MT', 'GL2 2.4L DSL 4X4 MT', 'SGLX 2.4L DSL 4X4 AT', 'SGLX 2.8L DSL 4X4 AT'] },
  { model: 'Liteace Van', year: '2026', trims: ['Gasoline MT', 'Gasoline AT'] },
  { model: 'Coaster', year: '2026', trims: ['Coaster Gasoline MT', 'Coaster Diesel AT'] },
  { model: 'Hiace Bus', year: '2026', trims: ['BUS GASOLINE MT', 'BUS DIESEL MT', 'BUS DIESEL AT'] },
  { model: 'Hiace Van', year: '2026', trims: ['VAN STD GAS MT', 'VAN HIGH ROOF GAS MT', 'VAN STD DSL MT', 'Van Standard DSL AT (Swing Back Door)', 'VAN HIGH ROOF DSL MT', 'Van High Roof DSL AT (Swing Back Door)'] },
];

// Creates/migrates the full per-tenant schema on a given DatabaseSync
// connection. Called once per tenant database (see server/tenantDb.js) —
// every tenant gets its own file with this exact same schema, which is
// what gives tenants real (file-level) data isolation from each other.
function initSchema(db, { tenantName } = {}) {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
CREATE TABLE IF NOT EXISTS car_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year TEXT NOT NULL,
  trim TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  purchase_price REAL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(brand, model, year, trim, color)
);

-- A persistent buyer/dealer profile, separate from each individual sale —
-- lets a repeat buyer's identity (name/national_id/phone) be picked once
-- when adding a new sale instead of retyped every time. customers keeps
-- its own copy of customer_name/national_id/phone too (unchanged, still
-- the source every existing reader uses) so this is purely additive.
CREATE TABLE IF NOT EXISTS buyers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_type TEXT NOT NULL DEFAULT 'رخصة واستمارة',
  customer_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(customer_type, national_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_type TEXT NOT NULL DEFAULT 'رخصة واستمارة',
  customer_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  sale_date TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  bank_name TEXT,
  delivery_at TEXT,
  car_type TEXT NOT NULL,
  car_inventory_id INTEGER REFERENCES car_inventory(id) ON DELETE SET NULL,
  vin TEXT NOT NULL UNIQUE,
  estimara_number TEXT UNIQUE,
  phone TEXT,
  salesperson TEXT,
  price REAL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'جديد',
  reported INTEGER NOT NULL DEFAULT 0,
  reported_at TEXT,
  followup_done INTEGER NOT NULL DEFAULT 0,
  followup_result TEXT,
  followup_note TEXT,
  followup_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  custom_data TEXT,
  buyer_id INTEGER REFERENCES buyers(id) ON DELETE SET NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contact_date TEXT NOT NULL,
  type TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sop (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  auto_assign_prospects INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS salespeople (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  email TEXT,
  reset_token TEXT,
  reset_token_expires TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prospects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  source TEXT,
  interested_car TEXT,
  stage TEXT NOT NULL DEFAULT 'جديد',
  salesperson TEXT,
  notes TEXT,
  converted_customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  custom_data TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prospect_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospect_id INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  contact_date TEXT NOT NULL,
  type TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- One sale (a customers row) can include more than one car. customers'
-- own car_type/vin/estimara_number/car_inventory_id/price columns are kept
-- in sync with the *first* car here purely so every existing consumer that
-- reads them directly (list page, dashboard stats, exports, search) keeps
-- working unchanged and shows a sensible "primary car" at a glance; the
-- full set for a sale always lives here.
CREATE TABLE IF NOT EXISTS sale_cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  car_type TEXT NOT NULL,
  car_inventory_id INTEGER REFERENCES car_inventory(id) ON DELETE SET NULL,
  vin TEXT NOT NULL UNIQUE,
  estimara_number TEXT UNIQUE,
  price REAL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_sale_date ON customers(sale_date);
CREATE INDEX IF NOT EXISTS idx_contact_log_customer ON contact_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_prospect_log_prospect ON prospect_log(prospect_id);
CREATE INDEX IF NOT EXISTS idx_attachments_customer ON attachments(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_cars_customer ON sale_cars(customer_id);
CREATE INDEX IF NOT EXISTS idx_buyers_national_id ON buyers(customer_type, national_id);
`);

  // Migration for tenant databases created before car_inventory/created_by
  // existed: CREATE TABLE IF NOT EXISTS above won't add a column to an
  // already-existing customers table.
  const customerCols = db.prepare("PRAGMA table_info(customers)").all().map(c => c.name);
  if (!customerCols.includes('car_inventory_id')) {
    db.exec('ALTER TABLE customers ADD COLUMN car_inventory_id INTEGER REFERENCES car_inventory(id) ON DELETE SET NULL');
  }
  if (!customerCols.includes('created_by')) {
    db.exec('ALTER TABLE customers ADD COLUMN created_by TEXT');
  }
  if (!customerCols.includes('updated_by')) {
    db.exec('ALTER TABLE customers ADD COLUMN updated_by TEXT');
  }
  if (!customerCols.includes('customer_type')) {
    db.exec("ALTER TABLE customers ADD COLUMN customer_type TEXT NOT NULL DEFAULT 'رخصة واستمارة'");
  }
  if (!customerCols.includes('bank_name')) {
    db.exec('ALTER TABLE customers ADD COLUMN bank_name TEXT');
  }
  if (!customerCols.includes('custom_data')) {
    db.exec('ALTER TABLE customers ADD COLUMN custom_data TEXT');
  }
  if (!customerCols.includes('buyer_id')) {
    db.exec('ALTER TABLE customers ADD COLUMN buyer_id INTEGER REFERENCES buyers(id) ON DELETE SET NULL');
  }
  // Index created here (not in the CREATE TABLE block above) because that
  // block's CREATE TABLE IF NOT EXISTS is a no-op on a pre-existing
  // customers table — buyer_id only actually exists on this table once the
  // ALTER TABLE above (or a fresh create) has run.
  db.exec('CREATE INDEX IF NOT EXISTS idx_customers_buyer ON customers(buyer_id)');

  // Migration for customers tables created before "معارض" (dealer) sales
  // existed: estimara_number was NOT NULL, but dealer sales don't always
  // have one. A plain ALTER TABLE can't drop a NOT NULL constraint in
  // SQLite, so the table is rebuilt in place — same rename/create/copy/drop
  // procedure as the car_inventory trim migration below, and for the same
  // reason foreign_keys must be OFF for it: customers is the parent of
  // attachments/contact_log (ON DELETE CASCADE) and prospects.converted_customer_id
  // (ON DELETE SET NULL), so dropping customers_old with foreign_keys ON would
  // wipe every attachment and contact-log row and null every conversion link,
  // even though a same-named, same-id replacement table already exists.
  // Dropping the old table also drops its index, so idx_customers_sale_date
  // has to be recreated afterward.
  const estimaraCol = db.prepare("PRAGMA table_info(customers)").all().find(c => c.name === 'estimara_number');
  if (estimaraCol && estimaraCol.notnull) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('ALTER TABLE customers RENAME TO customers_old');
    db.exec(`CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_type TEXT NOT NULL DEFAULT 'رخصة واستمارة',
      customer_name TEXT NOT NULL,
      national_id TEXT NOT NULL,
      sale_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      bank_name TEXT,
      delivery_at TEXT,
      car_type TEXT NOT NULL,
      car_inventory_id INTEGER REFERENCES car_inventory(id) ON DELETE SET NULL,
      vin TEXT NOT NULL UNIQUE,
      estimara_number TEXT UNIQUE,
      phone TEXT,
      salesperson TEXT,
      price REAL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'جديد',
      reported INTEGER NOT NULL DEFAULT 0,
      reported_at TEXT,
      followup_done INTEGER NOT NULL DEFAULT 0,
      followup_result TEXT,
      followup_note TEXT,
      followup_at TEXT,
      created_by TEXT,
      updated_by TEXT,
      custom_data TEXT,
      buyer_id INTEGER REFERENCES buyers(id) ON DELETE SET NULL,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    // NOTE: bank_name/custom_data/buyer_id are deliberately left out of this
    // copy — at the point this rebuild runs, customers_old may or may not
    // have those columns yet depending on migration order, so they're
    // populated by their own ALTER TABLE migrations above instead of here
    // (those ALTERs run unconditionally against whatever "customers"
    // currently is).
    const oldCols = db.prepare("PRAGMA table_info(customers_old)").all().map(c => c.name);
    const copyCols = ['id', 'customer_type', 'customer_name', 'national_id', 'sale_date', 'payment_method', 'delivery_at', 'car_type', 'car_inventory_id', 'vin', 'estimara_number', 'phone', 'salesperson', 'price', 'notes', 'status', 'reported', 'reported_at', 'followup_done', 'followup_result', 'followup_note', 'followup_at', 'created_by', 'updated_by', 'is_demo', 'created_at', 'updated_at'];
    if (oldCols.includes('bank_name')) copyCols.splice(6, 0, 'bank_name');
    if (oldCols.includes('custom_data')) copyCols.splice(copyCols.indexOf('updated_by') + 1, 0, 'custom_data');
    if (oldCols.includes('buyer_id')) copyCols.splice(copyCols.indexOf('updated_by') + 1, 0, 'buyer_id');
    const colList = copyCols.join(', ');
    db.exec(`INSERT INTO customers (${colList}) SELECT ${colList} FROM customers_old`);
    db.exec('DROP TABLE customers_old');
    db.exec('CREATE INDEX IF NOT EXISTS idx_customers_sale_date ON customers(sale_date)');
    db.exec('PRAGMA foreign_keys = ON');
  }

  // Migration for car_inventory created before "trim" (الفئة) existed. A plain
  // ALTER TABLE ADD COLUMN can't also widen the old UNIQUE(brand,model,year,color)
  // constraint to include trim, so the table is rebuilt in place — ids are kept
  // identical so customers.car_inventory_id references stay valid. Foreign keys
  // must be OFF for this: with them ON, DROP TABLE car_inventory_old fires the
  // ON DELETE SET NULL action for every row that referenced it (nulling all
  // those links) even though a same-named replacement table already exists —
  // this is standard SQLite table-surgery procedure, not a quirk to avoid.
  const carInventoryCols = db.prepare("PRAGMA table_info(car_inventory)").all().map(c => c.name);
  if (!carInventoryCols.includes('trim')) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('ALTER TABLE car_inventory RENAME TO car_inventory_old');
    db.exec(`CREATE TABLE car_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year TEXT NOT NULL,
      trim TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL,
      purchase_price REAL,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(brand, model, year, trim, color)
    )`);
    db.exec(`INSERT INTO car_inventory (id, brand, model, year, trim, color, purchase_price, is_demo, created_at)
      SELECT id, brand, model, year, '', color, purchase_price, is_demo, created_at FROM car_inventory_old`);
    db.exec('DROP TABLE car_inventory_old');
    db.exec('PRAGMA foreign_keys = ON');
  }

  // Repairs a SQLite quirk left behind by the two rebuilds above: when a
  // table is renamed (ALTER TABLE x RENAME TO x_old), SQLite automatically
  // rewrites the FOREIGN KEY clause text of every *other* table that
  // references it, so it keeps pointing at the renamed table — so once the
  // rebuild finishes and drops "customers_old"/"car_inventory_old", any
  // table whose FK text got rewritten to that temporary name is left
  // referencing a table that no longer exists. Every INSERT/UPDATE that
  // needs to check that constraint then fails with something like
  // "no such table: main.customers_old" — this is exactly the bug behind
  // the recurring "can't upload attachments" report: attachments.customer_id
  // silently ended up referencing "customers_old" the first time an old
  // tenant's database went through the estimara_number rebuild, and nothing
  // ever fixed it back up afterward. A plain text patch to sqlite_master
  // (PRAGMA writable_schema) was tested and doesn't take effect on an
  // already-open connection without closing and reopening it, which doesn't
  // fit how connections are cached per tenant here — so the fix is to
  // rebuild the affected table again, which reliably updates SQLite's live
  // schema on the same connection. Rebuilding "prospects" to fix its own
  // stale reference re-triggers the identical bug one level down on
  // "prospect_log" (which references prospects), so that's checked and
  // repaired right after.
  // Checks whether any FOREIGN KEY clause in this table's current CREATE
  // statement points at a table that doesn't actually exist right now —
  // rather than checking for one specific stale name, since fixing
  // "customers" itself (below) renames it too and would otherwise silently
  // re-corrupt attachments/contact_log/prospects with a *new* temporary
  // name in the same pass.
  function hasOrphanedReference(tableName) {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    if (!row || !row.sql) return false;
    const refs = [...row.sql.matchAll(/REFERENCES\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(/gi)].map(m => m[1]);
    if (!refs.length) return false;
    const existing = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name));
    return refs.some(r => !existing.has(r));
  }
  function rebuildTable(tableName, createSql, indexSql) {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all().map(c => c.name).join(', ');
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(`ALTER TABLE ${tableName} RENAME TO ${tableName}_fkfix_old`);
    db.exec(createSql);
    db.exec(`INSERT INTO ${tableName} (${cols}) SELECT ${cols} FROM ${tableName}_fkfix_old`);
    db.exec(`DROP TABLE ${tableName}_fkfix_old`);
    if (indexSql) db.exec(indexSql);
    db.exec('PRAGMA foreign_keys = ON');
  }

  if (hasOrphanedReference('customers')) {
    rebuildTable('customers', `CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_type TEXT NOT NULL DEFAULT 'رخصة واستمارة',
      customer_name TEXT NOT NULL,
      national_id TEXT NOT NULL,
      sale_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      bank_name TEXT,
      delivery_at TEXT,
      car_type TEXT NOT NULL,
      car_inventory_id INTEGER REFERENCES car_inventory(id) ON DELETE SET NULL,
      vin TEXT NOT NULL UNIQUE,
      estimara_number TEXT UNIQUE,
      phone TEXT,
      salesperson TEXT,
      price REAL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'جديد',
      reported INTEGER NOT NULL DEFAULT 0,
      reported_at TEXT,
      followup_done INTEGER NOT NULL DEFAULT 0,
      followup_result TEXT,
      followup_note TEXT,
      followup_at TEXT,
      created_by TEXT,
      updated_by TEXT,
      custom_data TEXT,
      buyer_id INTEGER REFERENCES buyers(id) ON DELETE SET NULL,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`, 'CREATE INDEX IF NOT EXISTS idx_customers_sale_date ON customers(sale_date)');
  }
  if (hasOrphanedReference('contact_log')) {
    rebuildTable('contact_log', `CREATE TABLE contact_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      contact_date TEXT NOT NULL,
      type TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    )`, 'CREATE INDEX IF NOT EXISTS idx_contact_log_customer ON contact_log(customer_id)');
  }
  if (hasOrphanedReference('attachments')) {
    rebuildTable('attachments', `CREATE TABLE attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      label TEXT,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_by TEXT,
      created_at TEXT NOT NULL
    )`, 'CREATE INDEX IF NOT EXISTS idx_attachments_customer ON attachments(customer_id)');
  }
  if (hasOrphanedReference('prospects')) {
    rebuildTable('prospects', `CREATE TABLE prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      source TEXT,
      interested_car TEXT,
      stage TEXT NOT NULL DEFAULT 'جديد',
      salesperson TEXT,
      notes TEXT,
      converted_customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      custom_data TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`, null);
  }
  if (hasOrphanedReference('prospect_log')) {
    rebuildTable('prospect_log', `CREATE TABLE prospect_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
      contact_date TEXT NOT NULL,
      type TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    )`, 'CREATE INDEX IF NOT EXISTS idx_prospect_log_prospect ON prospect_log(prospect_id)');
  }
  if (hasOrphanedReference('sale_cars')) {
    rebuildTable('sale_cars', `CREATE TABLE sale_cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      car_type TEXT NOT NULL,
      car_inventory_id INTEGER REFERENCES car_inventory(id) ON DELETE SET NULL,
      vin TEXT NOT NULL UNIQUE,
      estimara_number TEXT UNIQUE,
      price REAL,
      created_at TEXT NOT NULL
    )`, 'CREATE INDEX IF NOT EXISTS idx_sale_cars_customer ON sale_cars(customer_id)');
  }

  // Migration for tenant databases created before multi-car sales existed:
  // backfill one sale_cars row per existing customer from its own (still
  // populated, still kept in sync going forward) car_type/vin/etc. columns
  // — anything already backfilled is skipped via NOT EXISTS, so this is
  // safe to run on every initSchema() call.
  const needsCarBackfill = db.prepare(`
    SELECT c.id, c.car_type, c.car_inventory_id, c.vin, c.estimara_number, c.price, c.created_at
    FROM customers c
    WHERE NOT EXISTS (SELECT 1 FROM sale_cars sc WHERE sc.customer_id = c.id)
  `).all();
  if (needsCarBackfill.length) {
    const insertCar = db.prepare(`INSERT INTO sale_cars (customer_id, car_type, car_inventory_id, vin, estimara_number, price, created_at) VALUES (?,?,?,?,?,?,?)`);
    for (const c of needsCarBackfill) {
      insertCar.run(c.id, c.car_type, c.car_inventory_id, c.vin, c.estimara_number, c.price, c.created_at);
    }
  }

  // Migration for tenant databases created before buyer profiles existed:
  // link every existing sale to a buyer, grouping sales by (customer_type,
  // national_id) — the same identifier the add-sale form already treats as
  // "this is the same person/dealer". Processed oldest-first so a buyer's
  // name/phone end up matching their most recent sale (people's phone
  // numbers/name spelling can drift over time; the latest sale is the best
  // guess at their current info). Anything already linked is skipped, so
  // this only ever touches genuinely legacy rows.
  const needsBuyerLink = db.prepare(`
    SELECT id, customer_type, customer_name, national_id, phone, created_at
    FROM customers WHERE buyer_id IS NULL ORDER BY created_at ASC, id ASC
  `).all();
  if (needsBuyerLink.length) {
    const findBuyer = db.prepare('SELECT id FROM buyers WHERE customer_type = ? AND national_id = ?');
    const insertBuyer = db.prepare('INSERT INTO buyers (customer_type, customer_name, national_id, phone, created_at, updated_at) VALUES (?,?,?,?,?,?)');
    const touchBuyer = db.prepare('UPDATE buyers SET customer_name = ?, phone = ?, updated_at = ? WHERE id = ?');
    const linkCustomer = db.prepare('UPDATE customers SET buyer_id = ? WHERE id = ?');
    for (const c of needsBuyerLink) {
      let buyer = findBuyer.get(c.customer_type, c.national_id);
      let buyerId;
      if (buyer) {
        touchBuyer.run(c.customer_name, c.phone, c.created_at, buyer.id);
        buyerId = buyer.id;
      } else {
        const info = insertBuyer.run(c.customer_type, c.customer_name, c.national_id, c.phone, c.created_at, c.created_at);
        buyerId = info.lastInsertRowid;
      }
      linkCustomer.run(buyerId, c.id);
    }
  }

  // Migration for tenant databases created before custom fields existed.
  const prospectCols = db.prepare("PRAGMA table_info(prospects)").all().map(c => c.name);
  if (!prospectCols.includes('custom_data')) {
    db.exec('ALTER TABLE prospects ADD COLUMN custom_data TEXT');
  }

  // Migration for tenants created before roles existed: default to 'manager'
  // (not 'employee') so accounts that already had full access don't suddenly
  // lose it — the new admin-only pages only start being enforced going forward.
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'manager'");
  }
  // Migration for tenants created before password-reset-by-email existed —
  // accounts made before this have no email on file, so self-service reset
  // won't work for them until someone sets one (see /users email edit).
  if (!userCols.includes('email')) {
    db.exec('ALTER TABLE users ADD COLUMN email TEXT');
  }
  if (!userCols.includes('reset_token')) {
    db.exec('ALTER TABLE users ADD COLUMN reset_token TEXT');
  }
  if (!userCols.includes('reset_token_expires')) {
    db.exec('ALTER TABLE users ADD COLUMN reset_token_expires TEXT');
  }

  const appSettingsExists = db.prepare('SELECT 1 FROM app_settings WHERE id = 1').get();
  if (!appSettingsExists) {
    db.prepare('INSERT INTO app_settings (id, auto_assign_prospects) VALUES (1, 0)').run();
  }

  const appSettingsCols = db.prepare("PRAGMA table_info(app_settings)").all().map(c => c.name);
  if (!appSettingsCols.includes('toyota_catalog_seeded_at')) {
    db.exec('ALTER TABLE app_settings ADD COLUMN toyota_catalog_seeded_at TEXT');
  }

  // One-time replacement of any existing "Toyota" car_inventory entries with
  // the official toyota.com.sa lineup above — requested explicitly by the
  // owner ("احذف كل سيارات تويوتا وارجع سوّها"), so old/hand-entered Toyota
  // rows are deleted outright rather than merged/deduped against the new
  // list. Guarded by toyota_catalog_seeded_at so this runs exactly once per
  // tenant — without the guard, every server restart would wipe out any
  // color/price a seller later fills in per unit through the /cars UI.
  const toyotaSeeded = db.prepare('SELECT toyota_catalog_seeded_at FROM app_settings WHERE id = 1').get();
  if (!toyotaSeeded.toyota_catalog_seeded_at) {
    const nowTs = new Date().toISOString();
    db.exec("DELETE FROM car_inventory WHERE brand = 'Toyota'");
    const insertToyota = db.prepare('INSERT INTO car_inventory (brand, model, year, trim, color, purchase_price, is_demo, created_at) VALUES (?,?,?,?,?,?,0,?)');
    for (const { model, year, trims } of TOYOTA_CATALOG) {
      for (const trim of trims) {
        insertToyota.run('Toyota', model, year, trim, '', null, nowTs);
      }
    }
    db.prepare('UPDATE app_settings SET toyota_catalog_seeded_at = ? WHERE id = 1').run(nowTs);
  }

  const sopExists = db.prepare('SELECT 1 FROM sop WHERE id = 1').get();
  if (!sopExists) {
    const name = tenantName || 'معرضك';
    db.prepare('INSERT INTO sop (id, content, updated_at) VALUES (1, ?, ?)').run(
      `إجراءات التعامل مع العميل - ${name}

1. استقبال العميل خلال دقيقتين من وصوله.
2. عرض السيارات المطلوبة وشرح المواصفات والفروقات بين الفئات.
3. عند إتمام البيع: تعبئة جميع بيانات العميل والسيارة في النظام فور توقيع العقد.
4. تحديد موعد التسليم بالتنسيق مع العميل، وتسجيله في النظام.
5. عملية التسليم: التأكد من نظافة السيارة، خلوها من الروائح، حضور المدير أو المشرف، وشرح كتيب الضمان ودليل المالك للعميل.
6. بعد 24 ساعة من التسليم: التواصل مع العميل والسؤال عن تجربته، وتسجيل النتيجة في النظام (راضٍ / غير راضٍ) مع ملاحظة.
7. تبليغ عملية البيع رسميًا قبل نهاية الشهر التالي لشهر البيع.
8. أي تواصل لاحق مع العميل (مكالمة، زيارة، رسالة) يُسجَّل في سجل التواصل الخاص بملفه.
9. العميل غير الراضي: تصعيد فوري للمشرف المباشر ومتابعة الحل خلال 48 ساعة.

(هذا النص قابل للتعديل من صفحة "الإجراءات" داخل النظام)`,
      new Date().toISOString()
    );
  }
}

module.exports = { initSchema };
