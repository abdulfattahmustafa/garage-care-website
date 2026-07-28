const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite'); // built into Node (22.5+) - no native compiler needed

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'alhadaf.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  sale_date TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  delivery_at TEXT,
  car_type TEXT NOT NULL,
  vin TEXT NOT NULL UNIQUE,
  estimara_number TEXT NOT NULL UNIQUE,
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

CREATE INDEX IF NOT EXISTS idx_customers_sale_date ON customers(sale_date);
CREATE INDEX IF NOT EXISTS idx_contact_log_customer ON contact_log(customer_id);
`);

const sopExists = db.prepare('SELECT 1 FROM sop WHERE id = 1').get();
if (!sopExists) {
  db.prepare('INSERT INTO sop (id, content, updated_at) VALUES (1, ?, ?)').run(
    `إجراءات التعامل مع العميل - معرض الهدف الأميز

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

module.exports = db;
