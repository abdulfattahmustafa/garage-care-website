function endOfMonthAfter(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  // end of the month following the sale's month
  const deadline = new Date(d.getFullYear(), d.getMonth() + 2, 0, 23, 59, 59);
  return deadline;
}

function reportDeadlineISO(saleDate) {
  return endOfMonthAfter(saleDate).toISOString().slice(0, 10);
}

function isReportOverdue(customer, now = new Date()) {
  if (customer.reported) return false;
  const deadline = endOfMonthAfter(customer.sale_date);
  return now > deadline;
}

function followupDueAt(customer) {
  if (!customer.delivery_at) return null;
  const d = new Date(customer.delivery_at);
  d.setHours(d.getHours() + 24);
  return d;
}

function isFollowupDue(customer, now = new Date()) {
  if (customer.followup_done) return false;
  const dueAt = followupDueAt(customer);
  if (!dueAt) return false;
  return now >= dueAt;
}

function validateNationalId(v) {
  return /^\d{10}$/.test(v || '');
}

function validateVin(v) {
  return /^[A-Za-z0-9]{17}$/.test(v || '');
}

function validatePhone(v) {
  if (!v) return true; // optional field
  return /^05\d{8}$/.test(v);
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleString('ar-SA-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

module.exports = {
  endOfMonthAfter,
  reportDeadlineISO,
  isReportOverdue,
  followupDueAt,
  isFollowupDue,
  validateNationalId,
  validateVin,
  validatePhone,
  fmtDate,
  fmtDateTime,
};
