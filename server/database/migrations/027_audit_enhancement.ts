/**
 * Migration 027: Audit Log Enhancement + External API Logs
 * 
 * - audit_logs: Add query_params, response_body, trace_id columns
 * - external_api_logs: New table for external API call auditing
 */

import type { Migration } from '../migrations-async.js'

export const migration_027: Migration = {
  id: 27,
  name: 'migration_027_audit_enhancement',
  sql: `
-- ============================================
-- Audit Logs Enhancement
-- ============================================

-- Add query_params column (structured JSONB)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS query_params JSONB DEFAULT NULL;

-- Add response_body column (truncated at 4KB)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS response_body TEXT DEFAULT NULL;

-- Add trace_id column (reserved for v2.4 distributed tracing)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS trace_id VARCHAR(32) DEFAULT NULL;

-- ============================================
-- External API Logs Table
-- ============================================

CREATE TABLE IF NOT EXISTS external_api_logs (
  id SERIAL PRIMARY KEY,
  service_provider VARCHAR(20) NOT NULL,      -- 'minimax', 'openai', 'deepseek' etc
  api_endpoint VARCHAR(100) NOT NULL,         -- 'POST /v1/text/chatcompletion_v2'
  operation VARCHAR(50) NOT NULL,             -- 'chat_completion', 'image_generation'
  request_params JSONB,                       -- Request params (sanitized)
  response_body TEXT,                         -- Response body (truncated 4KB)
  status VARCHAR(20) NOT NULL,                -- 'success' / 'failed'
  error_message TEXT,
  duration_ms INTEGER,
  user_id VARCHAR(36),                        -- Reference to users (no FK for flexibility)
  trace_id VARCHAR(32),                       -- Reserved for v2.4
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_external_api_logs_user_id ON external_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_external_api_logs_service_provider ON external_api_logs(service_provider);
CREATE INDEX IF NOT EXISTS idx_external_api_logs_status ON external_api_logs(status);
CREATE INDEX IF NOT EXISTS idx_external_api_logs_created_at ON external_api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_api_logs_operation ON external_api_logs(operation);

-- Index for audit_logs new columns
CREATE INDEX IF NOT EXISTS idx_audit_logs_trace_id ON audit_logs(trace_id);
  `,
}