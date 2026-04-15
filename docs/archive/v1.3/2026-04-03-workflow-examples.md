# Workflow 示例配置文档

> 生成日期: 2026-04-03
> 目标: 提供可运行的 workflow JSON 配置示例

---

## 一、基础示例（单节点）

### 1.1 文本生成

```json
{
  "nodes": [
    {
      "id": "text-gen",
      "type": "action",
      "data": {
        "label": "文本生成",
        "config": {
          "service": "minimaxClient",
          "method": "chatCompletion",
          "args": [
            {
              "model": "abab6.5s-chat",
              "messages": [
                {"role": "user", "content": "用一句话描述春天"}
              ],
              "temperature": 0.7
            }
          ]
        }
      },
      "position": {"x": 100, "y": 100}
    }
  ],
  "edges": []
}
```

**预期输出**：
```json
{
  "id": "text-gen",
  "output": {
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "春天是万物复苏、生机盎然的美好季节。"
        },
        "finish_reason": "stop"
      }
    ]
  }
}
```

---

### 1.2 图片生成

```json
{
  "nodes": [
    {
      "id": "image-gen",
      "type": "action",
      "data": {
        "label": "图片生成",
        "config": {
          "service": "minimaxClient",
          "method": "imageGeneration",
          "args": [
            {
              "prompt": "一只可爱的橘猫在阳光下打盹",
              "model": "abab6.5s-chat",
              "n": 1,
              "size": "1024x1024"
            }
          ]
        }
      },
      "position": {"x": 100, "y": 100}
    }
  ],
  "edges": []
}
```

**预期输出**：
```json
{
  "id": "image-gen",
  "output": {
    "created": 1712150400,
    "data": [
      {
        "url": "https://api.minimax.chat/files/xxx.png"
      }
    ]
  }
}
```

---

## 二、多节点链式示例

### 2.1 文本生成 → 内容提取

```json
{
  "nodes": [
    {
      "id": "text-gen",
      "type": "action",
      "data": {
        "label": "生成故事",
        "config": {
          "service": "minimaxClient",
          "method": "chatCompletion",
          "args": [
            {
              "model": "abab6.5s-chat",
              "messages": [
                {"role": "user", "content": "写一个关于机器人的短篇故事，不超过100字"}
              ]
            }
          ]
        }
      },
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "extract-content",
      "type": "transform",
      "data": {
        "label": "提取故事内容",
        "config": {
          "transformType": "extract",
          "inputNode": "text-gen",
          "inputPath": "choices[0].message.content"
        }
      },
      "position": {"x": 300, "y": 100}
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "text-gen",
      "target": "extract-content"
    }
  ]
}
```

**数据流**：
1. `text-gen` 调用 MiniMax API 生成故事
2. `extract-content` 从输出中提取 `choices[0].message.content`

**模板变量引用**：
- `{{text-gen.output.choices[0].message.content}}` → 故事文本

---

### 2.2 图片生成 → 保存媒体 → 数据库记录

```json
{
  "nodes": [
    {
      "id": "check-capacity",
      "type": "action",
      "data": {
        "label": "检查容量",
        "config": {
          "service": "capacityChecker",
          "method": "hasCapacity",
          "args": ["image"]
        }
      },
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "image-gen",
      "type": "action",
      "data": {
        "label": "生成图片",
        "config": {
          "service": "minimaxClient",
          "method": "imageGeneration",
          "args": [
            {
              "prompt": "一幅抽象的数字艺术作品，蓝绿色调",
              "size": "1024x1024"
            }
          ]
        }
      },
      "position": {"x": 300, "y": 100}
    },
    {
      "id": "save-media",
      "type": "action",
      "data": {
        "label": "保存图片",
        "config": {
          "service": "mediaStorage",
          "method": "saveFromUrl",
          "args": [
            "{{image-gen.output.data[0].url}}",
            "generated-image.png",
            "image"
          ]
        }
      },
      "position": {"x": 500, "y": 100}
    },
    {
      "id": "save-db",
      "type": "action",
      "data": {
        "label": "记录到数据库",
        "config": {
          "service": "db",
          "method": "createMediaRecord",
          "args": [
            {
              "filename": "{{save-media.output.filename}}",
              "filepath": "{{save-media.output.filepath}}",
              "type": "image",
              "source": "image_generation",
              "size_bytes": "{{save-media.output.size_bytes}}"
            }
          ]
        }
      },
      "position": {"x": 700, "y": 100}
    }
  ],
  "edges": [
    {"id": "e1", "source": "check-capacity", "target": "image-gen"},
    {"id": "e2", "source": "image-gen", "target": "save-media"},
    {"id": "e3", "source": "save-media", "target": "save-db"}
  ]
}
```

**数据流**：
1. 容量检查 → 2. 图片生成 → 3. 保存文件 → 4. 数据库记录

---

## 三、条件分支示例

### 3.1 容量检查 + 条件执行

```json
{
  "nodes": [
    {
      "id": "check-capacity",
      "type": "action",
      "data": {
        "label": "检查图片容量",
        "config": {
          "service": "capacityChecker",
          "method": "hasCapacity",
          "args": ["image"]
        }
      },
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "has-capacity",
      "type": "condition",
      "data": {
        "label": "有容量?",
        "config": {
          "condition": "{{check-capacity.output}} == true"
        }
      },
      "position": {"x": 300, "y": 100}
    },
    {
      "id": "generate-image",
      "type": "action",
      "data": {
        "label": "生成图片",
        "config": {
          "service": "minimaxClient",
          "method": "imageGeneration",
          "args": [{"prompt": "星空"}]
        }
      },
      "position": {"x": 500, "y": 50}
    },
    {
      "id": "skip-message",
      "type": "transform",
      "data": {
        "label": "跳过提示",
        "config": {
          "transformType": "passthrough"
        }
      },
      "position": {"x": 500, "y": 150}
    }
  ],
  "edges": [
    {"id": "e1", "source": "check-capacity", "target": "has-capacity"},
    {"id": "e2", "source": "has-capacity", "target": "generate-image", "sourceHandle": "true"},
    {"id": "e3", "source": "has-capacity", "target": "skip-message", "sourceHandle": "false"}
  ]
}
```

**注意**：当前 condition 节点实现返回 boolean，edge 分支逻辑需要通过 `sourceHandle` 实现。需要验证 `sourceHandle` 分支是否已完整实现。

---

## 四、循环示例

### 4.1 批量文本生成

```json
{
  "nodes": [
    {
      "id": "topics",
      "type": "transform",
      "data": {
        "label": "话题列表",
        "config": {
          "transformType": "passthrough"
        }
      },
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "loop",
      "type": "loop",
      "data": {
        "label": "遍历话题",
        "config": {
          "items": "[\"AI\", \"云计算\", \"区块链\"]",
          "maxIterations": 3
        }
      },
      "position": {"x": 300, "y": 100}
    },
    {
      "id": "generate-text",
      "type": "action",
      "data": {
        "label": "生成简介",
        "config": {
          "service": "minimaxClient",
          "method": "chatCompletion",
          "args": [
            {
              "model": "abab6.5s-chat",
              "messages": [
                {"role": "user", "content": "用一句话介绍{{item}}"}
              ]
            }
          ]
        }
      },
      "position": {"x": 500, "y": 100}
    }
  ],
  "edges": [
    {"id": "e1", "source": "topics", "target": "loop"},
    {"id": "e2", "source": "loop", "target": "generate-text"}
  ]
}
```

**循环变量**：
- `{{item}}` — 当前迭代项（来自 `items` 数组）

---

## 五、复杂 DAG 示例

### 5.1 多分支并行处理

```json
{
  "nodes": [
    {
      "id": "text-gen",
      "type": "action",
      "data": {
        "label": "生成文本",
        "config": {
          "service": "minimaxClient",
          "method": "chatCompletion",
          "args": [{"messages": [{"role": "user", "content": "写一首诗"}]}]
        }
      },
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "voice-gen",
      "type": "action",
      "data": {
        "label": "语音合成",
        "config": {
          "service": "minimaxClient",
          "method": "textToAudioSync",
          "args": [
            {
              "text": "{{text-gen.output.choices[0].message.content}}",
              "voice_id": "female-tianmei"
            }
          ]
        }
      },
      "position": {"x": 300, "y": 50}
    },
    {
      "id": "image-gen",
      "type": "action",
      "data": {
        "label": "生成配图",
        "config": {
          "service": "minimaxClient",
          "method": "imageGeneration",
          "args": [
            {"prompt": "{{text-gen.output.choices[0].message.content}}"}
          ]
        }
      },
      "position": {"x": 300, "y": 150}
    },
    {
      "id": "save-voice",
      "type": "action",
      "data": {
        "label": "保存语音",
        "config": {
          "service": "mediaStorage",
          "method": "saveFromUrl",
          "args": [
            "{{voice-gen.output.data.audio_url}}",
            "poem-voice.mp3",
            "audio"
          ]
        }
      },
      "position": {"x": 500, "y": 50}
    },
    {
      "id": "save-image",
      "type": "action",
      "data": {
        "label": "保存图片",
        "config": {
          "service": "mediaStorage",
          "method": "saveFromUrl",
          "args": [
            "{{image-gen.output.data[0].url}}",
            "poem-image.png",
            "image"
          ]
        }
      },
      "position": {"x": 500, "y": 150}
    }
  ],
  "edges": [
    {"id": "e1", "source": "text-gen", "target": "voice-gen"},
    {"id": "e2", "source": "text-gen", "target": "image-gen"},
    {"id": "e3", "source": "voice-gen", "target": "save-voice"},
    {"id": "e4", "source": "image-gen", "target": "save-image"}
  ]
}
```

**执行顺序**（拓扑排序）：
1. text-gen
2. voice-gen, image-gen（并行）
3. save-voice, save-image（并行）

---

## 六、真实业务场景示例

### 6.1 每日图片生成 + 容量检查 + 保存

```json
{
  "nodes": [
    {
      "id": "check-balance",
      "type": "action",
      "data": {
        "label": "检查余额",
        "config": {
          "service": "capacityChecker",
          "method": "checkBalance"
        }
      },
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "has-capacity",
      "type": "condition",
      "data": {
        "label": "有容量?",
        "config": {
          "condition": "{{check-balance.output.total_balance}} > 0"
        }
      },
      "position": {"x": 300, "y": 100}
    },
    {
      "id": "generate-daily-image",
      "type": "action",
      "data": {
        "label": "生成每日图片",
        "config": {
          "service": "minimaxClient",
          "method": "imageGeneration",
          "args": [
            {
              "prompt": "今日风景，清新自然",
              "size": "1024x1024"
            }
          ]
        }
      },
      "position": {"x": 500, "y": 100}
    },
    {
      "id": "save-image",
      "type": "action",
      "data": {
        "label": "保存图片",
        "config": {
          "service": "mediaStorage",
          "method": "saveFromUrl",
          "args": [
            "{{generate-daily-image.output.data[0].url}}",
            "daily-{{Date.now()}}.png",
            "image"
          ]
        }
      },
      "position": {"x": 700, "y": 100}
    },
    {
      "id": "record-db",
      "type": "action",
      "data": {
        "label": "记录数据库",
        "config": {
          "service": "db",
          "method": "createMediaRecord",
          "args": [
            {
              "filename": "{{save-image.output.filename}}",
              "filepath": "{{save-image.output.filepath}}",
              "type": "image",
              "source": "image_generation",
              "size_bytes": "{{save-image.output.size_bytes}}"
            }
          ]
        }
      },
      "position": {"x": 900, "y": 100}
    },
    {
      "id": "decrement-capacity",
      "type": "action",
      "data": {
        "label": "扣减容量",
        "config": {
          "service": "capacityChecker",
          "method": "decrementCapacity",
          "args": ["image"]
        }
      },
      "position": {"x": 1100, "y": 100}
    }
  ],
  "edges": [
    {"id": "e1", "source": "check-balance", "target": "has-capacity"},
    {"id": "e2", "source": "has-capacity", "target": "generate-daily-image"},
    {"id": "e3", "source": "generate-daily-image", "target": "save-image"},
    {"id": "e4", "source": "save-image", "target": "record-db"},
    {"id": "e5", "source": "record-db", "target": "decrement-capacity"}
  ]
}
```

---

## 七、模板变量语法参考

### 7.1 基本语法

| 语法 | 含义 | 示例 |
|------|------|------|
| `{{nodeId.output}}` | 引用节点完整输出 | `{{text-gen.output}}` |
| `{{nodeId.output.path}}` | 引用输出中的路径 | `{{text-gen.output.choices[0].message.content}}` |
| `{{nodeId.output.array[0]}}` | 引用数组元素 | `{{image-gen.output.data[0].url}}` |
| `{{item}}` | 循环中的当前项 | 在 loop 节点内部使用 |

### 7.2 支持的操作

- **对象路径访问**：`obj.key.subkey`
- **数组索引访问**：`array[0]`, `array[1]`
- **混合访问**：`obj.array[0].key`

---

## 八、常见问题

### Q1: 模板变量未被替换？

**可能原因**：
1. 节点 ID 拼写错误
2. 输出路径不存在
3. 节点执行失败，无输出

**解决方法**：检查节点输出结构，确认路径正确

### Q2: condition 节点不生效？

**当前限制**：condition 节点返回 boolean，但不会阻断后续节点执行

**解决方法**：需要在 workflow-engine 中实现 edge 分支逻辑

### Q3: loop 节点如何传递迭代项？

**机制**：loop 节点将当前项设置为 `{{item}}`，后续节点可引用

---

## 九、测试用 Workflow JSON

可直接复制以下 JSON 用于测试：

```json
{
  "nodes": [
    {
      "id": "test-text",
      "type": "action",
      "data": {
        "label": "测试文本生成",
        "config": {
          "service": "minimaxClient",
          "method": "chatCompletion",
          "args": [{"messages": [{"role": "user", "content": "测试"}]}]
        }
      },
      "position": {"x": 100, "y": 100}
    }
  ],
  "edges": []
}
```

**测试命令**：
```bash
# 通过 API 触发 workflow
curl -X POST http://localhost:3000/api/cron/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "cron_expression": "*/5 * * * *",
    "workflow_json": "{...上面 JSON...}",
    "is_active": true
  }'
```