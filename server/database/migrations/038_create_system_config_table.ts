export const migration_038 = {
  id: 38,
  name: 'migration_038_create_system_config_table',
  sql: `
CREATE TABLE IF NOT EXISTS system_config (
  id VARCHAR(36) PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  value_type VARCHAR(20) DEFAULT 'string',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(36) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

INSERT INTO system_config (id, key, value, description, value_type) VALUES
  ('cfg-001', 'api.rate_limit_per_minute', '60', 'API rate limit per minute', 'number'),
  ('cfg-002', 'features.workflow_enabled', 'true', 'Enable workflow feature', 'boolean'),
  ('cfg-003', 'system.maintenance_mode', 'false', 'Enable system maintenance mode', 'boolean'),
  ('cfg-004', 'system.announcement', '', 'System announcement message', 'string'),
  ('cfg-005', 'proxy.allowed_hosts', 'mikuapi.org,api.pptoken.org,code.azsheen.top,api.tokenfty.net,gpt.hslife.fun,lumin-ai.tiandi.run,api.sisyphusx.com', 'External proxy allowed host domains', 'string')
ON CONFLICT (key) DO NOTHING;
  `,
}
