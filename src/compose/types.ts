import type { Workflow } from '../workflow/types.js';
import type { ComfyAPINode, ComfyUIWorkflow, ComposeOptions } from '../types.js';

/**
 * ID 映射上下文
 * stepId → (internalNodeId → globalNodeId)
 */
export type IDMapping = Map<string, Map<string, string>>;

/**
 * 组合引擎的上下文
 */
export interface ComposeContext {
  workflow: Workflow;
  idMapping: IDMapping;
  /** 全局节点 ID → API 节点 */
  globalNodes: Map<string, ComfyAPINode>;
  /** 收集到的所有连线（已解析为全局 ID） */
  globalLinks: Array<{
    from: [string, number];
    to: [string, string];
  }>;
  /** 下一个可用的 UI 节点 ID */
  nextNodeId: number;
  /** 下一个可用的 UI 连线 ID */
  nextLinkId: number;
}

export type { ComfyUIWorkflow, ComposeOptions };
