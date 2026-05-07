// === 统一编解码器 API ===
export {
  importWorkflow,
  exportWorkflow,
  detectFormat,
  getSupportedFormats,
  createUnifiedWorkflow,
} from './codecs/index.js';

export type {
  UnifiedWorkflow,
  FormatId,
  FormatInfo,
  DecodeOptions,
  EncodeOptions,
  DecodeResult,
  EncodeResult,
  WorkflowCodec,
} from './codecs/types.js';

// === 公共类型 ===
export type {
  ComfyDataType,
  StepDefinition,
  StepNode,
  InternalLink,
  StepInputPort,
  StepOutputPort,
  CrossStepLink,
  ComfyAPINode,
  ComfyUIFormat,
  UINode,
  UIInput,
  UIOutput,
  UILink,
  UIGroup,
  ComfyUIWorkflow,
} from './types.js';

// === 校验 API ===
export { validateWorkflow } from './validate/validator.js';
export type { ValidateWorkflowOptions } from './validate/validator.js';
export {
  validateNode,
  validateWidgetValue,
  validateInputType,
  isCompatibleType,
} from './validate/node-validator.js';
export type { ValidationResult, ValidationIssue } from './validate/types.js';

// === 预设 API ===
export { registerPreset, getPreset, hasPreset, getRegistry, createRegistry } from './presets/registry.js';
export type { NodePreset, ValidationMode } from './presets/types.js';

// === 节点创建 API ===
export { createNodeFromPreset, createNode } from './presets/createNode.js';
export type { WidgetValues, CreateNodeOptions, CreateNodeResult } from './presets/createNode.js';

// === 原生预设定义（供自定义节点参考或直接使用）===
export { nativePresets } from './presets/native/index.js';
export { KSampler, KSamplerAdvanced } from './presets/native/sampling.js';
