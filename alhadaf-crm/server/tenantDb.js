const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { initSchema } = require('./lib/schema');

// DATA_DIR lets a hosting provider point this at a persistent disk mount
// (e.g. Render) instead of the app folder, which may be wiped on redeploy.
const baseDataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
if (!fs.existsSync(baseDataDir)) fs.mkdirSync(baseDataDir, { recursive: true });

// The registry is the one thing shared across every showroom: just enough
// to look up "does this dealer code exist, and what's its display name?"
// before ever touching a tenant's actual business data.
const registryDb = new DatabaseSync(path.join(baseDataDir, 'registry.db'));
registryDb.exec('PRAGMA journal_mode = WAL');
registryDb.exec(`
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
`);

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;

function validSlug(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug);
}

function tenantDir(slug) {
  return path.join(baseDataDir, 'tenants', slug);
}

function getUploadsDir(slug) {
  const dir = path.join(tenantDir(slug), 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getTenantBySlug(slug) {
  return registryDb.prepare('SELECT * FROM tenants WHERE slug = ?').get(slug);
}

function listTenants() {
  return registryDb.prepare('SELECT * FROM tenants ORDER BY created_at').all();
}

function setTenantActive(slug, isActive) {
  registryDb.prepare('UPDATE tenants SET is_active = ? WHERE slug = ?').run(isActive ? 1 : 0, slug);
}

// One DatabaseSync connection per tenant, opened lazily and kept open for
// the life of the process — this is what makes every tenant's data live in
// a completely separate file, so a bug in a query can never leak rows
// across showrooms (there is no shared table for it to leak through).
const dbCache = new Map();

function getTenantDb(slug) {
  if (dbCache.has(slug)) return dbCache.get(slug);

  const dir = tenantDir(slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(path.join(dir, 'data.db'));
  const meta = getTenantBySlug(slug);
  initSchema(db, { tenantName: meta ? meta.name : null });

  dbCache.set(slug, db);
  return db;
}

function createTenant(slug, name) {
  if (!validSlug(slug)) {
    throw new Error('رمز المعرض لازم يكون حروف إنجليزية صغيرة وأرقام وشرطة (-) بس، بين 3 و30 خانة');
  }
  if (getTenantBySlug(slug)) {
    throw new Error('رمز المعرض هذا مستخدم من معرض ثاني — اختر رمز مختلف');
  }
  registryDb.prepare('INSERT INTO tenants (slug, name, is_active, created_at) VALUES (?, ?, 1, ?)')
    .run(slug, name, new Date().toISOString());
  return getTenantDb(slug); // provisions the tenant's own database file + schema
}

// Registers a tenant whose database file was already placed on disk by hand
// (used only by the legacy single-showroom migration in index.js, where the
// old data/alhadaf.db is copied into place before this is called).
function registerLegacyTenant(slug, name) {
  if (getTenantBySlug(slug)) return;
  registryDb.prepare('INSERT INTO tenants (slug, name, is_active, created_at) VALUES (?, ?, 1, ?)')
    .run(slug, name, new Date().toISOString());
}

module.exports = {
  baseDataDir,
  validSlug,
  getTenantDb,
  getTenantBySlug,
  listTenants,
  createTenant,
  registerLegacyTenant,
  getUploadsDir,
  setTenantActive,
};
