import type { StepDefinition, CrossStepLink } from '../types.js';

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
