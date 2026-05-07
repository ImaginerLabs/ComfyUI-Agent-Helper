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
pnpm vitest run src/__tests__/format-import.test.ts
```

## 发布流程

发布由 GitHub Actions 自动执行，推送 tag 时触发。

```bash
# 1. 本地运行版本命令
npm version patch   # Bug 修复
npm version minor   # 新功能，向后兼容
npm version major   # 破坏性变更

# 2. 推送 commit 和 tag 到 GitHub
git push --follow-tags
```

## 技术栈

- **TypeScript 6.0** + **Node >=22**（ESM 模块）
- **tsup 8.5** 构建，**Vitest 4** 测试
- **零运行时依赖**

## 架构

### 核心概念：编解码器模式

所有 ComfyUI 格式统一为"工作流"概念，格式只是 IO 层的"编解码器"：

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

### 模块结构

```
src/
├── index.ts              # 公共 API 导出
├── types.ts              # 核心类型定义
│
├── codecs/               # 编解码器模块
│   ├── index.ts          # 统一导入/导出入口
│   ├── types.ts          # 编解码器类型定义
│   ├── registry.ts       # 编解码器注册表
│   │
│   ├── ui/               # UI 格式编解码器
│   │   ├── index.ts
│   │   ├── types.ts      # v1.0/v0.4 差异处理
│   │   └── decoder.ts    # 解码器和编码器
│   │
│   ├── api/              # API 格式编解码器
│   │   └── decoder.ts
│   │
│   └── blueprint/        # Blueprint 格式编解码器
│       └── decoder.ts
│
├── workflow/             # 工作流管理（分步构建 API）
├── step/                 # Step 管理
├── compose/              # 组合引擎
├── validate/             # 校验模块
├── presets/              # 节点预设
└── codegen/              # 代码生成
```

### 支持的格式

| 格式 ID | 格式族 | 版本 | 连线格式 | 往返支持 |
|---------|--------|------|---------|---------|
| `api-v1` | api | 1 | 隐式（inputs 中） | 否（丢失位置信息） |
| `ui-v0.4` | ui | 0.4 | 数组 `[[id, from, slot, to, slot, type]]` | 是 |
| `ui-v1.0` | ui | 1.0 | 对象 `[{id, origin_id, ...}]` | 是 |
| `blueprint-v1` | blueprint | 1 | 对象数组 | 是 |

### 数据流

```
导入流程：
  JSON → detectFormat() → 确定格式的 Codec → decode() → UnifiedWorkflow

导出流程：
  UnifiedWorkflow → exportWorkflow({ format }) → Codec.encode() → JSON
```

### 关键设计决策

1. **编解码器模式**：格式只是 IO 层的"编解码器"，内部表示统一
2. **信息保留**：导入时保留所有信息，导出时按需丢弃
3. **版本感知**：UI 格式区分 v0.4 和 v1.0
4. **往返转换**：`widgets_values` 和元数据完整保留

## API 使用

### 统一编解码器 API（推荐）

```typescript
import {
  importWorkflow,
  exportWorkflow,
  detectFormat,
  createUnifiedWorkflow,
} from '@imaginerlabs/comfyui-agent-helper';

// 导入
const result = importWorkflow(json);
const workflow = result.workflow;

// 导出
const exported = exportWorkflow(workflow, { format: 'ui-v0.4' });
```

### 分步构建 API

```typescript
import { createWorkflow, addStep, connectSteps, compose } from '@imaginerlabs/comfyui-agent-helper';

const wf = createWorkflow();
addStep(wf.id, { id: 'step1', name: 'Step 1', nodes: [...], internalLinks: [] });
const result = compose(wf.id);
```
