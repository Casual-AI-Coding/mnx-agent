import type { Migration } from '../migrations-async.js'

export const migration_031: Migration = {
  id: 31,
  name: 'migration_031_external_debug_source',
  sql: `
ALTER TABLE media_records DROP CONSTRAINT IF EXISTS media_records_source_check;
ALTER TABLE media_records ADD CONSTRAINT media_records_source_check
  CHECK(source IN ('voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation', 'lyrics_generation', 'external_debug'));
  `,
}
