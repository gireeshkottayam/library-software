const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const crypto = require('crypto')
const { machineIdSync } = require('node-machine-id')

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA9R09XT1erADhyxnl3UoBiY90dYJjDdfhuhem12bt4og=
-----END PUBLIC KEY-----`

const userDataPath = app.getPath('userData')
const persistentDbDir = path.join(userDataPath, 'db')
const legacyDbDir = app.isPackaged 
  ? path.join(process.resourcesPath, 'db') 
  : path.join(__dirname, 'db')

// Ensure persistent directory exists
if (!fs.existsSync(persistentDbDir)) {
  fs.mkdirSync(persistentDbDir, { recursive: true })
}

const dbPath = path.join(persistentDbDir, 'library.db')

// Migration Logic: If no DB in AppData, but exists in legacy location, move it
if (!fs.existsSync(dbPath)) {
  const legacyPath = path.join(legacyDbDir, 'library.db')
  if (fs.existsSync(legacyPath)) {
    try {
      fs.copyFileSync(legacyPath, dbPath)
      console.log('✅ Data migrated to persistent storage')
    } catch (err) {
      console.error('❌ Data migration failed:', err)
    }
  }
}

// The connection is `let` because a restore closes it, puts another database
// in its place and opens a new one.
let db = new Database(dbPath)

module.exports.getDbPath = () => dbPath

const backupDir = path.join(persistentDbDir, 'backups')
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
module.exports.getBackupPath = () => backupDir
module.exports.createBackupFile = createBackupFile
module.exports.restoreFromFile = restoreFromFile
/**
 * The newest automatic backup file.
 *
 * @returns {string|null} the full path, or null when there is no backup yet
 */
module.exports.getLatestBackupFile = () => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(name => name.startsWith('library_backup_') && name.endsWith('.db'))
      .map(name => path.join(backupDir, name))
      .map(file => ({ file, time: fs.statSync(file).mtimeMs }))
      .sort((a, b) => b.time - a.time)
    return files.length ? files[0].file : null
  } catch (err) {
    console.error('Reading the backup folder failed:', err)
    return null
  }
}
/**
 * Close the database connection.
 *
 * Closing checkpoints the write-ahead log into the database file, so the
 * database on disk is complete. Used when the app quits and by the tests.
 */
module.exports.closeDatabase = () => {
  try { db.close() } catch (e) {}
}

/**
 * Write every pending change of the write-ahead log into the database file.
 *
 * The database runs in WAL mode, so a plain copy of `library.db` can be
 * missing the changes that are still in `library.db-wal`. Every backup
 * checkpoints first, so a backup always holds the complete data.
 */
function checkpointWal() {
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch (err) {
    console.error('WAL checkpoint failed:', err)
  }
}

function performAutoBackup() {
  try {
    checkpointWal()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const bFile = path.join(backupDir, `library_backup_${timestamp}.db`)
    fs.copyFileSync(dbPath, bFile)

    // Cleanup: Keep only last 100 backups to avoid disk fill?
    // The user said "not replacing", but disk space is real.
    // I will keep it unlimited for now as per "not replacing" request.
  } catch (err) {
    console.error('Auto Backup failed:', err)
  }
}

/**
 * Write a backup of the current database to `targetPath`.
 *
 * Uses the SQLite backup API so the copy also contains the data that is
 * still in the write-ahead log, and so the backup file is a clean database
 * that any SQLite tool can open.
 *
 * @param {string} targetPath where the backup file is written
 * @returns {Promise<{ success: boolean, path?: string, message?: string }>}
 */
async function createBackupFile(targetPath) {
  try {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath)
    await db.backup(targetPath)
    return { success: true, path: targetPath }
  } catch (err) {
    console.error('Backup failed:', err)
    return { success: false, message: err.message }
  }
}

/**
 * Check that a file is a usable library database before it replaces the
 * live one. A wrong file must never destroy the current data.
 *
 * @param {string} sourcePath the file the user picked
 * @returns {{ ok: boolean, message?: string, books?: number }}
 */
function inspectBackupFile(sourcePath) {
  let source = null
  try {
    const same = path.resolve(sourcePath).toLowerCase() === path.resolve(dbPath).toLowerCase()
    if (same) {
      return { ok: false, message: 'This is the database that is in use. Pick a backup file.' }
    }
    source = new Database(sourcePath, { readonly: true, fileMustExist: true })
    const tables = source
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map(r => r.name)
    if (!tables.includes('books') || !tables.includes('members')) {
      return {
        ok: false,
        message: 'This file is not a library backup. It has no books and members.',
      }
    }
    const books = source.prepare('SELECT COUNT(*) AS c FROM books').get().c
    return { ok: true, books }
  } catch (err) {
    return { ok: false, message: `This file cannot be opened as a library backup: ${err.message}` }
  } finally {
    if (source) { try { source.close() } catch (e) {} }
  }
}

/**
 * Replace the live database with a backup file.
 *
 * The copy used to be a plain file copy while the database was still open.
 * The database runs in WAL mode, so the write-ahead log was checkpointed into
 * the new file when the app exited and the old data came back - the restore
 * was silently lost. The database is closed now, the write-ahead log is
 * removed and the schema is applied to the restored file again.
 *
 * @param {string} sourcePath the backup file the user picked
 * @returns {Promise<{ success: boolean, message?: string, books?: number, missingAmounts?: number }>}
 */
async function restoreFromFile(sourcePath) {
  const check = inspectBackupFile(sourcePath)
  if (!check.ok) return { success: false, message: check.message }

  // A safety copy of the current data, so a restore can be undone.
  performAutoBackup()

  try {
    db.close()
  } catch (err) {
    console.error('Closing the database failed:', err)
  }
  // The write-ahead log belongs to the old database and must not be replayed
  // onto the restored file. If it cannot be removed, another program still has
  // the database open and the restore is not safe.
  const leftovers = []
  for (const suffix of ['-wal', '-shm']) {
    const file = dbPath + suffix
    try { if (fs.existsSync(file)) fs.unlinkSync(file) }
    catch (err) { leftovers.push(file) }
  }
  if (leftovers.length) {
    db = new Database(dbPath)
    refreshSchema()
    return {
      success: false,
      message: 'The database is still in use. Close the software and restore the backup again.',
    }
  }
  try {
    fs.copyFileSync(sourcePath, dbPath)
  } catch (err) {
    console.error('Restore failed:', err)
    db = new Database(dbPath)
    refreshSchema()
    return { success: false, message: `The backup could not be put in place: ${err.message}` }
  }

  db = new Database(dbPath)
  refreshSchema()

  const missingAmounts = db
    .prepare('SELECT COUNT(*) AS c FROM books WHERE price IS NULL')
    .get().c
  console.log(`✅ Backup restored: ${check.books} book(s), ${missingAmounts} without an amount`)
  return { success: true, books: check.books, missingAmounts }
}

// ─── Schema ───────────────────────────────────────────────────────────────────
/**
 * Create the tables the app needs.
 *
 * `IF NOT EXISTS` is used everywhere, so this can be run again on a restored
 * backup: the tables that are already there keep their data and only the
 * missing ones are created.
 */
function applyTables() {
  db.exec(`
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'librarian',
  full_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  title_ml TEXT,
  author TEXT,
  translator TEXT,
  category TEXT,
  publisher TEXT,
  isbn TEXT,
  edition TEXT,
  year INTEGER,
  language TEXT DEFAULT 'English',
  shelf_no TEXT,
  qr_code_no TEXT,
  cover_image TEXT,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  condition TEXT DEFAULT 'Good',
  description TEXT,
  volume TEXT,
  price REAL,
  sponsor_id INTEGER REFERENCES sponsors(id),
  date_added DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reg_no TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  full_name_ml TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  id_card_type TEXT,
  id_card_no TEXT NOT NULL,
  address TEXT,
  address_ml TEXT,
  photo TEXT,
  dob TEXT,
  gender TEXT,
  blood_group TEXT,
  occupation TEXT,
  email TEXT,
  member_type TEXT DEFAULT 'General',
  fee_paid INTEGER DEFAULT 0,
  fee_amount REAL DEFAULT 0,
  payment_date TEXT,
  membership_start TEXT,
  membership_expiry TEXT,
  fine_balance REAL DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS borrowings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER REFERENCES members(id),
  book_id INTEGER REFERENCES books(id),
  issue_date TEXT DEFAULT CURRENT_DATE,
  due_date TEXT NOT NULL,
  return_date TEXT,
  renewed INTEGER DEFAULT 0,
  condition_on_return TEXT,
  fine_amount REAL DEFAULT 0,
  fine_paid INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Issued'
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER REFERENCES members(id),
  type TEXT,
  amount REAL,
  date TEXT DEFAULT CURRENT_DATE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT,
  entity TEXT,
  entity_id INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS publishers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  place TEXT
);

CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS sponsors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'External',
  member_id INTEGER REFERENCES members(id),
  description TEXT
);
`)
}

/**
 * Create the indexes.
 *
 * This runs after the columns were added, because an index on a column that
 * an old database file does not have yet would make the whole schema update
 * fail - and then the backup could not be restored at all.
 */
function applyIndexes() {
  try {
    db.exec(`
CREATE INDEX IF NOT EXISTS idx_members_reg ON members(reg_no);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_borrowing_status ON borrowings(status);
CREATE INDEX IF NOT EXISTS idx_borrowing_due ON borrowings(due_date);
CREATE INDEX IF NOT EXISTS idx_borrowing_issue ON borrowings(issue_date);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
`)
  } catch (e) {
    console.error('Index creation failed:', e)
  }
}

/** Add the columns that older database files do not have yet. */
function applyColumnMigrations() {
  try { db.exec("ALTER TABLE books ADD COLUMN price REAL DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE books ADD COLUMN sponsor_id INTEGER REFERENCES sponsors(id)"); } catch(e) {}
  try { db.exec('ALTER TABLE members ADD COLUMN gender TEXT;') } catch(e) {}
  try { db.exec('ALTER TABLE members ADD COLUMN blood_group TEXT;') } catch(e) {}
  try { db.exec('ALTER TABLE books ADD COLUMN volume TEXT;') } catch(e) {}
  try { db.exec('ALTER TABLE books ADD COLUMN translator TEXT;') } catch(e) {}
}

/**
 * The columns every table has to have, with the definition used to add them.
 *
 * A backup that was taken with an older version of the app can miss columns
 * that were added later. Restoring such a file would leave the app working on
 * a half-old database, so every missing column is added here.
 */
const EXPECTED_COLUMNS = {
  books: {
    title_ml: 'TEXT', author: 'TEXT', translator: 'TEXT', category: 'TEXT', publisher: 'TEXT',
    isbn: 'TEXT', edition: 'TEXT', year: 'INTEGER', language: "TEXT DEFAULT 'English'",
    shelf_no: 'TEXT', qr_code_no: 'TEXT', cover_image: 'TEXT', total_copies: 'INTEGER DEFAULT 1',
    available_copies: 'INTEGER DEFAULT 1', condition: "TEXT DEFAULT 'Good'", description: 'TEXT',
    volume: 'TEXT', price: 'REAL', sponsor_id: 'INTEGER', date_added: 'DATE DEFAULT CURRENT_DATE',
  },
  members: {
    full_name_ml: 'TEXT', whatsapp: 'TEXT', id_card_type: 'TEXT', address: 'TEXT',
    address_ml: 'TEXT', photo: 'TEXT', dob: 'TEXT', gender: 'TEXT', blood_group: 'TEXT',
    occupation: 'TEXT', email: 'TEXT', member_type: "TEXT DEFAULT 'General'",
    fee_paid: 'INTEGER DEFAULT 0', fee_amount: 'REAL DEFAULT 0', payment_date: 'TEXT',
    membership_start: 'TEXT', membership_expiry: 'TEXT', fine_balance: 'REAL DEFAULT 0',
    status: "TEXT DEFAULT 'Active'",
  },
  borrowings: {
    issue_date: 'TEXT DEFAULT CURRENT_DATE', due_date: 'TEXT', return_date: 'TEXT',
    renewed: 'INTEGER DEFAULT 0', condition_on_return: 'TEXT', fine_amount: 'REAL DEFAULT 0',
    fine_paid: 'INTEGER DEFAULT 0', status: "TEXT DEFAULT 'Issued'",
  },
  payments: { type: 'TEXT', amount: 'REAL', date: 'TEXT DEFAULT CURRENT_DATE', notes: 'TEXT' },
}

/** Add every column that is missing in the given table. */
function ensureColumns(table, columns) {
  let existing = []
  try {
    existing = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
  } catch (e) {
    return
  }
  if (!existing.length) return
  for (const [name, definition] of Object.entries(columns)) {
    if (existing.includes(name)) continue
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
      console.log(`Added missing column ${table}.${name}`)
    } catch (e) {
      console.error(`Adding ${table}.${name} failed:`, e)
    }
  }
}

/** Make sure every table has all the columns the app needs. */
function ensureAllColumns() {
  for (const [table, columns] of Object.entries(EXPECTED_COLUMNS)) {
    ensureColumns(table, columns)
  }
}

// ─── Amount migration (v1.0.3) ────────────────────────────────────────────────
// Versions before v1.0.1 never wrote `books.price`, so every book added with
// them carries the column default 0. That 0 is not a real amount, it means
// "not recorded". Convert those legacy zeros to NULL once (the UI then shows
// "Set amount" and offers a quick editor), and remember that the conversion
// ran so an amount the librarian later sets to 0 ("free") is never cleared.
//
// The flag lives in the database file, so a restored backup is migrated on
// its own: an old backup gets the conversion, a backup that was taken after
// the conversion keeps its amounts.
function runAmountMigration() {
  try {
    const amountMigrated = db.prepare("SELECT value FROM settings WHERE key='amount_unknown_migrated'").get()
    if (!amountMigrated) {
      const legacyZeros = db.prepare('SELECT COUNT(*) AS c FROM books WHERE price IS NULL OR price = 0').get().c
      if (legacyZeros > 0) {
        performAutoBackup()
        const res = db.prepare('UPDATE books SET price = NULL WHERE price IS NULL OR price = 0').run()
        console.log(`✅ Amount migration: ${res.changes} book(s) marked as "amount not recorded"`)
      }
      db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('amount_unknown_migrated',?)").run(new Date().toISOString())
    }
  } catch (e) {
    console.error('Amount migration failed:', e)
  }
}

/** Seed existing authors from books table into authors table (one-time migration) */
function seedAuthorsFromBooks() {
  try {
    const existingAuthors = db.prepare("SELECT DISTINCT author FROM books WHERE author IS NOT NULL AND author != ''").all()
    const insertAuthor = db.prepare("INSERT OR IGNORE INTO authors(name) VALUES(?)")
    for (const row of existingAuthors) {
      try { insertAuthor.run(row.author) } catch(e) {}
    }
  } catch(e) {}
}

/**
 * Bring the database up to date: schema, columns, amount migration, authors.
 *
 * Runs once when the app starts and again after a backup was restored.
 */
function refreshSchema() {
  applyTables()
  applyColumnMigrations()
  ensureAllColumns()
  applyIndexes()
  runAmountMigration()
  seedAuthorsFromBooks()
}

refreshSchema()

// ─── Seed defaults ────────────────────────────────────────────────────────────
const defaults = {
  library_name: 'Public Library Kooroppada',
  library_name_ml: 'പൊതു ഗ്രന്ഥശാല കൂരോപ്പട',
  library_address: 'Kooroppada, Kerala',
  library_phone: '',
  borrow_days: '14',
  max_books: '3',
  fine_per_day: '2',
  membership_fee_lifetime: '5000',
  membership_fee_yearly: '1000',
  membership_fee_monthly: '100',
  membership_fee_permanent: '2000',
  membership_fee_general_reg: '200',
  membership_fee_general_monthly: '50',
  library_reg_no: '1769',
  library_reg_year: '56',
  library_place: 'KOOROPPADA',
  library_email: 'libkooroppada@gmail.com',
  reserved_reg_count: '300',
  renew_allowed: '1',
}
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)')
for (const [k, v] of Object.entries(defaults)) insertSetting.run(k, v)

// Seed admin user
const adminExists = db.prepare("SELECT id FROM users WHERE username='admin'").get()
if (!adminExists) {
  const hash = crypto.createHash('sha256').update('admin123').digest('hex')
  db.prepare("INSERT INTO users(username,password_hash,role,full_name) VALUES('admin',?,'superadmin','Administrator')").run(hash)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hash(pwd) { return crypto.createHash('sha256').update(pwd).digest('hex') }

function today() { return new Date().toISOString().slice(0, 10) }

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + parseInt(days))
  return d.toISOString().slice(0, 10)
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key)
  return row ? row.value : null
}

/** Trim and collapse whitespace in a name. */
function normalizeName(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim()
}

/** Comparison key for names: case, punctuation and spacing insensitive. */
function nameKey(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/[.,'’`"()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Split a book author string into individual authors ("A, B & C"). */
function authorParts(value) {
  return normalizeName(value)
    .split(/\s*(?:,|;|&|\band\b)\s*/i)
    .map(normalizeName)
    .filter(Boolean)
}

/**
 * Convert a user/provider value to a safe non-negative amount.
 * Blank or unusable input becomes `null`, which means "amount not recorded";
 * a real zero is kept as 0, which means "free".
 */
function toMoney(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

/** Levenshtein distance, used for author duplicate detection. */
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    prev = cur
  }
  return prev[b.length]
}

/** 0..1 similarity between two author names (exact = 1). */
function authorSimilarity(a, b) {
  const x = nameKey(a)
  const y = nameKey(b)
  if (!x || !y) return 0
  if (x === y) return 1
  const xw = x.split(' ')
  const yw = y.split(' ')
  const subset = xw.every(w => yw.includes(w)) || yw.every(w => xw.includes(w))
  const ratio = 1 - levenshtein(x, y) / Math.max(x.length, y.length)
  // Short names need a real match; do not suggest "Ali" for "Alia".
  if (Math.min(x.length, y.length) < 4 && !subset) {
    return ratio >= 0.9 ? ratio : 0
  }
  return subset ? Math.max(ratio, 0.85) : ratio
}

/** Find (or create) an author row, ignoring case/spacing differences. */
function ensureAuthor(name) {
  const clean = normalizeName(name)
  if (!clean) return null
  const row = db.prepare('SELECT * FROM authors WHERE name COLLATE NOCASE = ?').get(clean)
  if (row) return row
  try {
    const info = db.prepare('INSERT INTO authors(name) VALUES(?)').run(clean)
    return { id: info.lastInsertRowid, name: clean }
  } catch (err) {
    console.error('Author insert failed:', err)
    return null
  }
}

/** Register every individual author of a book in the authors table. */
function ensureAuthorsFromBook(authorValue) {
  for (const part of authorParts(authorValue)) ensureAuthor(part)
}

// ─── Settings ─────────────────────────────────────────────────────────────────
module.exports.getAllSettings = () => {
  const rows = db.prepare('SELECT key,value FROM settings').all()
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}
module.exports.setSetting = (key, value) => {
  db.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').run(key, String(value))
  return { success: true }
}

// ─── Licensing ─────────────────────────────────────────────────────────────────
function getHwid() {
  try {
    return machineIdSync(true)
  } catch (err) {
    console.error('machineIdSync failed, using fallback HWID:', err)
    // Fallback: use a combination of hostname + username
    const os = require('os')
    const fallback = `${os.hostname()}-${os.userInfo().username}`
    const crypto2 = require('crypto')
    return crypto2.createHash('sha256').update(fallback).digest('hex')
  }
}
module.exports.getHwid = getHwid

module.exports.checkLicense = () => {
  try {
    const t = today()
    let installDate = getSetting('install_date')
    if (!installDate) {
      installDate = t
      module.exports.setSetting('install_date', t)
    }

    const key = getSetting('serial_key')
    
    // 1. Check Full Activation
    if (key) {
      try {
        const obj = JSON.parse(Buffer.from(key, 'base64').toString('utf8'))
        const payloadStr = Buffer.from(obj.p, 'base64').toString('utf8')
        const payload = JSON.parse(payloadStr)
        const signature = Buffer.from(obj.s, 'base64')
        
        const isVerified = crypto.verify(null, Buffer.from(payloadStr), PUBLIC_KEY, signature)
        if (isVerified && payload.hwid === getHwid() && t <= payload.expiry) {
          return { activated: true, type: 'Full', payload }
        }
      } catch(e) {
        console.error('License key parse error:', e)
      }
    }

    // 2. Check Trial Status
    const diffTime = Math.abs(new Date(t) - new Date(installDate))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const trialRemaining = Math.max(0, 7 - diffDays)
    
    return { 
      activated: false, 
      type: 'Trial', 
      trialRemaining, 
      isExpired: trialRemaining <= 0,
      hwid: getHwid()
    }
  } catch (outerErr) {
    console.error('checkLicense outer error:', outerErr)
    // On any fatal error, return safe trial state with 7 days remaining
    return {
      activated: false,
      type: 'Trial',
      trialRemaining: 7,
      isExpired: false,
      hwid: 'unknown'
    }
  }
}

module.exports.activateLicense = (key) => {
  // First temporarily store and check
  const oldKey = getSetting('serial_key')
  module.exports.setSetting('serial_key', key)
  const res = module.exports.checkLicense()
  if (!res.activated) {
    // revert
    if (oldKey) module.exports.setSetting('serial_key', oldKey)
    else db.prepare('DELETE FROM settings WHERE key=?').run('serial_key')
    return { success: false, message: res.error }
  }
  return { success: true }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
module.exports.login = (username, password) => {
  const user = db.prepare('SELECT * FROM users WHERE username=? AND password_hash=?').get(username, hash(password))
  if (!user) return { success: false, message: 'Invalid credentials' }
  const { password_hash, ...safe } = user
  return { success: true, user: safe }
}
module.exports.changePassword = (id, oldPwd, newPwd) => {
  const user = db.prepare('SELECT * FROM users WHERE id=? AND password_hash=?').get(id, hash(oldPwd))
  if (!user) return { success: false, message: 'Current password incorrect' }
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash(newPwd), id)
  return { success: true }
}
module.exports.updateUser = (id, data) => {
  try {
    let q = 'UPDATE users SET username=?, full_name=?, role=?';
    let params = [data.username, data.full_name, data.role];
    if (data.password) {
      q += ', password_hash=?';
      params.push(hash(data.password));
    }
    q += ' WHERE id=?';
    params.push(id);
    db.prepare(q).run(...params);
    return { success: true };
  } catch (e) {
    return { success: false, message: 'Username already exists' };
  }
}
module.exports.resetAdmin = (securityCode, newUsername, newPassword) => {
  const savedCode = getSetting('security_code');
  if (!savedCode || securityCode !== savedCode) {
    return { success: false, message: 'Invalid security code' };
  }
  db.prepare("UPDATE users SET username=?, password_hash=? WHERE role='superadmin'").run(newUsername, hash(newPassword));
  return { success: true };
}
module.exports.getUsers = () => db.prepare('SELECT id,username,role,full_name,created_at FROM users').all()
module.exports.addUser = (data) => {
  db.prepare('INSERT INTO users(username,password_hash,role,full_name) VALUES(?,?,?,?)')
    .run(data.username, hash(data.password), data.role, data.full_name)
  return { success: true }
}
module.exports.deleteUser = (id) => {
  db.prepare('DELETE FROM users WHERE id=? AND role!=?').run(id, 'superadmin')
  return { success: true }
}

// ─── Books ────────────────────────────────────────────────────────────────────
module.exports.getBooks = (filters = {}) => {
  let q = 'SELECT * FROM books WHERE 1=1'
  const params = []
  if (filters.category) { q += ' AND category=?'; params.push(filters.category) }
  if (filters.language) { q += ' AND language=?'; params.push(filters.language) }
  if (filters.available) { q += ' AND available_copies>0' }
  q += ' ORDER BY date_added DESC'
  return db.prepare(q).all(...params)
}
module.exports.getBook = (id) => db.prepare('SELECT * FROM books WHERE id=?').get(id)
module.exports.addBook = (data) => {
  ensureAuthorsFromBook(data.author)
  if (data.publisher && data.publisher.trim() !== '') {
    try {
      db.prepare("INSERT OR IGNORE INTO publishers(name, place) VALUES(?, NULL)").run(data.publisher.trim())
    } catch (e) {
      console.error('Auto Publisher insert failed:', e)
    }
  }
  const result = db.prepare(`
    INSERT INTO books(title,title_ml,author,translator,category,publisher,isbn,edition,year,language,shelf_no,qr_code_no,cover_image,total_copies,available_copies,condition,description,volume,price,sponsor_id)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(data.title, data.title_ml||null, data.author||null, data.translator||null, data.category||null, data.publisher||null,
         data.isbn||null, data.edition||null, data.year||null, data.language||'English', data.shelf_no||null,
         data.qr_code_no||null, data.cover_image||null, data.total_copies||1, data.total_copies||1,
         data.condition||'Good', data.description||null, data.volume||null, toMoney(data.price), data.sponsor_id||null)
  performAutoBackup()
  return { success: true, id: result.lastInsertRowid }
}
module.exports.updateBook = (id, data) => {
  ensureAuthorsFromBook(data.author)
  if (data.publisher && data.publisher.trim() !== '') {
    try {
      db.prepare("INSERT OR IGNORE INTO publishers(name, place) VALUES(?, NULL)").run(data.publisher.trim())
    } catch (e) {
      console.error('Auto Publisher insert failed:', e)
    }
  }
  db.prepare(`
    UPDATE books SET title=?,title_ml=?,author=?,translator=?,category=?,publisher=?,isbn=?,edition=?,year=?,
    language=?,shelf_no=?,qr_code_no=?,cover_image=?,total_copies=?,condition=?,description=?,volume=?,price=?,sponsor_id=? WHERE id=?
  `).run(data.title, data.title_ml||null, data.author||null, data.translator||null, data.category||null, data.publisher||null,
         data.isbn||null, data.edition||null, data.year||null, data.language||'English', data.shelf_no||null,
         data.qr_code_no||null, data.cover_image||null, data.total_copies||1, data.condition||'Good',
         data.description||null, data.volume||null, toMoney(data.price), data.sponsor_id||null, id)
  performAutoBackup()
  return { success: true }
}
/**
 * Save amounts for several books in one transaction (one backup, not one each).
 * `price` may be a number, a numeric string, `null`/`''` (not recorded) or 0 (free).
 * @param {Array<{id:number, price:(number|string|null)}>} updates
 * @returns {{success:true, updated:number}}
 */
module.exports.setBookAmounts = (updates) => {
  const rows = Array.isArray(updates) ? updates.filter(row => row && row.id != null) : []
  if (rows.length === 0) return { success: true, updated: 0 }
  const stmt = db.prepare('UPDATE books SET price=? WHERE id=?')
  const applyAll = db.transaction((list) => {
    let changed = 0
    for (const row of list) changed += stmt.run(toMoney(row.price), row.id).changes
    return changed
  })
  const updated = applyAll(rows)
  if (updated > 0) performAutoBackup()
  return { success: true, updated }
}
module.exports.deleteBook = (id) => {
  const active = db.prepare("SELECT COUNT(*) as c FROM borrowings WHERE book_id=? AND status='Issued'").get(id)
  if (active.c > 0) return { success: false, message: 'Book is currently issued. Please return it before deleting.' }
  
  const deleteProcess = db.transaction(() => {
    db.prepare('DELETE FROM borrowings WHERE book_id=?').run(id)
    db.prepare('DELETE FROM books WHERE id=?').run(id)
  })

  try {
    deleteProcess()
    performAutoBackup()
    return { success: true }
  } catch (err) {
    console.error('Delete Book failed:', err)
    return { success: false, message: 'Database error while deleting book' }
  }
}
module.exports.searchBooks = (query) => {
  const q = `%${query}%`
  return db.prepare(`
    SELECT * FROM books WHERE title LIKE ? OR title_ml LIKE ? OR author LIKE ? OR isbn LIKE ? OR qr_code_no LIKE ? OR category LIKE ?
    ORDER BY title LIMIT 50
  `).all(q, q, q, q, q, q)
}

// ─── Members ──────────────────────────────────────────────────────────────────
function generateRegNo() {
  const reserved = parseInt(getSetting('reserved_reg_count') || 0)
  const count = db.prepare('SELECT COUNT(*) as c FROM members').get().c
  
  if (count < reserved) {
    return '' // Return empty to indicate manual entry is allowed
  }

  const lastAuto = db.prepare(`SELECT reg_no FROM members WHERE id > 0 ORDER BY id DESC LIMIT 1`).get()
  let next = 1
  if (lastAuto && lastAuto.reg_no && !isNaN(lastAuto.reg_no)) {
    next = parseInt(lastAuto.reg_no) + 1
  } else {
    // If last was not a number, fallback to count
    next = count + 1
  }
  
  // Ensure next is above reserved
  if (next <= reserved) next = reserved + 1
  
  return String(next).padStart(3, '0')
}
module.exports.getNextRegNo = generateRegNo
module.exports.getReservedCount = () => parseInt(getSetting('reserved_reg_count') || 0)

module.exports.getMembers = (filters = {}) => {
  let q = 'SELECT * FROM members WHERE 1=1'
  const params = []
  if (filters.status) { q += ' AND status=?'; params.push(filters.status) }
  if (filters.member_type) { q += ' AND member_type=?'; params.push(filters.member_type) }
  if (filters.fee_paid !== undefined) { q += ' AND fee_paid=?'; params.push(filters.fee_paid) }
  q += ' ORDER BY created_at DESC'
  return db.prepare(q).all(...params)
}
module.exports.getMember = (id) => db.prepare('SELECT * FROM members WHERE id=?').get(id)
module.exports.addMember = (data) => {
  const start = today()
  const reg_no = data.reg_no || generateRegNo()
  
  // Validation: Check if reg_no exists
  const existing = db.prepare('SELECT id FROM members WHERE reg_no=?').get(reg_no)
  if (existing) return { success: false, message: 'Membership ID already exists' }

  let expiry = null // Permanent has no expiry
  if (data.member_type === 'General') {
    const d = new Date(start)
    d.setMonth(d.getMonth() + 1)
    expiry = d.toISOString().slice(0, 10)
  }

  const result = db.prepare(`
    INSERT INTO members(reg_no,full_name,full_name_ml,phone,whatsapp,id_card_type,id_card_no,address,address_ml,
      photo,dob,gender,blood_group,occupation,email,member_type,fee_paid,fee_amount,payment_date,membership_start,membership_expiry,status)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(reg_no, data.full_name, data.full_name_ml||null, data.phone, data.whatsapp||null,
         data.id_card_type||null, data.id_card_no, data.address||null, data.address_ml||null,
         data.photo||null, data.dob||null, data.gender||null, data.blood_group||null, data.occupation||null, data.email||null,
         data.member_type||'General', data.fee_paid||0, data.fee_amount||0,
         data.fee_paid ? today() : null, start, expiry, 'Active')
  performAutoBackup()
  return { success: true, id: result.lastInsertRowid, reg_no }
}
module.exports.updateMember = (id, data) => {
  db.prepare(`
    UPDATE members SET full_name=?,full_name_ml=?,phone=?,whatsapp=?,id_card_type=?,id_card_no=?,
    address=?,address_ml=?,photo=?,dob=?,gender=?,blood_group=?,occupation=?,email=?,member_type=?,status=? WHERE id=?
  `).run(data.full_name, data.full_name_ml||null, data.phone, data.whatsapp||null,
         data.id_card_type||null, data.id_card_no, data.address||null, data.address_ml||null,
         data.photo||null, data.dob||null, data.gender||null, data.blood_group||null, data.occupation||null, data.email||null,
         data.member_type||'General', data.status||'Active', id)
  performAutoBackup()
  return { success: true }
}
module.exports.deleteMember = (id) => {
  const active = db.prepare("SELECT COUNT(*) as c FROM borrowings WHERE member_id=? AND status='Issued'").get(id)
  if (active.c > 0) return { success: false, message: 'Member has unreturned books. Please return books before deleting.' }
  
  const deleteProcess = db.transaction(() => {
    // Delete related records to satisfy foreign key constraints
    db.prepare('DELETE FROM payments WHERE member_id=?').run(id)
    db.prepare('DELETE FROM borrowings WHERE member_id=?').run(id)
    db.prepare('DELETE FROM members WHERE id=?').run(id)
  })

  try {
    deleteProcess()
    performAutoBackup()
    return { success: true }
  } catch (err) {
    console.error('Delete Member failed:', err)
    return { success: false, message: 'Database error while deleting member' }
  }
}
module.exports.searchMembers = (query) => {
  const q = `%${query}%`
  return db.prepare(`
    SELECT * FROM members WHERE full_name LIKE ? OR full_name_ml LIKE ? OR phone LIKE ? OR reg_no LIKE ? OR id_card_no LIKE ?
    ORDER BY full_name LIMIT 50
  `).all(q, q, q, q, q)
}
module.exports.getMemberHistory = (id) => {
  return db.prepare(`
    SELECT b.*, bk.title, bk.author FROM borrowings b
    JOIN books bk ON b.book_id=bk.id
    WHERE b.member_id=? ORDER BY b.issue_date DESC
  `).all(id)
}
module.exports.payMemberFee = (memberId, amount) => {
  db.prepare("UPDATE members SET fee_paid=1,fee_amount=?,payment_date=? WHERE id=?").run(amount, today(), memberId)
  db.prepare("INSERT INTO payments(member_id,type,amount,date) VALUES(?,'membership',?,?)").run(memberId, amount, today())
  performAutoBackup()
  return { success: true }
}
module.exports.getMemberAnalytics = (id) => {
  const t = today()
  const borrowed = db.prepare('SELECT COUNT(*) as c FROM borrowings WHERE member_id=?').get(id).c
  const active = db.prepare("SELECT COUNT(*) as c FROM borrowings WHERE member_id=? AND status='Issued'").get(id).c
  const overdue = db.prepare(`SELECT COUNT(*) as c FROM borrowings WHERE member_id=? AND status='Issued' AND due_date < ?`).get(id, t).c
  const totalFines = db.prepare('SELECT COALESCE(SUM(fine_amount),0) as s FROM borrowings WHERE member_id=?').get(id).s
  const paidFines = db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE member_id=? AND type='fine'").get(id).s
  const paidMembership = db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE member_id=? AND type='membership'").get(id).s
  return {
    borrowedCount: borrowed,
    activeCount: active,
    overdueCount: overdue,
    totalFines: totalFines,
    paidFines: paidFines,
    paidMembership: paidMembership
  }
}
module.exports.updateMemberFine = (id, delta) => {
  db.prepare('UPDATE members SET fine_balance = fine_balance + ? WHERE id=?').run(delta, id)
  performAutoBackup()
  return { success: true }
}

// ─── Borrowings ───────────────────────────────────────────────────────────────
module.exports.issueBook = (data) => {
  const days = getSetting('borrow_days') || 14
  const maxBooks = parseInt(getSetting('max_books') || 3)
  const member = db.prepare('SELECT * FROM members WHERE id=?').get(data.member_id)
  if (!member) return { success: false, message: 'Member not found' }
  if (member.status !== 'Active') return { success: false, message: 'Member is not active' }
  if (!member.fee_paid) return { success: false, message: 'Membership fee not paid' }
  const activeCount = db.prepare("SELECT COUNT(*) as c FROM borrowings WHERE member_id=? AND status='Issued'").get(data.member_id)
  if (activeCount.c >= maxBooks) return { success: false, message: `Max ${maxBooks} books allowed per member` }
  const book = db.prepare('SELECT * FROM books WHERE id=?').get(data.book_id)
  if (!book || book.available_copies < 1) return { success: false, message: 'Book not available' }
  const due = addDays(today(), days)
  db.prepare("INSERT INTO borrowings(member_id,book_id,due_date,status) VALUES(?,?,?,'Issued')").run(data.member_id, data.book_id, due)
  db.prepare('UPDATE books SET available_copies=available_copies-1 WHERE id=?').run(data.book_id)
  performAutoBackup()
  return { success: true, due_date: due }
}
module.exports.returnBook = (borrowingId, data) => {
  const borrowing = db.prepare('SELECT * FROM borrowings WHERE id=?').get(borrowingId)
  if (!borrowing) return { success: false, message: 'Borrowing not found' }
  const finePerDay = parseFloat(getSetting('fine_per_day') || 2)
  let fine = 0
  const ret = today()
  if (ret > borrowing.due_date) {
    const diff = Math.ceil((new Date(ret) - new Date(borrowing.due_date)) / 86400000)
    fine = diff * finePerDay
  }
  db.prepare("UPDATE borrowings SET return_date=?,status='Returned',condition_on_return=?,fine_amount=? WHERE id=?")
    .run(ret, data.condition||'Good', fine, borrowingId)
  db.prepare('UPDATE books SET available_copies=available_copies+1 WHERE id=?').run(borrowing.book_id)
  if (fine > 0) {
    db.prepare('UPDATE members SET fine_balance=fine_balance+? WHERE id=?').run(fine, borrowing.member_id)
  }
  performAutoBackup()
  return { success: true, fine }
}
module.exports.renewBook = (borrowingId) => {
  const b = db.prepare('SELECT * FROM borrowings WHERE id=?').get(borrowingId)
  if (!b) return { success: false, message: 'Not found' }
  if (b.renewed >= 1) return { success: false, message: 'Already renewed once' }
  const days = getSetting('borrow_days') || 14
  const newDue = addDays(b.due_date, days)
  db.prepare('UPDATE borrowings SET due_date=?,renewed=1 WHERE id=?').run(newDue, borrowingId)
  performAutoBackup()
  return { success: true, new_due_date: newDue }
}
module.exports.getActiveBorrowings = () => {
  return db.prepare(`
    SELECT b.*, m.full_name, m.phone, m.reg_no, bk.title, bk.author
    FROM borrowings b JOIN members m ON b.member_id=m.id JOIN books bk ON b.book_id=bk.id
    WHERE b.status='Issued' ORDER BY b.due_date ASC
  `).all()
}
module.exports.getOverdueBorrowings = () => {
  const t = today()
  return db.prepare(`
    SELECT b.*, m.full_name, m.phone, m.reg_no, m.whatsapp, bk.title, bk.author,
      CAST((julianday('${t}') - julianday(b.due_date)) AS INTEGER) as days_overdue
    FROM borrowings b JOIN members m ON b.member_id=m.id JOIN books bk ON b.book_id=bk.id
    WHERE b.status='Issued' AND b.due_date < '${t}'
    ORDER BY days_overdue DESC
  `).all()
}
module.exports.getAllBorrowings = (filters = {}) => {
  let q = `SELECT b.*, m.full_name, m.reg_no, bk.title FROM borrowings b
    JOIN members m ON b.member_id=m.id JOIN books bk ON b.book_id=bk.id WHERE 1=1`
  const params = []
  if (filters.status) { q += ' AND b.status=?'; params.push(filters.status) }
  q += ' ORDER BY b.issue_date DESC LIMIT 200'
  return db.prepare(q).all(...params)
}

// ─── Payments ─────────────────────────────────────────────────────────────────
module.exports.addPayment = (data) => {
  db.prepare("INSERT INTO payments(member_id,type,amount,date,notes) VALUES(?,?,?,?,?)")
    .run(data.member_id, data.type, data.amount, today(), data.notes||null)
  performAutoBackup()
  return { success: true }
}
module.exports.getPayments = (filters = {}) => {
  let q = `SELECT p.*, m.full_name, m.reg_no FROM payments p JOIN members m ON p.member_id=m.id WHERE 1=1`
  const params = []
  if (filters.type) { q += ' AND p.type=?'; params.push(filters.type) }
  if (filters.date_from) { q += ' AND p.date>=?'; params.push(filters.date_from) }
  if (filters.date_to) { q += ' AND p.date<=?'; params.push(filters.date_to) }
  q += ' ORDER BY p.date DESC LIMIT 200'
  return db.prepare(q).all(...params)
}
module.exports.getFeeStats = () => {
  const t = today()
  const todayStart = t
  const weekStart = addDays(t, -7)
  const monthStart = t.slice(0, 7) + '-01'
  
  return {
    today: db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE date='${todayStart}'`).get().s,
    week:  db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE date>='${weekStart}'`).get().s,
    month: db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE date>='${monthStart}'`).get().s
  }
}
module.exports.getRecentPayments = (limit = 10) => {
  return db.prepare(`
    SELECT p.*, m.full_name, m.reg_no 
    FROM payments p JOIN members m ON p.member_id=m.id 
    ORDER BY p.date DESC, p.id DESC LIMIT ?
  `).all(limit)
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
module.exports.getDashboardStats = () => {
  const t = today()
  return {
    totalBooks:     db.prepare('SELECT COUNT(*) as c FROM books').get().c,
    totalMembers:   db.prepare("SELECT COUNT(*) as c FROM members WHERE status='Active'").get().c,
    issuedToday:    db.prepare(`SELECT COUNT(*) as c FROM borrowings WHERE issue_date='${t}'`).get().c,
    overdueCount:   db.prepare(`SELECT COUNT(*) as c FROM borrowings WHERE status='Issued' AND due_date<'${t}'`).get().c,
    returnedToday:  db.prepare(`SELECT COUNT(*) as c FROM borrowings WHERE return_date='${t}'`).get().c,
    feeCollectedMonth: db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE type='membership' AND date LIKE '${t.slice(0,7)}%'`).get().s,
    fineCollectedMonth: db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE type='fine' AND date LIKE '${t.slice(0,7)}%'`).get().s,
    expiringMembers: db.prepare(`SELECT COUNT(*) as c FROM members WHERE membership_expiry BETWEEN '${t}' AND date('${t}','+7 days') AND status='Active'`).get().c,
    finePendingAmount: (() => {
      const overdue = db.prepare(`SELECT issue_date, due_date, status FROM borrowings WHERE status='Issued' AND due_date<'${t}'`).all()
      const finePerDay = parseFloat(getSetting('fine_per_day') || 2)
      return overdue.reduce((sum, b) => {
        const late = Math.floor((new Date(t) - new Date(b.due_date)) / (1000*60*60*24))
        return sum + (late > 0 ? late * finePerDay : 0)
      }, 0)
    })()
  }
}
module.exports.getChartData = () => {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const ym = d.toISOString().slice(0, 7)
    const label = d.toLocaleString('default', { month: 'short' })
    const issued = db.prepare(`SELECT COUNT(*) as c FROM borrowings WHERE issue_date LIKE '${ym}%'`).get().c
    const members = db.prepare(`SELECT COUNT(*) as c FROM members WHERE created_at LIKE '${ym}%'`).get().c
    months.push({ month: label, issued, members })
  }
  return months
}

// ─── Publishers ──────────────────────────────────────────────────────────────
module.exports.getPublishers = () => {
  return db.prepare('SELECT * FROM publishers ORDER BY name ASC').all()
}
module.exports.addPublisher = (data) => {
  try {
    db.prepare('INSERT INTO publishers(name,place) VALUES(?,?)').run(data.name, data.place||null)
    return { success: true }
  } catch (e) {
    return { success: false, message: 'Publisher already exists' }
  }
}
module.exports.deletePublisher = (id) => {
  db.prepare('DELETE FROM publishers WHERE id=?').run(id)
  return { success: true }
}

// ─── Sponsors ────────────────────────────────────────────────────────────────
module.exports.getSponsors = () => {
  return db.prepare('SELECT s.*, m.reg_no as member_reg FROM sponsors s LEFT JOIN members m ON s.member_id=m.id ORDER BY s.name ASC').all()
}
module.exports.addSponsor = (data) => {
  db.prepare('INSERT INTO sponsors(name,type,member_id,description) VALUES(?,?,?,?)').run(
    data.name, data.type||'External', data.member_id||null, data.description||null
  )
  return { success: true }
}
module.exports.deleteSponsor = (id) => {
  db.prepare('DELETE FROM sponsors WHERE id=?').run(id)
  return { success: true }
}

// ─── Authors ─────────────────────────────────────────────────────────────────
module.exports.getAuthors = () => {
  const rows = db.prepare('SELECT id, name FROM authors ORDER BY name COLLATE NOCASE ASC').all()
  // Count books per author, including authors inside "A, B & C" strings.
  const counts = new Map()
  for (const book of db.prepare("SELECT author FROM books WHERE author IS NOT NULL AND author != ''").all()) {
    const keys = new Set(authorParts(book.author).map(nameKey).filter(Boolean))
    for (const key of keys) counts.set(key, (counts.get(key) || 0) + 1)
  }
  return rows.map(row => ({ ...row, book_count: counts.get(nameKey(row.name)) || 0 }))
}
module.exports.addAuthor = (data) => {
  const clean = normalizeName(data && data.name)
  if (!clean) return { success: false, message: 'Author name is required' }
  const existing = db.prepare('SELECT * FROM authors WHERE name COLLATE NOCASE = ?').get(clean)
  if (existing) {
    return { success: true, id: existing.id, name: existing.name, existing: true }
  }
  try {
    const info = db.prepare('INSERT INTO authors(name) VALUES(?)').run(clean)
    return { success: true, id: info.lastInsertRowid, name: clean, existing: false }
  } catch (e) {
    return { success: false, message: 'Author already exists' }
  }
}
/**
 * Return existing authors that look like the given name, best match first.
 * Used by the UI to offer "merge into existing" instead of creating duplicates.
 */
module.exports.findSimilarAuthors = (name) => {
  const key = nameKey(name)
  if (!key) return []
  const parts = authorParts(name).map(nameKey)
  const rows = db.prepare('SELECT id, name FROM authors ORDER BY name COLLATE NOCASE').all()
  return rows
    .map(row => {
      let score = authorSimilarity(name, row.name)
      for (const part of parts) score = Math.max(score, authorSimilarity(part, row.name))
      return { id: row.id, name: row.name, score: Math.round(score * 100) / 100 }
    })
    .filter(row => row.score >= 0.72)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 8)
}
/**
 * Merge author records into one canonical name and rewrite every book that
 * uses the merged names. `sourceNames` are the duplicates to remove.
 */
module.exports.mergeAuthors = (data = {}) => {
  const target = normalizeName(data.targetName)
  if (!target) return { success: false, message: 'Target author name is required' }
  const sources = (Array.isArray(data.sourceNames) ? data.sourceNames : [])
    .map(normalizeName)
    .filter(Boolean)
  const sourceKeys = new Set(sources.map(nameKey).filter(k => k && k !== nameKey(target)))
  const targetRow = ensureAuthor(target)
  if (!targetRow) return { success: false, message: 'Could not create the target author' }

  const patch = db.prepare('UPDATE books SET author=? WHERE id=?')
  const books = db.prepare("SELECT id, author FROM books WHERE author IS NOT NULL AND author != ''").all()
  let updatedBooks = 0
  db.transaction(() => {
    for (const book of books) {
      const seen = new Set()
      const next = []
      let touched = false
      for (const part of authorParts(book.author)) {
        const partKey = nameKey(part)
        if (sourceKeys.has(partKey)) touched = true
        const name = sourceKeys.has(partKey) ? targetRow.name : part
        const key = nameKey(name)
        if (seen.has(key)) { touched = true; continue }
        seen.add(key)
        next.push(name)
      }
      const merged = next.join(', ')
      if (touched || merged !== normalizeName(book.author)) {
        patch.run(merged, book.id)
        updatedBooks++
      }
    }
    for (const source of sources) {
      db.prepare('DELETE FROM authors WHERE name COLLATE NOCASE = ?').run(source)
    }
  })()
  performAutoBackup()
  return { success: true, target: targetRow.name, updatedBooks, removedAuthors: sources.length }
}
module.exports.deleteAuthor = (id) => {
  db.prepare('DELETE FROM authors WHERE id=?').run(id)
  return { success: true }
}

