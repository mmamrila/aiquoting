const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'quoting.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
    initializeTables();
  }
});

function initializeTables() {
  // Parts table
  db.run(`CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    brand TEXT,
    model TEXT,
    description TEXT,
    cost REAL NOT NULL,
    price REAL NOT NULL,
    labor_hours REAL DEFAULT 0,
    compatibility TEXT,
    requires_licensing BOOLEAN DEFAULT 0,
    frequency_band TEXT,
    system_type TEXT,
    inventory_qty INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Clients table
  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    industry TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    current_system TEXT,
    coverage_area TEXT,
    user_count INTEGER,
    locations TEXT,
    special_requirements TEXT,
    discount_level REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Quotes table
  db.run(`CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number TEXT UNIQUE NOT NULL,
    client_id INTEGER,
    status TEXT DEFAULT 'draft',
    system_type TEXT,
    total_parts REAL DEFAULT 0,
    total_labor REAL DEFAULT 0,
    total_discount REAL DEFAULT 0,
    total_tax REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients (id)
  )`);

  // Quote items table
  db.run(`CREATE TABLE IF NOT EXISTS quote_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER,
    part_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    labor_hours REAL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (quote_id) REFERENCES quotes (id),
    FOREIGN KEY (part_id) REFERENCES parts (id)
  )`);

  // AI interactions table
  db.run(`CREATE TABLE IF NOT EXISTS ai_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    user_input TEXT,
    ai_response TEXT,
    quote_id INTEGER,
    feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes (id)
  )`);

  console.log('📊 Database tables initialized');
}

module.exports = db;