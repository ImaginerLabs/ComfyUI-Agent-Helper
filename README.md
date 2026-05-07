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
npm install comfyui-agent-helper
# 或
pnpm add comfyui-agent-helper
```

要求 Node.js >= 22。

## 快速开始

```typescript
import { createWorkflow, addStep, connectSteps, compose } from 'comfyui-agent-helper';

// 1. 创建工作流
const wf = createWorkflow({ name: 'SDXL 文生图' });

// 2. 添加 Step - 加载模型
addStep(wf, {
  id: 'load-models',
  name: '加载模型',
  description: '加载 SDXL checkpoint 模型',
  nodes: [
    {
      id: 'checkpoint',
      type: 'CheckpointLoaderSimple',
      widgets: { ckpt_name: 'sd_xl_base_1.0.safetensors' },
    },
  ],
  internalLinks: [],
  outputs: [
    { id: 'model', label: 'MODEL', type: 'MODEL', source: ['checkpoint', 0] },
    { id: 'clip',  label: 'CLIP',  type: 'CLIP',  source: ['checkpoint', 1] },
    { id: 'vae',   label: 'VAE',   type: 'VAE',   source: ['checkpoint', 2] },
  ],
});

// 3. 添加 Step - 提示词编码
addStep(wf, {
  id: 'encode-prompts',
  name: '提示词编码',
  nodes: [
    { id: 'positive', type: 'CLIPTextEncode', widgets: { text: 'a beautiful landscape' } },
    { id: 'negative', type: 'CLIPTextEncode', widgets: { text: 'blur, low quality' } },
  ],
  internalLinks: [],
  inputs: [
    { id: 'clip', label: 'CLIP', type: 'CLIP', target: ['positive', 'clip'] },
  ],
  outputs: [
    { id: 'positive_cond', label: 'Positive', type: 'CONDITIONING', source: ['positive', 0] },
    { id: 'negative_cond', label: 'Negative', type: 'CONDITIONING', source: ['negative', 0] },
  ],
});

// 4. 连接 Step
connectSteps(wf,
  { stepId: 'load-models',    portId: 'clip' },
  { stepId: 'encode-prompts', portId: 'clip' }
);

// 5. 生成最终工作流
const result = compose(wf.id);
// result.apiFormat → { "1": { class_type: "...", inputs: {...} }, ... }
```

## 核心概念

| 概念 | 说明 |
|------|------|
| **Workflow** | 最终产出的完整工作流，包含所有节点、连线 |
| **Step** | 工作流的功能区块，Agent 的独立设计单元。内部包含节点和连线，对外暴露输入/输出端口 |
| **Node** | ComfyUI 节点，对应 `class_type` + `inputs` |
| **Internal Link** | Step 内部两个节点之间的连线 |
| **Step Port** | Step 暴露给外部的 I/O 端口，桥接内部节点与外部连线 |
| **Cross-Step Link** | 两个 Step 之间的连接，从输出端口指向输入端口 |

## API 概览

### Workflow 管理

| 函数 | 说明 |
|------|------|
| `createWorkflow(options?)` | 创建一个空工作流，返回 `WorkflowHandle` |
| `getWorkflowSummary(handle)` | 查看工作流的 Step 列表及连接关系 |
| `resetWorkflow(handle)` | 清空所有 Step，重新开始 |
| `importFromJSON(handle, json)` | 从 ComfyUI Blueprint JSON 导入工作流 |

### Step 管理

| 函数 | 说明 |
|------|------|
| `addStep(wf, definition)` | 添加一个功能区块（声明式，一次传入完整结构） |
| `updateStep(wf, stepId, definition)` | 修改已有 Step 的内容 |
| `removeStep(wf, stepId)` | 移除某个 Step 及其内部所有节点 |
| `getStep(wf, stepId)` | 查看某个 Step 的完整定义 |

### 跨 Step 连接

| 函数 | 说明 |
|------|------|
| `connectSteps(wf, source, target)` | 将 Step A 的输出端口连接到 Step B 的输入端口 |
| `disconnectSteps(wf, source, target)` | 移除已有的跨 Step 连接 |

### 组合 & 校验

| 函数 | 说明 |
|------|------|
| `compose(workflowId)` | 生成 ComfyUI API 格式的 JSON |
| `validateWorkflow(handle)` | 校验工作流完整性（缺失连接、孤立节点等） |
| `workflowToCode(handle)` | 将工作流反向生成为 TypeScript 代码 |

## 从 Blueprint JSON 导入

支持从 ComfyUI 的 Blueprint JSON 格式导入已有工作流：

```typescript
import { createWorkflow, importFromJSON, compose } from 'comfyui-agent-helper';

const wf = createWorkflow();
importFromJSON(wf, blueprintJson); // 自动解析 Subgraph → Step

const result = compose(wf.id);
```

导入引擎自动处理：节点 ID 转换、widget 参数提取、内部连线与端口的映射。

## API 设计原则

面向 LLM Agent 优化：

- **一个函数做一件事**：`addNode()` 只添加节点，不隐式建立连接
- **声明式定义 Step**：一次调用传入完整结构，减少 Agent 调用次数
- **参数扁平化**：避免深层嵌套，TypeScript 类型约束不强制 Agent 感知
- **错误即指导**：错误消息包含修复建议
- **操作幂等**：同一参数的重复调用是安全的

## 开发

```bash
pnpm install        # 安装依赖
pnpm build          # 构建（tsup, ESM + CJS 双输出）
pnpm test           # 运行测试（Vitest）
pnpm test:watch     # 监听模式
pnpm lint           # ESLint 检查
pnpm format         # Prettier 格式化
```

### 技术栈

| 层面 | 选择 |
|------|------|
| 语言 | TypeScript 6.0 |
| 运行时 | Node.js >= 22 |
| 构建 | tsup（esbuild） |
| 包管理 | pnpm |
| 测试 | Vitest |
| 输出格式 | ESM + CJS |

## License

MIT
