const db = require('./db');

const isClear = process.argv.includes('--clear');

if (isClear) {
  const c1 = db.prepare('DELETE FROM customers WHERE is_demo = 1').run();
  const c2 = db.prepare('DELETE FROM salespeople WHERE is_demo = 1').run();
  const c3 = db.prepare('DELETE FROM car_inventory WHERE is_demo = 1').run();
  console.log(`\n✅ تم حذف ${c1.changes} عميل تجريبي، ${c2.changes} بائع تجريبي، ${c3.changes} سيارة تجريبية من القائمة. البيانات الحقيقية لم تُمس.\n`);
  process.exit(0);
}

const existingDemo = db.prepare('SELECT COUNT(*) c FROM customers WHERE is_demo = 1').get().c;
if (existingDemo > 0) {
  console.log('\nℹ️  البيانات التجريبية موجودة أصلاً. لإعادة إنشائها شغّل: npm run clear-demo ثم npm run seed\n');
  process.exit(0);
}

const now = new Date();
function daysAgo(n) { const d = new Date(now); d.setDate(d.getDate() - n); return d; }
function iso(d) { return d.toISOString().slice(0, 10); }
function isoDT(d) { return d.toISOString().slice(0, 16); }

const ts0 = now.toISOString();
const insertCar = db.prepare('INSERT INTO car_inventory (brand, model, year, color, purchase_price, is_demo, created_at) VALUES (?,?,?,?,?,1,?)');
const demoCars = [
  { brand: 'Toyota', model: 'Camry', year: '2026', color: 'أبيض', purchase_price: 118000 },
  { brand: 'Hyundai', model: 'Tucson', year: '2025', color: 'أسود', purchase_price: 106000 },
  { brand: 'Nissan', model: 'Sunny', year: '2025', color: 'فضي', purchase_price: 55000 },
  { brand: 'Suzuki', model: 'Ciaz', year: '2025', color: 'أبيض', purchase_price: 52000 },
];
const carIds = demoCars.map(c => insertCar.run(c.brand, c.model, c.year, c.color, c.purchase_price, ts0).lastInsertRowid);

const demoCustomers = [
  {
    customer_name: 'خالد عبدالله السلمي',
    national_id: '1012345678',
    sale_date: iso(daysAgo(45)),
    payment_method: 'تمويل (إيجار تمويلي)',
    delivery_at: isoDT(daysAgo(44)),
    car_type: 'Toyota Camry 2026 - أبيض',
    car_inventory_id: carIds[0],
    vin: 'JTNBE46K003123456',
    estimara_number: 'EST-100234',
    phone: '0501234567',
    salesperson: 'محمد العتيبي',
    price: 128000,
    notes: 'يفضل التواصل مساءً',
    status: 'تم التسليم',
    reported: 0,
    followup_done: 1,
    followup_result: 'راضٍ',
    followup_note: 'أشاد بسرعة التسليم ونظافة السيارة',
    followup_at: isoDT(daysAgo(43)),
  },
  {
    customer_name: 'سارة فهد القحطاني',
    national_id: '1023456789',
    sale_date: iso(daysAgo(3)),
    payment_method: 'نقدي',
    delivery_at: isoDT(daysAgo(2)),
    car_type: 'Hyundai Tucson 2025 - أسود',
    car_inventory_id: carIds[1],
    vin: 'KMHJ381AKLU234567',
    estimara_number: 'EST-100235',
    phone: '0512345678',
    salesperson: 'محمد العتيبي',
    price: 115000,
    notes: '',
    status: 'تم التسليم',
    reported: 0,
    followup_done: 0,
    followup_result: null,
    followup_note: null,
    followup_at: null,
  },
  {
    customer_name: 'عبدالرحمن ياسر الحربي',
    national_id: '1034567890',
    sale_date: iso(daysAgo(75)),
    payment_method: 'مرابحة',
    delivery_at: isoDT(daysAgo(74)),
    car_type: 'Nissan Sunny 2025 - فضي',
    car_inventory_id: carIds[2],
    vin: '3N1AB7AP0KY345678',
    estimara_number: 'EST-100236',
    phone: '0523456789',
    salesperson: 'نورة الدوسري',
    price: 62000,
    notes: 'عميل متكرر - اشترى سيارتين سابقًا',
    status: 'عميل متكرر',
    reported: 0,
    followup_done: 1,
    followup_result: 'راضٍ',
    followup_note: 'تمت المتابعة هاتفيًا',
    followup_at: isoDT(daysAgo(73)),
  },
  {
    customer_name: 'منى سعيد الزهراني',
    national_id: '1045678901',
    sale_date: iso(daysAgo(10)),
    payment_method: 'شركات',
    delivery_at: isoDT(daysAgo(9)),
    car_type: 'Suzuki Ciaz 2025 - أبيض',
    car_inventory_id: carIds[3],
    vin: 'MHYFN72A0KJ456789',
    estimara_number: 'EST-100237',
    phone: '0534567890',
    salesperson: 'نورة الدوسري',
    price: 58000,
    notes: '',
    status: 'تمت المتابعة',
    reported: 1,
    followup_done: 1,
    followup_result: 'غير راضٍ',
    followup_note: 'اشتكت من تأخر تسليم أوراق الضمان - تم التصعيد للمشرف',
    followup_at: isoDT(daysAgo(8)),
  },
];

const ts = now.toISOString();
const insert = db.prepare(`INSERT INTO customers
  (customer_name, national_id, sale_date, payment_method, delivery_at, car_type, car_inventory_id, vin, estimara_number, phone, salesperson, price, notes, status, reported, reported_at, followup_done, followup_result, followup_note, followup_at, is_demo, created_at, updated_at)
  VALUES (@customer_name, @national_id, @sale_date, @payment_method, @delivery_at, @car_type, @car_inventory_id, @vin, @estimara_number, @phone, @salesperson, @price, @notes, @status, @reported, @reported_at, @followup_done, @followup_result, @followup_note, @followup_at, 1, @created_at, @updated_at)`);

const insertLog = db.prepare(`INSERT INTO contact_log (customer_id, contact_date, type, note, created_at) VALUES (?,?,?,?,?)`);

const ids = [];
for (const c of demoCustomers) {
  const info = insert.run({ ...c, reported_at: c.reported ? ts : null, created_at: ts, updated_at: ts });
  ids.push(info.lastInsertRowid);
}

insertLog.run(ids[0], iso(daysAgo(40)), 'مكالمة', 'اطمأننا عليه بعد أسبوع من التسليم، كل شيء تمام', ts);
insertLog.run(ids[2], iso(daysAgo(60)), 'زيارة', 'زار المعرض للاستفسار عن صيانة الـ 1000 كم', ts);
insertLog.run(ids[3], iso(daysAgo(5)), 'رسالة', 'تم إرسال رسالة واتساب لمتابعة شكواها بخصوص الضمان', ts);

const insertSalesperson = db.prepare('INSERT OR IGNORE INTO salespeople (name, is_demo, created_at) VALUES (?, 1, ?)');
['محمد العتيبي', 'نورة الدوسري'].forEach(name => insertSalesperson.run(name, ts));

console.log(`\n✅ تمت إضافة ${demoCustomers.length} عملاء تجريبيين + سجل تواصل تجريبي.`);
console.log('   لحذف البيانات التجريبية قبل إدخال بياناتك الحقيقية شغّل: npm run clear-demo\n');
