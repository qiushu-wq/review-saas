CREATE TABLE IF NOT EXISTS merchants (
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
  referral_code TEXT UNIQUE,
  referred_by INTEGER,
  bonus_monthly INTEGER DEFAULT 0,
  FOREIGN KEY (referred_by) REFERENCES merchants(id)
);

CREATE TABLE IF NOT EXISTS referral_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  referred_id INTEGER NOT NULL,
  bonus_amount INTEGER DEFAULT 10,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (referrer_id) REFERENCES merchants(id),
  FOREIGN KEY (referred_id) REFERENCES merchants(id)
);

CREATE TABLE IF NOT EXISTS reply_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL,
  review_content TEXT NOT NULL,
  store_name TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  generated_reply TEXT NOT NULL,
  severity TEXT,
  source TEXT DEFAULT 'template',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL,
  key_name TEXT DEFAULT '',
  key_value TEXT UNIQUE NOT NULL,
  is_active INTEGER DEFAULT 1,
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE IF NOT EXISTS review_monitor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL,
  platform TEXT DEFAULT '',
  review_content TEXT NOT NULL,
  severity TEXT DEFAULT 'light',
  status TEXT DEFAULT 'pending',
  generated_reply TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  replied_at TEXT,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE IF NOT EXISTS plan_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL,
  from_plan TEXT NOT NULL,
  to_plan TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);
