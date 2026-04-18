import type { Migration } from '../migrations-async.js'

export const migration_029: Migration = {
  id: 29,
  name: 'migration_029_lyrics_type_source',
  sql: `
ALTER TABLE media_records DROP CONSTRAINT IF EXISTS media_records_type_check;
ALTER TABLE media_records ADD CONSTRAINT media_records_type_check 
  CHECK(type IN ('audio', 'image', 'video', 'music', 'lyrics'));

ALTER TABLE media_records DROP CONSTRAINT IF EXISTS media_records_source_check;
ALTER TABLE media_records ADD CONSTRAINT media_records_source_check 
  CHECK(source IN ('voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation', 'lyrics_generation'));
  `,
}