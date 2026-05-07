# ComfyUI Agent Helper — 需求分析与架构设计

## 一、项目定位

### 1.1 要解决的问题

当 AI Agent（如 Claude、GPT）尝试生成完整的 ComfyUI 工作流时，面临核心困境：

- **单次生成过长**：一个完整工作流可能包含 20-80 个节点，Agent 一次性生成如此庞大的 JSON 极易出错
- **注意力分散**：Agent 需要同时关注所有节点的类型、参数、连线关系，注意力随节点数增加而衰减
- **错误传播**：工作流 JSON 中一个节点的参数错误或连线错误会导致整个工作流无法执行，且难以定位

### 1.2 解决方案

将工作流拆分为多个 **Step（功能区块）**，Agent 每次只专注于设计其中一个区块，最后通过库自动合并为最终的 ComfyUI 工作流 JSON。

```
传统方式：Agent → 一次性生成 50 个节点的完整 JSON → 高频出错

本库方式：Agent → Step 1 (5个节点) → Step 2 (8个节点) → Step 3 (6个节点)
                  ↓                        ↓                        ↓
                 合并引擎 → 最终 19 个节点的完整工作流 JSON
```

### 1.3 目标使用者

**AI Agent（LLM）**——库暴露给 Agent 的函数调用接口，Agent 在对话中通过 function calling 逐步构建工作流。API 设计需满足：

- 函数签名扁平、直观，利于 LLM 理解和调用
- 每次调用做一件事，参数清晰
- 错误信息能指导 Agent 自行修正
- 操作幂等，重复调用不会产生副作用

---

## 二、核心概念

```
┌─────────────────────────────────────────────────────┐
│                    Workflow                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │    Step A    │  │    Step B    │  │   Step C   │ │
│  │ ┌──┐  ┌──┐  │  │ ┌──┐  ┌──┐  │  │ ┌──┐ ┌──┐  │ │
│  │ │N1├──┤N2│  │  │ │N3├──┤N4│  │  │ │N5├─┤N6│  │ │
│  │ └──┘  └┬─┘  │  │ └▲─┘  └──┘  │  │ └──┘ └──┘  │ │
│  │        │out │  │  │in         │  │             │ │
│  └────────┼────┘  └──┼──────────┘  └─────────────┘ │
│           └──────────┘                              │
│              跨 Step 连接                            │
└─────────────────────────────────────────────────────┘
```

| 概念 | 说明 |
|------|------|
| **Workflow** | 最终产出的完整工作流，包含所有节点、连线、UI 元数据 |
| **Step** | 工作流的功能区块，Agent 的独立设计单元。内部包含节点和内部连线，对外暴露输入/输出端口 |
| **Node** | ComfyUI 节点，对应 `class_type` + `inputs` + `_meta` |
| **Internal Link** | Step 内部两个节点之间的连线 |
| **Step Port** | Step 暴露给外部的 I/O 端口——输入端口映射到内部某个节点的输入，输出端口映射到内部某个节点的输出 |
| **Cross-Step Link** | 两个 Step 之间的连线，从输出端口指向输入端口 |

---

## 三、功能需求

### 3.1 Workflow 管理

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 创建 Workflow | P0 | 初始化一个空工作流，返回 workflowId |
| 获取 Workflow 摘要 | P1 | 查看当前工作流包含的 Step 列表及连接关系 |
| 重置/清空 Workflow | P2 | 清空所有 Step，重新开始 |
| 从现有 JSON 导入 | P3 | 导入已有 ComfyUI 工作流 JSON 作为起点 |

### 3.2 Step 管理

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 添加 Step | P0 | 添加一个功能区块，包含节点、内部连线、I/O 端口定义 |
| 更新 Step | P1 | 修改已有 Step 的内容（Agent 发现错误需要修正） |
| 删除 Step | P1 | 移除某个 Step 及其内部所有节点 |
| 查看 Step 详情 | P1 | 查看某个 Step 的完整定义 |

### 3.3 跨 Step 连接

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 连接两个 Step | P0 | 将 Step A 的输出端口连接到 Step B 的输入端口 |
| 断开连接 | P1 | 移除已有的跨 Step 连接 |
| 连接校验 | P1 | 检查端口类型是否兼容（可选） |

### 3.4 工作流组合

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 生成 API 格式 JSON | P0 | 产出 ComfyUI API 格式的 JSON（`{nodeId: {...}}` 扁平结构） |
| 生成 UI 格式 JSON | P0 | 产出 ComfyUI UI 格式的 JSON（`{nodes, links, groups}` 含位置信息） |
| 自动布局 | P1 | 为每个 Step 自动计算节点位置和分组信息 |
| 手动指定位置 | P2 | 允许 Agent 手动设置 Step 在画布上的位置 |
| ID 去重 | P0 | 自动处理各 Step 内部节点 ID 的命名空间隔离 |

### 3.5 校验与调试

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 完整性检查 | P1 | 检查是否有未连接的必填输入 |
| 孤立节点检测 | P2 | 检测是否存在无任何连线的孤立节点 |
| 循环依赖检测 | P2 | 检测是否存在环形连接 |

---

## 四、API 设计原则

面向 LLM Agent 的函数式 API，遵循以下原则：

1. **一个函数做一件事**：`addNode()` 只添加节点，不隐式建立连接
2. **声明式定义 Step**：一次调用传入 Step 的完整结构，减少 Agent 调用次数
3. **参数扁平化**：避免深层嵌套对象，在 TypeScript 层面提供类型约束但不强制 Agent 感知
4. **错误即指导**：错误消息包含修复建议和示例
5. **无状态副作用**：同一参数的重复调用是安全的（幂等创建，后者覆盖前者）

### 4.1 函数签名概览

```typescript
// === Workflow ===
createWorkflow(options?: { name?: string }): WorkflowHandle

// === Step ===
addStep(wf: WorkflowHandle, definition: StepDefinition): StepHandle
updateStep(wf: WorkflowHandle, stepId: string, definition: StepDefinition): void
removeStep(wf: WorkflowHandle, stepId: string): void
getStep(wf: WorkflowHandle, stepId: string): StepDefinition | null

// === Cross-Step Connections ===
connectSteps(
  wf: WorkflowHandle,
  source: { stepId: string; portId: string },
  target: { stepId: string; portId: string }
): void
disconnectSteps(
  wf: WorkflowHandle,
  source: { stepId: string; portId: string },
  target: { stepId: string; portId: string }
): void

// === Compose ===
compose(wf: WorkflowHandle, options?: ComposeOptions): ComfyUIWorkflow
```

### 4.2 核心数据结构

```typescript
interface StepDefinition {
  /** Step 的唯一标识（在 Workflow 内唯一） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述这个 Step 是做什么的（帮助 Agent 理解和维护） */
  description?: string;
  /** Step 内部的节点列表 */
  nodes: StepNode[];
  /** 内部连线 */
  internalLinks: InternalLink[];
  /** 暴露给其他 Step 的输入端口 */
  inputs?: StepInputPort[];
  /** 暴露给其他 Step 的输出端口 */
  outputs?: StepOutputPort[];
  /** UI 位置（画布分组位置），不填则自动计算 */
  position?: { x: number; y: number };
}

/** ComfyUI 数据类型系统 */
type ComfyDataType =
  | 'MODEL' | 'CLIP' | 'VAE' | 'LATENT' | 'CONDITIONING'
  | 'IMAGE' | 'MASK' | 'CONTROL_NET'
  | 'CLIP_VISION' | 'CLIP_VISION_OUTPUT'
  | 'STYLE_MODEL' | 'GLIGEN'
  | string; // 允许扩展类型

interface StepNode {
  /** 在 Step 内部的唯一 ID（命名空间隔离，可自由命名） */
  id: string;
  /** ComfyUI 节点类型，如 "KSampler", "CheckpointLoaderSimple" */
  type: string;
  /** 一句话描述，帮助 Agent 理解节点用途 */
  description?: string;
  /** 节点分类标签，如 "loaders", "sampling", "conditioning" */
  category?: string;
  /** 标量参数（非连线的输入值）。
   * 支持类型：INT(number)、FLOAT(number)、STRING(string)、BOOLEAN(boolean)、COMBO(string)
   * COMBO 类型值从预定义选项中选择，如 sampler_name: "euler" */
  widgets?: Record<string, unknown>;
  /** 节点标题 */
  title?: string;
  /** 节点在 Step 内部画布的相对位置 */
  position?: { x: number; y: number };
}

interface InternalLink {
  /** 来源：[nodeId, outputSlotIndex] */
  from: [string, number];
  /** 目标：[nodeId, inputName] */
  to: [string, string];
}

interface StepInputPort {
  /** 端口 ID，在 Step 内唯一 */
  id: string;
  /** 显示标签 */
  label: string;
  /** 数据类型，如 "MODEL", "LATENT", "CONDITIONING" */
  type?: ComfyDataType;
  /** 映射到内部哪个节点的哪个输入 */
  target: [nodeId: string, inputName: string];
}

interface StepOutputPort {
  /** 端口 ID，在 Step 内唯一 */
  id: string;
  /** 显示标签 */
  label: string;
  /** 数据类型 */
  type?: ComfyDataType;
  /** 映射到内部哪个节点的哪个输出（slot 索引） */
  source: [nodeId: string, outputSlotIndex: number];
}
```

### 4.3 关键设计说明

#### widgets 值类型

`widgets` 中的值对应 ComfyUI API JSON 中 `inputs` 的静态参数。根据节点文档分析，参数类型分布如下：

| 类型 | TypeScript 类型 | 示例 | 说明 |
|------|----------------|------|------|
| INT | `number` | `seed: 42`, `steps: 20` | 整数，可带范围限制 |
| FLOAT | `number` | `cfg: 7.0`, `denoise: 1.0` | 浮点数，可带范围和步长 |
| STRING | `string` | `text: "a beautiful landscape"` | 文本，支持多行 |
| COMBO | `string` | `ckpt_name: "sdxl.safetensors"` | 从预定义选项中选择 |
| BOOLEAN | `boolean` | `noise_mask: true` | 布尔值 |

> COMBO 是最常见的参数类型（44 处），如 `ckpt_name`、`sampler_name`、`scheduler` 等。Agent 传入字符串值即可，组合引擎不做选项合法性校验。

#### 可连线控件（Widget + Link 混合输入）

ComfyUI 中许多参数（如 KSampler 的 `seed`、`steps`、`cfg`）在 UI 上表现为控件（widget），但也可以接受其他节点的输出连线。

在本库设计中，这种混合输入通过以下方式处理：
- **通过 widget 设置值**：在 `widgets` 中传入静态值
- **通过连线设置值**：建立 `internalLink`，目标为该 inputName
- **冲突处理**：同一 inputName 同时存在 widget 和 internalLink 时，**以 internalLink 为准**（连线覆盖 widget）

#### 输出节点

部分节点（如 `SaveImage`、`PreviewImage`）为输出节点，不返回工作流数据，仅产生副作用（保存文件 / UI 预览）。这类节点：
- `outputs` 数组为空（或不定义 outputs）
- 在 API 格式中正常存在，在 UI 格式中正常显示
- 不被其他节点引用为输入源

---

## 五、架构设计

### 5.1 模块划分

```
src/
├── index.ts                    # 公共 API 入口
├── types.ts                    # 所有公共类型定义
│
├── workflow/
│   ├── workflow.ts             # Workflow 创建、管理
│   └── types.ts                # Workflow 相关类型
│
├── step/
│   ├── step-manager.ts         # Step 的增删改查
│   └── types.ts                # Step 相关类型
│
├── compose/
│   ├── composer.ts             # 组合引擎：将 Steps 合并为最终 JSON
│   ├── id-resolver.ts          # ID 命名空间解析与冲突处理
│   ├── layout.ts               # 自动布局计算
│   └── types.ts                # 组合相关类型
│
├── validate/
│   ├── validator.ts            # 完整性校验
│   └── types.ts                # 校验结果类型
│
└── utils/
    ├── id-generator.ts         # ID 生成工具
    └── deep-clone.ts           # 深拷贝工具
```

### 5.2 数据流

```
Agent 调用 addStep()
  │
  ▼
StepManager.store(step)          —— 存储 Step 定义（内存中）
  │
  │  Agent 调用 connectSteps()
  ▼
Workflow.addCrossLink(link)      —— 记录跨 Step 连接关系
  │
  │  Agent 调用 compose()
  ▼
Composer.compose(workflow)
  │
  ├── ID Resolver: 为所有节点分配全局唯一 ID
  ├── Node Collector: 收集所有 Step 的节点
  ├── Link Collector: 收集内部连线 + 解析跨 Step 连线
  ├── Layout: 计算分组位置和节点偏移
  └── Serializer: 输出 API 格式 + UI 格式 JSON
```

### 5.3 组合引擎核心逻辑

```
compose(workflow):
  1. 遍历所有 Step，为每个 Step 内的节点 ID 添加命名空间前缀
     例：step "load" 内的节点 "checkpoint" → 全局 ID "load:checkpoint"

  2. 构建 ID 映射表 { stepId: { internalId → globalId } }

  3. 收集所有节点：
     - 收集所有 Step 的 nodes，替换 ID 为全局 ID
     - 调整节点位置（加上 Step 的位置偏移）
     - 合并 widgets 和 internalLinks：
       · 节点的 widgets 值直接作为 inputs 的静态参数
       · internalLinks 转换为 `[globalNodeId, outputSlotIndex]` 引用
       · 若同一 inputName 同时存在于 widgets 和 internalLinks，以 internalLinks 为准（连线覆盖 widget）

  4. 收集所有连线（生成 API 格式的 inputs 对象）：
     a. 内部连线：将 from/to 中的节点 ID 替换为全局 ID
     b. 跨 Step 连线：通过端口映射找到实际的源/目标节点和端口

  5. 生成 Groups（UI 格式）：
     每个 Step 对应一个 Group，包含该 Step 内所有节点的全局 ID

  6. 输出两种格式：
     - API 格式：{ [globalId]: { class_type, inputs, _meta } }
     - UI 格式：{ nodes: [...], links: [...], groups: [...] }
```

---

## 六、技术栈

### 6.1 版本信息（2026-05-07 查询）

| 层面 | 选择 | 锁定版本 | 说明 |
|------|------|----------|------|
| **语言** | TypeScript | **6.0.3** | 最新稳定版，2026-04 发布 |
| **运行时** | Node.js | **≥24.15.0 LTS** | 生产环境推荐 LTS（Krypton）；Node 22 LTS（Jod）作为备选 |
| **构建工具** | tsup | **8.5.1** | 基于 esbuild，零配置 ESM + CJS 双输出 |
| **包管理器** | pnpm | **10.26** | 最新稳定版 |
| **测试框架** | Vitest | **4.1.5** | 最新稳定版 |
| **Linter** | ESLint | **10.3.0** | 最新稳定版 |
| **Formatter** | Prettier | **3.8.3** | 最新稳定版 |
| **输出格式** | ESM + CJS | — | 同时支持 `import` 和 `require()` |

### 6.2 Node.js LTS 选择

| 版本 | 代号 | 状态 | LTS 截止 |
|------|------|------|----------|
| **v24.15.0** | Krypton | **Active LTS（推荐）** | 2027-04 |
| v22.22.2 | Jod | Maintenance LTS | 2027-04 |
| v26.0.0 | - | Current（非 LTS） | 2026-10 转 LTS |

> 选择 v24 LTS：兼顾稳定性与现代特性，生态兼容性最好。

### 6.3 构建工具说明

**tsup 8.5.1** 是当前选择，但需注意其维护状态：

| 工具 | 版本 | 状态 |
|------|------|------|
| **tsup** | 8.5.1 | ⚠️ 官方标记为不再积极维护，推荐迁移至 tsdown |
| tsdown | 0.22.0 | tsup 的官方继任者，基于 Rolldown，但尚在 0.x 阶段 |

> 当前选择 tsup 8.5.1 的理由：基于成熟的 esbuild，在大量项目中验证稳定；tsdown 仍在 0.x 阶段，待其发布 1.0 稳定版后再迁移。

### 6.4 不引入的依赖

| 不引入 | 理由 |
|--------|------|
| 运行时验证库（Zod/Yup） | 库面向 LLM Agent，类型校验交给 TypeScript 编译期；Agent 需要的是指导性错误而非类型守卫；后续可按需添加 |
| UI 框架 | 纯 Node.js 库，无 UI 需求 |
| 工作流引擎 | 库只负责"拼装 JSON"，不负责执行 |
| 数据库/持久化 | 无服务端，数据在内存中操作 |

---

## 七、Step 设计示例

以下展示 Agent 如何使用本库拆解一个 SDXL 文生图工作流：

### Step 1：加载模型

```typescript
addStep(wf, {
  id: "load-models",
  name: "加载模型",
  description: "加载 SDXL checkpoint 模型",
  nodes: [
    {
      id: "checkpoint",
      type: "CheckpointLoaderSimple",
      widgets: { ckpt_name: "sd_xl_base_1.0.safetensors" },
      title: "SDXL Checkpoint"
    }
  ],
  internalLinks: [],
  outputs: [
    { id: "model", label: "MODEL", type: "MODEL", source: ["checkpoint", 0] },
    { id: "clip", label: "CLIP", type: "CLIP", source: ["checkpoint", 1] },
    { id: "vae", label: "VAE", type: "VAE", source: ["checkpoint", 2] }
  ]
});
```

### Step 2：提示词编码

```typescript
addStep(wf, {
  id: "encode-prompts",
  name: "提示词编码",
  description: "使用 CLIP 编码正反向提示词",
  nodes: [
    {
      id: "positive",
      type: "CLIPTextEncode",
      widgets: { text: "a beautiful landscape, high quality" },
      title: "正向提示词"
    },
    {
      id: "negative",
      type: "CLIPTextEncode",
      widgets: { text: "blur, low quality" },
      title: "反向提示词"
    }
  ],
  internalLinks: [
    { from: ["clip_source", 0], to: ["positive", "clip"] },
    { from: ["clip_source", 0], to: ["negative", "clip"] }
  ],
  inputs: [
    { id: "clip", label: "CLIP", type: "CLIP", target: ["clip_source", "clip"] }
  ],
  outputs: [
    { id: "positive_cond", label: "Positive", type: "CONDITIONING", source: ["positive", 0] },
    { id: "negative_cond", label: "Negative", type: "CONDITIONING", source: ["negative", 0] }
  ]
});
```

### Step 3：采样 + 解码 + 保存

```typescript
addStep(wf, {
  id: "sample-output",
  name: "采样与输出",
  description: "KSampler 采样 → VAE 解码 → 保存图像",
  nodes: [
    {
      id: "latent",
      type: "EmptyLatentImage",
      widgets: { width: 1024, height: 1024, batch_size: 1 }
    },
    {
      id: "sampler",
      type: "KSampler",
      widgets: { seed: 42, steps: 20, cfg: 7, sampler_name: "dpmpp_2m_sde", scheduler: "karras", denoise: 1 }
    },
    { id: "vae_decode", type: "VAEDecode", widgets: {} },
    { id: "save", type: "SaveImage", widgets: { filename_prefix: "ComfyUI" } }  // 输出节点，无 outputs
  ],
  internalLinks: [
    { from: ["latent", 0], to: ["sampler", "latent_image"] },
    { from: ["sampler", 0], to: ["vae_decode", "samples"] },
    { from: ["vae_decode", 0], to: ["save", "images"] }
  ],
  inputs: [
    { id: "model", label: "MODEL", type: "MODEL", target: ["sampler", "model"] },
    { id: "positive", label: "Positive", type: "CONDITIONING", target: ["sampler", "positive"] },
    { id: "negative", label: "Negative", type: "CONDITIONING", target: ["sampler", "negative"] },
    { id: "vae", label: "VAE", type: "VAE", target: ["vae_decode", "vae"] }
  ]
});
```

### 跨 Step 连接

```typescript
// 将 "加载模型" 的输出连接到 "采样与输出" 的输入
connectSteps(wf,
  { stepId: "load-models",  portId: "model" },
  { stepId: "sample-output", portId: "model" }
);
connectSteps(wf,
  { stepId: "load-models",  portId: "vae" },
  { stepId: "sample-output", portId: "vae" }
);
connectSteps(wf,
  { stepId: "load-models",  portId: "clip" },
  { stepId: "encode-prompts", portId: "clip" }
);
connectSteps(wf,
  { stepId: "encode-prompts", portId: "positive_cond" },
  { stepId: "sample-output",  portId: "positive" }
);
connectSteps(wf,
  { stepId: "encode-prompts", portId: "negative_cond" },
  { stepId: "sample-output",  portId: "negative" }
);
```

### 产出

```typescript
const result = compose(wf);
// result.apiFormat → { "1": {...}, "2": {...}, ... }  提交给 ComfyUI API
// result.uiFormat → { nodes: [...], links: [...], groups: [...] }  导入 ComfyUI 编辑器
```

---

## 八、npm 包信息

```json
{
  "name": "comfyui-agent-helper",
  "version": "0.1.0",
  "description": "面向 AI Agent 的 ComfyUI 工作流分步构建库，将工作流拆分为可独立设计的 Step 区块",
  "keywords": ["comfyui", "workflow", "ai-agent", "stable-diffusion", "node-graph"],
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "engines": { "node": ">=22" }
}
```

---

## 九、开发路线图

| 阶段 | 内容 | 产出 |
|------|------|------|
| **Phase 1** MVP | Workflow + Step 管理 + 组合引擎（API 格式） + ID 解析 | 可用的最小版本 |
| **Phase 2** UI 支持 | UI 格式输出 + 自动布局 + Groups 生成 | 可导入 ComfyUI 编辑器 |
| **Phase 3** 校验 | 完整性检查 + 连接校验 + 循环依赖检测 | 帮助 Agent 自检 |
| **Phase 4** 增强 | 从现有 JSON 导入 + 模板系统 + 节点类型知识库 | 降低 Agent 使用门槛 |

---

## 十、关键设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| API 风格 | 函数式（非 class 实例方法） | LLM 更易通过 function calling 调用独立函数 |
| Step 定义方式 | 声明式（一次定义全结构，非逐步 add） | 减少 Agent 调用次数，降低出错率 |
| ID 命名空间 | Step 内部自由命名，组合时自动加前缀 | Agent 只需保证 Step 内 ID 唯一 |
| 输出格式 | 同时产出 API 和 UI 两种 JSON | API 格式提交执行，UI 格式用于编辑器导入 |
| 无外部依赖 | 不引入 Zod/Yup 等验证库 | 最小化包体积，Agent 不需要运行时类型校验 |
