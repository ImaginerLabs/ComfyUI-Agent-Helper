export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  stepId?: string;
  nodeId?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * 校验模式
 */
export type ValidationMode = 'none' | 'warn' | 'strict';

/**
 * Widget 规格（用于校验）
 */
export interface WidgetSpec {
  name: string;
  type: 'INT' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'COMBO';
  min?: number;
  max?: number;
  default?: unknown;
  required?: boolean;
  options?: string[] | (() => string[]);
}

/**
 * 节点预设定义（用于校验）
 */
export interface NodePreset {
  type: string;
  category: string;
  display_name?: string;
  description?: string;
  inputs: Array<{
    name: string;
    type: string;
    isWidget?: boolean;
    required?: boolean;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    slotIndex: number;
  }>;
  widgets: WidgetSpec[];
}
