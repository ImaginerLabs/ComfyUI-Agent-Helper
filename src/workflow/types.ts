import type { StepDefinition, CrossStepLink, ComfyUIFormat } from '../types.js';

/**
 * Workflow 内部存储结构
 */
export interface Workflow {
  id: string;
  name?: string;
  /** Step ID → StepDefinition */
  steps: Map<string, StepDefinition>;
  /** 跨 Step 连接列表 */
  crossLinks: CrossStepLink[];
  /** 原始工作流元数据（用于往返转换） */
  _meta?: {
    id?: string;
    revision?: number;
    last_node_id: number;
    last_link_id: number;
    groups: unknown[];
    config: Record<string, unknown>;
    extra: Record<string, unknown>;
    version: number;
    /** 其他未知字段 */
    [key: string]: unknown;
  };
}

export interface WorkflowSummary {
  id: string;
  name?: string;
  steps: Array<{
    id: string;
    name: string;
    nodeCount: number;
    inputPorts: number;
    outputPorts: number;
  }>;
  crossLinkCount: number;
}
