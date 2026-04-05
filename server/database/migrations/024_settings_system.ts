interface Migration {
  id: number
  name: string
  sql: string
}

export const migration_024: Migration = {
  id: 24,
  name: 'migration_024_settings_system',
  sql: `
-- User settings storage (key-value per category)
CREATE TABLE IF NOT EXISTS user_settings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  settings_json JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category)
);

-- Settings change history (audit log)
CREATE TABLE IF NOT EXISTS settings_history (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(36) REFERENCES users(id),
  source VARCHAR(20) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- System-wide default settings
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(36) PRIMARY KEY,
  category VARCHAR(50) NOT NULL UNIQUE,
  default_json JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings sync queue (for offline support)
CREATE TABLE IF NOT EXISTS settings_sync_queue (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  operation VARCHAR(20) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_category ON user_settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_history_user ON settings_history(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_history_category ON settings_history(category);
CREATE INDEX IF NOT EXISTS idx_settings_history_changed_at ON settings_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_settings_sync_queue_user ON settings_sync_queue(user_id);
  `,
}