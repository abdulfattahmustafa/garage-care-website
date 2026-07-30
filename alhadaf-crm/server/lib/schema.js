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

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_type TEXT NOT NULL DEFAULT 'رخصة واستمارة',
  customer_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  sale_date TEXT NOT NULL,
  payment_method TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_customers_sale_date ON customers(sale_date);
CREATE INDEX IF NOT EXISTS idx_contact_log_customer ON contact_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_prospect_log_prospect ON prospect_log(prospect_id);
CREATE INDEX IF NOT EXISTS idx_attachments_customer ON attachments(customer_id);
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
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    db.exec(`INSERT INTO customers
      (id, customer_type, customer_name, national_id, sale_date, payment_method, delivery_at, car_type, car_inventory_id, vin, estimara_number, phone, salesperson, price, notes, status, reported, reported_at, followup_done, followup_result, followup_note, followup_at, created_by, updated_by, is_demo, created_at, updated_at)
      SELECT id, customer_type, customer_name, national_id, sale_date, payment_method, delivery_at, car_type, car_inventory_id, vin, estimara_number, phone, salesperson, price, notes, status, reported, reported_at, followup_done, followup_result, followup_note, followup_at, created_by, updated_by, is_demo, created_at, updated_at
      FROM customers_old`);
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

  // Migration for tenants created before roles existed: default to 'manager'
  // (not 'employee') so accounts that already had full access don't suddenly
  // lose it — the new admin-only pages only start being enforced going forward.
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'manager'");
  }

  const appSettingsExists = db.prepare('SELECT 1 FROM app_settings WHERE id = 1').get();
  if (!appSettingsExists) {
    db.prepare('INSERT INTO app_settings (id, auto_assign_prospects) VALUES (1, 0)').run();
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
