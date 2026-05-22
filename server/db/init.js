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
  ]
  for (const sql of migrations) {
    try { db.exec(sql); console.log('  [DB] Migration applied:', sql.slice(0, 60)) }
    catch (e) { /* column may already exist - ignore */ }
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
