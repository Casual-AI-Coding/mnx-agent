export const migration_037 = {
  id: 37,
  name: 'migration_037_seed_proxy_allowed_hosts_config',
  sql: `
INSERT INTO system_config (id, key, value, description, value_type)
VALUES (
  'cfg-005',
  'proxy.allowed_hosts',
  'mikuapi.org,api.pptoken.org,code.azsheen.top,api.tokenfty.net,gpt.hslife.fun,lumin-ai.tiandi.run,api.sisyphusx.com',
  'External proxy allowed host domains',
  'string'
)
ON CONFLICT (key) DO NOTHING;
  `,
}
