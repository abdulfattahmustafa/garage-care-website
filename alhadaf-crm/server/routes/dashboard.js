const express = require('express');
const router = express.Router();
const { isReportOverdue, isFollowupDue, reportDeadlineISO, fmtDate } = require('../lib/util');

router.get('/', (req, res) => {
  const db = req.db;
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const thisYear = now.toISOString().slice(0, 4);

  const salesThisMonth = db.prepare(`SELECT COUNT(*) c FROM customers WHERE substr(sale_date,1,7)=?`).get(thisMonth).c;
  const salesThisYear = db.prepare(`SELECT COUNT(*) c FROM customers WHERE substr(sale_date,1,4)=?`).get(thisYear).c;
  const totalCustomers = db.prepare(`SELECT COUNT(*) c FROM customers`).get().c;

  const paymentDist = db.prepare(`SELECT payment_method, COUNT(*) c FROM customers GROUP BY payment_method ORDER BY c DESC`).all();

  const topModels = db.prepare(`SELECT car_type, COUNT(*) c FROM customers GROUP BY car_type ORDER BY c DESC LIMIT 6`).all();

  const salesPerformance = db.prepare(`
    SELECT COALESCE(NULLIF(salesperson,''),'غير محدد') salesperson, COUNT(*) c
    FROM customers GROUP BY salesperson ORDER BY c DESC LIMIT 10`).all();

  const totalProspects = db.prepare(`SELECT COUNT(*) c FROM prospects`).get().c;
  const activeProspects = db.prepare(`SELECT COUNT(*) c FROM prospects WHERE stage NOT IN ('تحوّل لعميل', 'لم يتم البيع')`).get().c;
  const prospectsByStage = db.prepare(`SELECT stage, COUNT(*) c FROM prospects GROUP BY stage`).all();

  const all = db.prepare(`SELECT * FROM customers`).all();

  // Dealer sales (معارض) don't get a post-sale followup — they're businesses,
  // not the end customer.
  const dueFollowups = all.filter(c => c.customer_type !== 'معارض' && isFollowupDue(c, now));
  const overdueReports = all.filter(c => isReportOverdue(c, now));
  const dueSoonReports = all.filter(c => {
    if (c.reported) return false;
    const deadline = new Date(reportDeadlineISO(c.sale_date) + 'T23:59:59');
    const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });

  let waLines = [`*تذكير مستحقات - ${req.session.tenantName || 'المعرض'}*`, ''];
  if (dueFollowups.length) {
    waLines.push(`📞 متابعة ما بعد بيع متأخرة (${dueFollowups.length}):`);
    dueFollowups.slice(0, 15).forEach(c => waLines.push(`- ${c.customer_name} (${c.car_type}) - جوال: ${c.phone || '—'}`));
    waLines.push('');
  }
  if (overdueReports.length) {
    waLines.push(`🔴 تبليغ مبيعات متأخر عن الموعد (${overdueReports.length}):`);
    overdueReports.slice(0, 15).forEach(c => waLines.push(`- ${c.customer_name} - استمارة ${c.estimara_number} - الموعد كان ${fmtDate(reportDeadlineISO(c.sale_date))}`));
    waLines.push('');
  }
  if (dueSoonReports.length) {
    waLines.push(`🟡 تبليغ مبيعات مستحق قريبًا (${dueSoonReports.length}):`);
    dueSoonReports.slice(0, 15).forEach(c => waLines.push(`- ${c.customer_name} - استمارة ${c.estimara_number} - الموعد ${fmtDate(reportDeadlineISO(c.sale_date))}`));
  }
  if (waLines.length === 2) waLines.push('لا يوجد مستحقات حالياً ✅');
  const waMessage = waLines.join('\n');

  res.render('dashboard', {
    salesThisMonth, salesThisYear, totalCustomers,
    paymentDist, topModels, salesPerformance,
    dueFollowups, overdueReports, dueSoonReports,
    totalProspects, activeProspects, prospectsByStage,
    waMessage,
    reportDeadlineISO, fmtDate,
  });
});

module.exports = router;
