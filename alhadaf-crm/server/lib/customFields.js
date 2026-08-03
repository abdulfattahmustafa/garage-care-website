// Per-tenant custom fields: each showroom can define its own extra fields
// on customers/prospects (server/routes/settings.js manages the field
// definitions themselves). Values are stored as a JSON blob on the
// customers/prospects row (`custom_data` column) rather than a separate
// EAV table — simpler to read/write and avoids another migration-heavy
// table, at the cost of not being filterable/sortable in SQL. That's an
// acceptable trade here since these are display/data-entry fields, not
// something the list/report pages need to query by.

function getCustomFields(db, entityType) {
  return db.prepare('SELECT * FROM custom_fields WHERE entity_type = ? ORDER BY id').all(entityType);
}

function parseCustomData(json) {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Rebuilds a {fieldId: value} map straight from a submitted form body —
// used to re-populate the form after a validation error, since at that
// point there's no saved row to read custom_data from yet.
function valuesFromBody(fields, body) {
  const values = {};
  fields.forEach(f => { values[f.id] = (body['custom_' + f.id] || '').trim(); });
  return values;
}

// Validates required custom fields and builds the JSON-ready data object
// (empty/unset fields are simply omitted rather than stored as '').
function validateAndBuild(fields, body) {
  const errors = {};
  const data = {};
  fields.forEach(f => {
    const raw = (body['custom_' + f.id] || '').trim();
    if (f.required && !raw) {
      errors['custom_' + f.id] = `${f.label} إلزامي`;
    }
    if (raw) data[f.id] = raw;
  });
  return { data, errors };
}

module.exports = { getCustomFields, parseCustomData, valuesFromBody, validateAndBuild };
