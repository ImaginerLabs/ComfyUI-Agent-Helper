/**
 * 节点级别校验器
 * 校验 StepNode 是否符合 NodePreset 的规格定义
 */

import type { ComfyDataType, StepNode } from '../types.js';
import type { ValidationMode, WidgetSpec, NodePreset } from '../presets/types.js';
import type { ValidationIssue, ValidationSeverity } from './types.js';

// ---------------------------------------------------------------------------
// 标准数据类型列表
// ---------------------------------------------------------------------------

/**
 * ComfyUI 标准数据类型
 * 不在这个列表中的类型被视为自定义/扩展类型
 */
const STANDARD_TYPES: Set<string> = new Set([
  'MODEL',
  'CLIP',
  'VAE',
  'LATENT',
  'CONDITIONING',
  'IMAGE',
  'MASK',
  'CONTROL_NET',
  'CLIP_VISION',
  'CLIP_VISION_OUTPUT',
  'STYLE_MODEL',
  'GLIGEN',
]);

// ---------------------------------------------------------------------------
// Widget 值校验
// ---------------------------------------------------------------------------

/**
 * 校验 Widget 值是否符合规格定义
 */
export function validateWidgetValue(
  key: string,
  value: unknown,
  spec: WidgetSpec
): { valid: boolean; message?: string } {
  switch (spec.type) {
    case 'INT': {
      if (typeof value !== 'number') {
        return { valid: false, message: `Widget "${key}" 期望 INT 类型，实际为 ${typeof value}` };
      }
      if (!Number.isInteger(value)) {
        return { valid: false, message: `Widget "${key}" 期望整数，实际为 ${value}` };
      }
      if (spec.min !== undefined && value < spec.min) {
        return { valid: false, message: `Widget "${key}" 值 ${value} 小于最小值 ${spec.min}` };
      }
      if (spec.max !== undefined && value > spec.max) {
        return { valid: false, message: `Widget "${key}" 值 ${value} 大于最大值 ${spec.max}` };
      }
      return { valid: true };
    }

    case 'FLOAT': {
      if (typeof value !== 'number') {
        return { valid: false, message: `Widget "${key}" 期望 FLOAT 类型，实际为 ${typeof value}` };
      }
      if (spec.min !== undefined && value < spec.min) {
        return { valid: false, message: `Widget "${key}" 值 ${value} 小于最小值 ${spec.min}` };
      }
      if (spec.max !== undefined && value > spec.max) {
        return { valid: false, message: `Widget "${key}" 值 ${value} 大于最大值 ${spec.max}` };
      }
      return { valid: true };
    }

    case 'STRING': {
      if (typeof value !== 'string') {
        return { valid: false, message: `Widget "${key}" 期望 STRING 类型，实际为 ${typeof value}` };
      }
      return { valid: true };
    }

    case 'BOOLEAN': {
      if (typeof value !== 'boolean') {
        return { valid: false, message: `Widget "${key}" 期望 BOOLEAN 类型，实际为 ${typeof value}` };
      }
      return { valid: true };
    }

    case 'COMBO': {
      if (typeof value !== 'string') {
        return { valid: false, message: `Widget "${key}" 期望 COMBO 类型（string），实际为 ${typeof value}` };
      }
      // 获取可选项列表
      const options = typeof spec.options === 'function' ? spec.options() : spec.options;
      if (options && !options.includes(value)) {
        return {
          valid: false,
          message: `Widget "${key}" 值 "${value}" 不在可选项列表中: [${options.join(', ')}]`,
        };
      }
      return { valid: true };
    }

    default: {
      // 未知类型，跳过校验
      return { valid: true };
    }
  }
}

// ---------------------------------------------------------------------------
// 输入类型校验
// ---------------------------------------------------------------------------

/**
 * 检查两个数据类型是否兼容
 */
export function isCompatibleType(from: ComfyDataType, to: ComfyDataType): boolean {
  // 完全匹配
  if (from === to) {
    return true;
  }

  // 如果目标类型不在标准类型列表中（自定义类型），允许匹配
  // 这允许自定义类型扩展标准类型系统
  if (!STANDARD_TYPES.has(to)) {
    return true;
  }

  // 如果源类型是自定义类型，也允许
  if (!STANDARD_TYPES.has(from)) {
    return true;
  }

  return false;
}

/**
 * 校验输入端口类型是否匹配
 */
export function validateInputType(
  portName: string,
  inputType: ComfyDataType,
  expectedType: ComfyDataType,
  mode: ValidationMode
): ValidationIssue | null {
  if (mode === 'none') {
    return null;
  }

  if (isCompatibleType(inputType, expectedType)) {
    return null;
  }

  const severity: ValidationSeverity = mode === 'strict' ? 'error' : 'warning';

  return {
    severity,
    message: `输入端口 "${portName}" 类型不匹配: 期望 ${expectedType}，实际为 ${inputType}`,
    suggestion: `检查连线是否连接到正确的输出端口`,
  };
}

// ---------------------------------------------------------------------------
// 节点校验
// ---------------------------------------------------------------------------

/**
 * 校验节点是否符合预设定义
 */
export function validateNode(
  node: StepNode,
  preset: NodePreset,
  mode: ValidationMode = 'warn'
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (mode === 'none') {
    return issues;
  }

  const severity: ValidationSeverity = mode === 'strict' ? 'error' : 'warning';

  // 构建 widget 名称映射
  const widgetSpecs = new Map<string, WidgetSpec>();
  for (const spec of preset.widgets) {
    widgetSpecs.set(spec.name, spec);
  }

  // 1. 检查未知 widget 参数
  if (node.widgets) {
    for (const key of Object.keys(node.widgets)) {
      if (!widgetSpecs.has(key)) {
        issues.push({
          severity,
          message: `未知 Widget 参数 "${key}"，节点类型 "${preset.type}" 中未定义此参数`,
          nodeId: node.id,
          suggestion: `检查参数名称是否正确，或更新预设定义`,
        });
      }
    }
  }

  // 2. 检查 widget 值类型和范围
  if (node.widgets) {
    for (const [key, value] of Object.entries(node.widgets)) {
      const spec = widgetSpecs.get(key);
      if (spec) {
        const result = validateWidgetValue(key, value, spec);
        if (!result.valid) {
          issues.push({
            severity,
            message: result.message!,
            nodeId: node.id,
            suggestion: `请使用符合规格的值`,
          });
        }
      }
    }
  }

  // 3. 检查必填参数
  const widgets = node.widgets as Record<string, unknown> | undefined;
  for (const spec of preset.widgets) {
    if (spec.required) {
      const value = widgets?.[spec.name];
      if (value === undefined || value === null) {
        issues.push({
          severity,
          message: `必填 Widget 参数 "${spec.name}" 未提供值`,
          nodeId: node.id,
          suggestion: `请为参数 "${spec.name}" 提供值`,
        });
      }
    }
  }

  return issues;
}