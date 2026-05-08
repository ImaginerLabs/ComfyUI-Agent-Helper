# comfyui-agent-helper

面向 AI Agent 的 ComfyUI 工作流统一编解码库 —— 将 API、UI、Blueprint 等多种 ComfyUI 格式统一为内部表示，支持完整的往返转换。

## 为什么需要这个库？

当 AI Agent（Claude、GPT 等）处理 ComfyUI 工作流时，面临核心困境：

- **格式多样**：ComfyUI 有 API 格式、UI 格式（v0.4/v1.0）、Blueprint 等多种格式
- **信息丢失**：不同格式间转换时，`widgets_values`、节点位置等元数据容易丢失
- **版本差异**：UI 格式 v0.4（links 数组）和 v1.0（links 对象）结构不同

**本库的解决方案：**

```
                    ┌─────────────────────────────────────┐
                    │         UnifiedWorkflow             │
                    │   (统一内部表示，保留所有信息)         │
                    └─────────────────────────────────────┘
                           ▲                    │
                    decode │                    │ encode
                           │                    ▼
    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ API v1   │     │ UI v1.0  │     │ UI v0.4  │     │ Blueprint│
    │ Codec    │     │ Codec    │     │ Codec    │     │ Codec    │
    └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

## 安装

```bash
npm install @imaginerlabs/comfyui-agent-helper
# 或
pnpm add @imaginerlabs/comfyui-agent-helper
```

要求 Node.js >= 22。

## 快速开始

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

// 导出为目标格式
const exported = exportWorkflow(workflow, { format: 'ui-v1.0' });
// exported.data → ComfyUI UI 格式 JSON
```

## 核心概念

| 概念 | 说明 |
|------|------|
| **UnifiedWorkflow** | 统一的内部工作流表示，能容纳所有 ComfyUI 格式的信息 |
| **WorkflowCodec** | 编解码器，负责格式转换（API/UI v0.4/UI v1.0/Blueprint） |
| **Step** | 工作流的功能区块，Agent 的独立设计单元 |
| **Node** | ComfyUI 节点，对应 `class_type` + `inputs` |

## 支持的格式

| 格式 ID | 格式族 | 版本 | 说明 | 往返支持 |
|---------|--------|------|------|---------|
| `api-v1` | api | 1 | ComfyUI API 执行格式 | 否（丢失位置信息） |
| `ui-v0.4` | ui | 0.4 | ComfyUI UI 格式（links 是数组） | 是 |
| `ui-v1.0` | ui | 1.0 | ComfyUI UI 格式（links 是对象） | 是 |
| `blueprint-v1` | blueprint | 1 | 本库原生格式 | 是 |

## API 参考

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

### 创建工作流

```typescript
import { createUnifiedWorkflow } from '@imaginerlabs/comfyui-agent-helper';

const workflow = createUnifiedWorkflow();
workflow.steps.set('step1', {
  id: 'step1',
  name: 'Step 1',
  nodes: [{ id: 'n1', type: 'KSampler', widgets: { seed: 123 } }],
  internalLinks: [],
});
```

### 校验工作流

```typescript
import { validateWorkflow } from '@imaginerlabs/comfyui-agent-helper';

const result = validateWorkflow(workflow);
if (!result.valid) {
  console.log(result.issues); // ValidationIssue[]
}
```

## 完整往返转换

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