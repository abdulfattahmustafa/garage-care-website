// Combines a manual contact log (calls/visits/messages someone typed in)
// with the automatic activity_log entries for the same customer/prospect
// (sale added, edited, attachment uploaded, followup recorded...) into one
// chronological list — "سجل تواصل موحّد" — instead of the two living in
// separate, disconnected sections.
function getUnifiedTimeline(db, { entityType, entityId, logTable, logIdCol }) {
  const manual = db.prepare(`SELECT * FROM ${logTable} WHERE ${logIdCol} = ?`).all(entityId).map(l => ({
    kind: 'manual',
    displayDate: l.contact_date,
    type: l.type,
    note: l.note,
    created_at: l.created_at,
  }));

  const system = db.prepare(`SELECT * FROM activity_log WHERE entity_type = ? AND entity_id = ?`).all(entityType, entityId).map(a => ({
    kind: 'system',
    displayDate: a.created_at.slice(0, 10),
    action: a.action,
    details: a.details,
    user_name: a.user_name,
    created_at: a.created_at,
  }));

  // Sorted by when each entry was actually logged (created_at), not the
  // user-editable "contact_date" on manual entries — keeps ordering
  // predictable even if someone backdates a call they forgot to log.
  return [...manual, ...system].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

module.exports = { getUnifiedTimeline };
