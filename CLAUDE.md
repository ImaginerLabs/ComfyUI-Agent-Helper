# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

`comfyui-agent-helper` 是一个面向 AI Agent 的 ComfyUI 工作流统一编解码库。它将 API、UI、Blueprint 等多种 ComfyUI 格式统一为内部表示，支持完整的往返转换。

**核心价值**：格式无关的工作流处理，信息零丢失。

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
├── validate/             # 校验模块
├── presets/              # 节点预设
└── utils/                # 工具函数
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

```typescript
import {
  importWorkflow,
  exportWorkflow,
  detectFormat,
  createUnifiedWorkflow,
  validateWorkflow,
} from '@imaginerlabs/comfyui-agent-helper';

// 导入工作流（自动检测格式）
const result = importWorkflow(json);
const workflow = result.workflow;

// 导出为目标格式
const exported = exportWorkflow(workflow, { format: 'ui-v1.0' });

// 校验工作流
const validation = validateWorkflow(workflow);

// 创建新工作流
const newWorkflow = createUnifiedWorkflow();
```
