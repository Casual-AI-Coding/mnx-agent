import type { Migration } from '../migrations-async.js'

export const migration_030: Migration = {
  id: 30,
  name: 'migration_030_resource_management_phase_1',
  sql: `
CREATE TABLE IF NOT EXISTS materials (
  id VARCHAR(36) PRIMARY KEY,
  material_type VARCHAR(20) NOT NULL CHECK(material_type IN ('artist')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_items (
  id VARCHAR(36) PRIMARY KEY,
  material_id VARCHAR(36) NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK(item_type IN ('song')),
  name VARCHAR(255) NOT NULL,
  lyrics TEXT,
  remark TEXT,
  metadata JSONB,
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prompts (
  id VARCHAR(36) PRIMARY KEY,
  target_type VARCHAR(30) NOT NULL CHECK(target_type IN ('material-main', 'material-item')),
  target_id VARCHAR(36) NOT NULL,
  slot_type VARCHAR(30) NOT NULL CHECK(slot_type IN ('artist-style', 'song-style')),
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_materials_owner_type_deleted ON materials(owner_id, material_type, is_deleted);
CREATE INDEX IF NOT EXISTS idx_materials_updated_at ON materials(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_material_items_material_deleted ON material_items(material_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_material_items_owner_deleted ON material_items(owner_id, is_deleted);
CREATE UNIQUE INDEX IF NOT EXISTS uq_material_items_active_name
  ON material_items(material_id, item_type, name)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_prompts_target_slot_deleted ON prompts(target_type, target_id, slot_type, is_deleted);
CREATE INDEX IF NOT EXISTS idx_prompts_owner_deleted ON prompts(owner_id, is_deleted);
  `,
}
