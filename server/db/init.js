const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')

const DB_PATH = path.join(__dirname, '..', 'data', 'review-saas.db')

let db = null

function getDb() {
  if (db) return db
  throw new Error('Database not initialized. Call initDb() first.')
}

async function initDb() {
  const SQL = await initSqlJs()
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  db.run(schema)
  runMigrations()
  saveDb()
  console.log('  [DB] Schema ready')
  return db
}

function runMigrations() {
  const migrations = [
    "ALTER TABLE merchants ADD COLUMN onboarding_done INTEGER DEFAULT 0",
    "ALTER TABLE merchants ADD COLUMN trial_started_at TEXT",
    "ALTER TABLE merchants ADD COLUMN last_checked_at TEXT",
    "ALTER TABLE merchants ADD COLUMN referral_code TEXT",
    "ALTER TABLE merchants ADD COLUMN referred_by INTEGER",
    "ALTER TABLE merchants ADD COLUMN bonus_monthly INTEGER DEFAULT 0",
    "ALTER TABLE merchants ADD COLUMN phone TEXT",
  ]
  for (const sql of migrations) {
    try { db.exec(sql); console.log('  [DB] Migration applied:', sql.slice(0, 60)) }
    catch (e) { /* column may already exist - ignore */ }
  }

  // Migration: allow NULL email for phone-only registration
  // SQLite can't DROP NOT NULL via ALTER TABLE, so recreate the table atomically
  try {
    // Check if migration already done — new merchants table may not have NOT NULL on email
    const info = db.exec("PRAGMA table_info(merchants)")
    const emailCol = info[0]?.values?.find(r => r[1] === 'email')
    if (emailCol && emailCol[3] === 1) { // 1 = NOT NULL
      db.exec("BEGIN TRANSACTION")
      db.exec(`CREATE TABLE merchants_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        store_name TEXT DEFAULT '',
        store_type TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        plan TEXT DEFAULT 'free',
        monthly_limit INTEGER DEFAULT 50,
        used_this_month INTEGER DEFAULT 0,
        reset_date TEXT,
        onboarding_done INTEGER DEFAULT 0,
        trial_started_at TEXT,
        last_checked_at TEXT,
        referral_code TEXT UNIQUE,
        referred_by INTEGER,
        bonus_monthly INTEGER DEFAULT 0,
        FOREIGN KEY (referred_by) REFERENCES merchants(id)
      )`)
      // Use explicit column list to avoid mismatch if columns are later added
      db.exec(`INSERT INTO merchants_new (id, email, phone, password_hash, store_name, store_type, created_at, plan, monthly_limit, used_this_month, reset_date, onboarding_done, trial_started_at, last_checked_at, referral_code, referred_by, bonus_monthly) SELECT id, email, phone, password_hash, store_name, store_type, created_at, plan, monthly_limit, used_this_month, reset_date, onboarding_done, trial_started_at, last_checked_at, referral_code, referred_by, bonus_monthly FROM merchants`)
      db.exec("UPDATE merchants_new SET email = NULL WHERE email = ''")
      db.exec("DROP TABLE merchants")
      db.exec("ALTER TABLE merchants_new RENAME TO merchants")
      db.exec("COMMIT")
      console.log('  [DB] Migration applied: nullable email')
    }
  } catch (e) {
    try { db.exec("ROLLBACK") } catch (_) {}
    console.log('  [DB] Migration skipped (nullable email):', e.message.slice(0, 100))
  }
}

function saveDb() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

// Wrapper: db.prepare(sql).get(params) → single row
function dbGet(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const result = stmt.getAsObject()
    stmt.free()
    return result
  }
  stmt.free()
  return null
}

// Wrapper: db.prepare(sql).all(params) → array of rows
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

// Wrapper: db.run(sql, params) → { lastInsertRowid, changes }
function dbRun(sql, params = []) {
  db.run(sql, params)
  // Read these BEFORE saveDb() — db.export() resets last_insert_rowid
  const lastInsertRowid = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0]
  const changes = db.getRowsModified()
  saveDb()
  return { lastInsertRowid, changes }
}

// Wrapper: db.exec(sql) for schema
function dbExec(sql) {
  db.exec(sql)
  saveDb()
}

module.exports = { getDb, initDb, saveDb, dbGet, dbAll, dbRun, dbExec }
