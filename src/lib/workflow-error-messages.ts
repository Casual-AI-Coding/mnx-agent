import { ValidationErrorCode } from './workflow-validation'

export interface ErrorMessage {
  title: string
  description: string
  suggestion: string
}

export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  ORPHANED_NODE: {
    title: '未连接的节点',
    description: '该节点没有与其他节点连接，无法参与工作流执行',
    suggestion: '拖动连接线将此节点接入工作流，或删除不需要的节点',
  },
  MISSING_SERVICE: {
    title: '缺少服务配置',
    description: '动作节点需要指定要调用的服务类型',
    suggestion: '在配置面板中选择服务类型（如 text, image, voice）',
  },
  MISSING_METHOD: {
    title: '缺少方法配置',
    description: '动作节点需要指定要调用的具体方法',
    suggestion: '在配置面板中选择方法（如 generate, chat）',
  },
  MISSING_CONDITION: {
    title: '缺少条件表达式',
    description: '条件节点需要设置判断逻辑来决定分支走向',
    suggestion: '在配置面板中输入条件表达式，如 {{input.score}} > 0.5',
  },
  CYCLE_DETECTED: {
    title: '循环依赖',
    description: '工作流中检测到循环引用，这会导致无限循环',
    suggestion: '确保节点连接形成有向无环图(DAG)，移除循环连接',
  },
  INVALID_TEMPLATE: {
    title: '无效的模板语法',
    description: '模板变量格式不正确，无法正确解析',
    suggestion: '使用双花括号格式: {{nodeId.output}}',
  },
  MISSING_LABEL: {
    title: '缺少节点名称',
    description: '节点需要一个名称来标识其用途',
    suggestion: '在配置面板中为节点设置一个描述性名称',
  },
  INVALID_ITERATION: {
    title: '无效的迭代次数',
    description: '循环节点的最大迭代次数必须至少为 1',
    suggestion: '在配置面板中将最大迭代次数设置为 1 或更大的值',
  },
}

export function getErrorHelp(code: string): ErrorMessage {
  return ERROR_MESSAGES[code as ValidationErrorCode] || {
    title: '配置错误',
    description: '节点配置存在问题',
    suggestion: '检查配置面板中的设置',
  }
}
