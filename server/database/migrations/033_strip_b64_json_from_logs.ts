import type { Migration } from '../migrations-async.js'

export const migration_033: Migration = {
  id: 33,
  name: 'migration_033_strip_b64_json_from_logs',
  sql: `
-- 清理 external_api_logs 中旧数据的 b64_json 字段
-- 图片已保存到磁盘，日志中保留 base64 原文无意义且拖垮查询
-- 只处理含 b64_json 且体积 >10KB 的记录

-- 1. 清理 response_body (TEXT列)
UPDATE external_api_logs
SET response_body = (
  SELECT (response_body::jsonb - 'data') || jsonb_build_object(
    'data',
    jsonb_agg(
      CASE
        WHEN item ? 'b64_json' THEN item - 'b64_json'
        ELSE item
      END
    )
  )
  FROM jsonb_array_elements(
    CASE
      WHEN response_body::jsonb ? 'data' THEN (response_body::jsonb->'data')
      ELSE '[]'::jsonb
    END
  ) AS item
)
WHERE response_body IS NOT NULL
  AND response_body LIKE '%"b64_json"%'
  AND length(response_body) > 10000;

-- 2. 清理 result_data (JSONB列)
UPDATE external_api_logs
SET result_data = (
  SELECT (result_data - 'data') || jsonb_build_object(
    'data',
    jsonb_agg(
      CASE
        WHEN item ? 'b64_json' THEN item - 'b64_json'
        ELSE item
      END
    )
  )
  FROM jsonb_array_elements(
    CASE
      WHEN result_data ? 'data' THEN (result_data->'data')
      ELSE '[]'::jsonb
    END
  ) AS item
)
WHERE result_data IS NOT NULL
  AND result_data::text LIKE '%"b64_json"%';
  `,
}
