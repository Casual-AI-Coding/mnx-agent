import type { Migration } from '../migrations-async.js'

export const migration_040: Migration = {
  id: 40,
  name: 'migration_040_create_user_media_pins',
  sql: `
CREATE TABLE IF NOT EXISTS user_media_pins (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id VARCHAR(36) NOT NULL REFERENCES media_records(id) ON DELETE CASCADE,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_user_media_pins_user_id ON user_media_pins(user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_user_media_pins_media_id ON user_media_pins(media_id);
CREATE INDEX IF NOT EXISTS idx_user_media_pins_updated_at ON user_media_pins(updated_at DESC);
  `,
}
