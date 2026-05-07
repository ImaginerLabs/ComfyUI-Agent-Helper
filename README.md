# comfyui-agent-helper

面向 AI Agent 的 ComfyUI 工作流分步构建库 —— 将复杂工作流拆分为可独立设计的 **Step（功能区块）**，Agent 每次只专注于一个区块，最后自动合并为完整的 ComfyUI 工作流 JSON。

## 为什么需要这个库？

当 AI Agent（Claude、GPT 等）尝试生成完整的 ComfyUI 工作流时，面临核心困境：

- **单次生成过长**：一个完整工作流可能包含 20-80 个节点，Agent 一次性生成如此庞大的 JSON 极易出错
- **注意力分散**：Agent 需要同时关注所有节点的类型、参数、连线关系，注意力随节点数增加而衰减
- **错误传播**：一个节点的参数或连线错误会导致整个工作流无法执行，且难以定位

**本库的解决方案：**

```
传统方式：Agent → 一次性生成 50 个节点的完整 JSON → 高频出错

本库方式：Agent → Step 1 (5节点) → Step 2 (8节点) → Step 3 (6节点)
                  ↓                    ↓                    ↓
                 合并引擎 → 最终 19 个节点的完整工作流 JSON
```

## 安装

```bash
npm install @imaginerlabs/comfyui-agent-helper
# 或
pnpm add @imaginerlabs/comfyui-agent-helper
```

要求 Node.js >= 22。

## 快速开始

### 方式一：统一编解码器 API（推荐）

```typescript
import {
  importWorkflow,
  exportWorkflow,
  detectFormat,
  createUnifiedWorkflow,
} from '@imaginerlabs/comfyui-agent-helper';

// 导入现有工作流（自动检测格式）
const result = importWorkflow(comfyUIJson);
console.log(result.detectedFormat); // { id: 'ui-v0.4', family: 'ui', ... }

// 操作工作流
const workflow = result.workflow;
workflow.name = 'My Modified Workflow';

// 导出为目标格式
const exported = exportWorkflow(workflow, { format: 'ui-v1.0' });
// exported.data → ComfyUI UI 格式 JSON
```

### 方式二：分步构建 API

```typescript
import { createWorkflow, addStep, connectSteps, compose } from '@imaginerlabs/comfyui-agent-helper';

// 1. 创建工作流
const wf = createWorkflow({ name: 'SDXL 文生图' });

// 2. 添加 Step - 加载模型
addStep(wf.id, {
  id: 'load-models',
  name: '加载模型',
  nodes: [
    { id: 'checkpoint', type: 'CheckpointLoaderSimple', widgets: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
  ],
  internalLinks: [],
  outputs: [
    { id: 'model', label: 'MODEL', type: 'MODEL', source: ['checkpoint', 0] },
  ],
});

// 3. 生成最终工作流
const result = compose(wf.id);
```

## 核心概念

| 概念 | 说明 |
|------|------|
| **UnifiedWorkflow** | 统一的内部工作流表示，能容纳所有 ComfyUI 格式的信息 |
| **WorkflowCodec** | 编解码器，负责格式转换（API/UI v0.4/UI v1.0/Blueprint） |
| **Step** | 工作流的功能区块，Agent 的独立设计单元 |
| **Node** | ComfyUI 节点，对应 `class_type` + `inputs` |

## 统一编解码器 API

### 支持的格式

| 格式 ID | 格式族 | 版本 | 说明 |
|---------|--------|------|------|
| `api-v1` | api | 1 | ComfyUI API 执行格式 |
| `ui-v0.4` | ui | 0.4 | ComfyUI UI 格式（links 是数组） |
| `ui-v1.0` | ui | 1.0 | ComfyUI UI 格式（links 是对象） |
| `blueprint-v1` | blueprint | 1 | 本库原生格式 |

### 导入工作流

```typescript
import { importWorkflow, detectFormat } from '@imaginerlabs/comfyui-agent-helper';

// 自动检测格式并导入
const result = importWorkflow(comfyUIJson);
console.log(result.detectedFormat.id); // 'ui-v0.4' | 'api-v1' | ...
console.log(result.workflow.steps.size); // Step 数量

// 自定义导入选项
const result2 = importWorkflow(comfyUIJson, {
  stepId: 'my_step',
  stepName: 'My Step',
});
```

### 导出工作流

```typescript
import { exportWorkflow } from '@imaginerlabs/comfyui-agent-helper';

// 导出为 API 格式
const apiResult = exportWorkflow(workflow, { format: 'api-v1' });

// 导出为 UI v0.4 格式（兼容旧版 ComfyUI）
const uiResult = exportWorkflow(workflow, { format: 'ui-v0.4' });

// 导出为 UI v1.0 格式（最新版 ComfyUI）
const uiV1Result = exportWorkflow(workflow, { format: 'ui-v1.0' });
```

### 检测格式

```typescript
import { detectFormat } from '@imaginerlabs/comfyui-agent-helper';

const format = detectFormat(json);
if (format) {
  console.log(format.id);        // 'ui-v0.4'
  console.log(format.family);    // 'ui'
  console.log(format.version);   // '0.4'
  console.log(format.roundtripCapable); // true
}
```

### 完整往返转换

```typescript
import { importWorkflow, exportWorkflow } from '@imaginerlabs/comfyui-agent-helper';

// 导入
const result = importWorkflow(originalJson);

// 导出（与原始 JSON 一致）
const exported = exportWorkflow(result.workflow, { format: 'ui-v0.4' });

// widgets_values 完整保留
const ui = exported.data as { nodes: Array<{ type: string; widgets_values?: unknown[] }> };
const ksampler = ui.nodes.find(n => n.type === 'KSampler');
console.log(ksampler?.widgets_values); // [123456, 'randomize', 20, 7, 'euler', 'normal', 1]
```

## 分步构建 API

### Workflow 管理

| 函数 | 说明 |
|------|------|
| `createWorkflow(options?)` | 创建一个空工作流 |
| `getWorkflowSummary(workflowId)` | 查看工作流的 Step 列表 |
| `resetWorkflow(workflowId)` | 清空所有 Step |

### Step 管理

| 函数 | 说明 |
|------|------|
| `addStep(workflowId, definition)` | 添加一个功能区块 |
| `updateStep(workflowId, stepId, definition)` | 修改已有 Step |
| `removeStep(workflowId, stepId)` | 移除某个 Step |
| `getStep(workflowId, stepId)` | 查看某个 Step |

### 跨 Step 连接

| 函数 | 说明 |
|------|------|
| `connectSteps(workflowId, source, target)` | 连接 Step A 的输出到 Step B 的输入 |
| `disconnectSteps(workflowId, source, target)` | 移除连接 |

### 组合 & 校验

| 函数 | 说明 |
|------|------|
| `compose(workflowId, options?)` | 生成 ComfyUI 工作流 JSON |
| `validateWorkflow(workflowId, options?)` | 校验工作流完整性 |
| `workflowToCode(workflowId, options?)` | 反向生成 TypeScript 代码 |

## 节点预设系统

```typescript
import { registerPreset, validateNode, type NodePreset } from '@imaginerlabs/comfyui-agent-helper';

const ksamplerPreset: NodePreset = {
  type: 'KSampler',
  name: 'KSampler 采样器',
  category: 'sampling',
  inputs: [
    { name: 'model', type: 'MODEL', required: true },
    { name: 'positive', type: 'CONDITIONING', required: true },
  ],
  widgets: [
    { name: 'seed', type: 'INT', default: 0 },
    { name: 'steps', type: 'INT', default: 20, min: 1, max: 1000 },
  ],
  outputs: [
    { name: 'LATENT', type: 'LATENT', slotIndex: 0 },
  ],
};

registerPreset(ksamplerPreset);
```

## 类型系统

```typescript
// 编解码器类型
import type {
  UnifiedWorkflow,
  FormatId,
  FormatInfo,
  WorkflowCodec,
  DecodeOptions,
  EncodeOptions,
} from '@imaginerlabs/comfyui-agent-helper';

// 核心类型
import type {
  StepDefinition,
  StepNode,
  InternalLink,
  CrossStepLink,
  ComfyAPINode,
  ComfyUIFormat,
} from '@imaginerlabs/comfyui-agent-helper';

// 预设类型
import type {
  NodePreset,
  ValidationMode,
} from '@imaginerlabs/comfyui-agent-helper';
```

## 开发

```bash
pnpm install        # 安装依赖
pnpm build          # 构建
pnpm test           # 运行测试
pnpm test:watch     # 监听模式
```

## License

Apache-2.0
