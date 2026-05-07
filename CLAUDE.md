# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

`comfyui-agent-helper` 是一个面向 AI Agent（LLM）的 ComfyUI 工作流分步构建库。它让 Agent 将复杂工作流拆分为多个独立 Step（功能区块），最后通过组合引擎自动合并为完整的 ComfyUI JSON。

**核心价值**：避免 Agent 一次性生成 50+ 节点的完整 JSON 导致高频出错。

## 常用命令

```bash
pnpm build          # tsup 构建，输出 ESM + CJS + .d.ts 到 dist/
pnpm dev            # tsup 监听模式
pnpm test           # vitest run（单次运行）
pnpm test:watch     # vitest 交互式监听
pnpm lint           # ESLint 检查 src/
pnpm format         # Prettier 格式化 src/
```

运行单个测试文件：
```bash
pnpm vitest run src/__tests__/composer.test.ts
```

## 发布流程

发布由 GitHub Actions 自动执行，推送 tag 时触发。

```bash
# 1. 本地运行版本命令（自动修改 package.json + 创建 commit + tag）
npm version patch   # 0.1.0 → 0.1.1（Bug 修复）
npm version minor   # 0.1.0 → 0.2.0（新功能，向后兼容）
npm version major   # 0.1.0 → 1.0.0（破坏性变更）

# 2. 推送 commit 和 tag 到 GitHub
git push --follow-tags

# 3. CI 自动执行：测试 → 构建 → 发布 npm
```

**前提条件**：需要在 GitHub 仓库配置 `NPM_TOKEN` secret（npm automation token）。

## 技术栈

- **TypeScript 6.0** + **Node >=22**（ESM 模块，`"type": "module"`）
- **tsup 8.5** 构建（esbuild 底层），**Vitest 4** 测试
- **零运行时依赖** — 纯 Node.js 库，不需要 Zod/Yup 等校验库

## 架构

### 核心概念

```
Workflow
├── Step A (内部: nodes + internalLinks + 外部 ports)
├── Step B
├── Step C
└── crossLinks: Step A 的输出端口 → Step B 的输入端口
```

- **Workflow**：顶层容器，持有所有 Step 和跨 Step 连接
- **Step**：功能区块，包含 Node[]、InternalLink[]、InputPort[]、OutputPort[]
- **Step Port**：对外暴露的 I/O 端口，映射到内部节点的具体输入/输出
- **InternalLink**：Step 内部连线，格式 `{ from: [nodeId, slotIndex], to: [nodeId, inputName] }`
- **CrossStepLink**：Step 间连线，从输出端口 → 输入端口

### 模块结构

```
src/
├── index.ts              # 公共 API 导出（类型 + 函数）
├── types.ts              # 所有公共类型（StepDefinition, ComfyUIWorkflow 等）
├── workflow/
│   ├── workflow.ts       # create/get/reset/importFromJSON, 内存存储 Map
│   ├── connections.ts    # connectSteps / disconnectSteps（幂等）
│   └── types.ts          # Workflow 内部结构 + WorkflowSummary
├── step/
│   ├── step-manager.ts   # addStep / updateStep / removeStep / getStep
│   └── types.ts
├── compose/
│   ├── composer.ts       # compose(): 核心组合引擎，生成 API 格式 JSON
│   ├── id-resolver.ts    # Step 内 nodeId → 全局唯一 ID（格式: stepId:nodeId）
│   ├── layout.ts         # 自动布局（简单水平网格排列）
│   └── types.ts          # IDMapping, ComposeContext
├── validate/
│   ├── validator.ts      # 完整性/孤立节点/循环依赖检测
│   └── types.ts          # ValidationResult
├── codegen/
│   └── codegen.ts        # workflowToCode(): 将 Workflow 反生成 TypeScript 代码
└── utils/
    ├── id-generator.ts   # 全局 ID 生成（sanitize + counter）
    └── deep-clone.ts     # JSON.parse(JSON.stringify())
```

### 数据流

```
Agent 调用 addStep()    →  存储在 Workflow.steps Map 中
Agent 调用 connectSteps() → 存储在 Workflow.crossLinks 数组中
Agent 调用 compose()     →  组合引擎处理:
  1. ID Resolver 为所有节点分配全局唯一 ID
  2. 收集所有节点 widgets → inputs 静态参数
  3. 处理 internalLinks + crossLinks → 连线引用 [globalId, slotIndex]
  4. 产出 apiFormat: Record<string, ComfyAPINode>
```

### 关键设计决策

- **API 是纯函数**，不是 class 实例方法 — LLM 通过 function calling 更容易调用独立函数
- **Step 是声明式一次定义**，不逐步 add — 减少 Agent 调用次数
- **内存存储**（Map），不持久化 — 工作流在单次会话中构建
- **ID 命名空间隔离**：Step 内部 ID 自由命名，组合时自动加 `stepId:` 前缀
- **连线覆盖 Widget**：同一 inputName 同时有 widget 值和连线时，连线优先

### compose() 签名注意事项

`compose()` 接受 `workflowId: string`，不是 `WorkflowHandle` 对象。调用时传 `compose(wf.id)`。
