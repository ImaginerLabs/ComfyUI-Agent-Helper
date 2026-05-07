/**
 * 基于预设创建节点实例
 */

import type { StepNode } from '../types.js';
import type { NodePreset, WidgetSpec, InputPortSpec, UIMetadata } from './types.js';
import { getPreset } from './registry.js';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/**
 * Widget 参数值（用户传入）
 * 支持预设定义的字段和自定义字段
 */
export type WidgetValues = Record<string, unknown>;

/**
 * 创建节点选项
 */
export interface CreateNodeOptions {
  /** 节点 ID（可选，默认自动生成） */
  id?: string;
  /** 节点位置 */
  pos?: [number, number];
  /** 节点标题 */
  title?: string;
  /** 是否校验参数（默认 true） */
  validate?: boolean;
  /** 额外的节点属性（包括 UI 层数据如 size, properties 等） */
  extra?: Record<string, unknown>;
}

/**
 * 创建节点结果
 */
export interface CreateNodeResult {
  /** 创建的节点 */
  node: StepNode;
  /** 校验警告（仅当 validate=true 时） */
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// 主函数
// ---------------------------------------------------------------------------

/**
 * 基于预设创建节点实例
 *
 * @param nodeType - 节点类型（如 'KSampler'）
 * @param widgets - Widget 参数值
 * @param options - 可选配置
 * @returns 创建的节点和警告信息
 *
 * @example
 * ```typescript
 * const { node } = createNodeFromPreset('KSampler', {
 *   seed: 12345,
 *   steps: 30,
 *   cfg: 8.5,
 * });
 * ```
 */
export function createNodeFromPreset(
  nodeType: string,
  widgets?: WidgetValues,
  options?: CreateNodeOptions
): CreateNodeResult {
  const preset = getPreset(nodeType);

  if (!preset) {
    throw new Error(`Unknown node type: "${nodeType}". No preset found.`);
  }

  const warnings: string[] = [];
  const widgetValues = widgets ?? {};

  // 1. 构建 widgets_values 数组（按预设定义的顺序）
  const widgetsValuesArray = buildWidgetsValues(preset, widgetValues, warnings);

  // 2. 构建 widgets 对象（用于内部表示）
  const widgetsObject = buildWidgetsObject(preset, widgetValues);

  // 3. 校验参数
  if (options?.validate !== false) {
    validateWidgets(preset, widgetValues, warnings);
  }

  // 4. 创建节点
  const node: StepNode = {
    id: options?.id ?? generateNodeId(preset),
    type: preset.type,
    widgets: widgetsObject,
    widgets_values: widgetsValuesArray,
  };

  if (options?.pos) {
    node.pos = options.pos;
  }
  if (options?.title) {
    node.title = options.title;
  }

  // 5. 注入 UI 层数据
  const uiData = getUIData(preset);
  if (uiData) {
    if (uiData.size) {
      node.size = uiData.size;
    }
    if (uiData.properties) {
      node.properties = { ...uiData.properties };
    }
    // 其他未知 UI 字段通过 StepNode 的索引签名传递
    for (const [key, value] of Object.entries(uiData)) {
      if (key !== 'size' && key !== 'properties' && key !== 'controlWidgets') {
        (node as Record<string, unknown>)[key] = value;
      }
    }
  }

  // 6. 添加额外属性
  if (options?.extra) {
    Object.assign(node, options.extra);
  }

  return {
    node,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

/**
 * 获取预设的 UI 层数据（支持向后兼容）
 */
function getUIData(preset: NodePreset): UIMetadata | undefined {
  return preset.ui ?? preset.uiMetadata;
}

/**
 * 生成节点 ID
 */
function generateNodeId(preset: NodePreset): string {
  // 使用小写的类型名作为基础 ID
  return preset.type.charAt(0).toLowerCase() + preset.type.slice(1);
}

/**
 * 构建 widgets_values 数组
 * 顺序：先处理 isWidget 的 inputs（在对应位置插入 controlWidgets），再处理 widgets
 */
function buildWidgetsValues(
  preset: NodePreset,
  values: WidgetValues,
  warnings: string[]
): unknown[] {
  const result: unknown[] = [];
  const uiData = getUIData(preset);
  const controlWidgets = uiData?.controlWidgets ?? [];

  // 1. 处理 isWidget 的输入端口
  const widgetInputs = preset.inputs.filter((input) => input.isWidget);
  for (const input of widgetInputs) {
    const value = values[input.name];
    if (value !== undefined) {
      result.push(value);
    } else {
      // 使用默认值
      const defaultValue = getDefaultValueForInput(input);
      result.push(defaultValue);
      warnings.push(`Widget "${input.name}" not specified, using default: ${defaultValue}`);
    }

    // 在当前 widget 之后插入关联的 controlWidgets
    const associatedControls = controlWidgets.filter((cw) => cw.name.startsWith(input.name));
    for (const control of associatedControls) {
      const controlValue = values[control.name];
      if (controlValue !== undefined) {
        result.push(controlValue);
      } else if (control.default !== undefined) {
        result.push(control.default);
      }
    }
  }

  // 2. 处理纯 widget 参数
  for (const widget of preset.widgets) {
    const value = values[widget.name];
    if (value !== undefined) {
      result.push(value);
    } else if (widget.default !== undefined) {
      result.push(widget.default);
    } else {
      // 没有默认值，使用类型默认值
      const defaultValue = getDefaultValueForWidget(widget);
      result.push(defaultValue);
      warnings.push(`Widget "${widget.name}" not specified, using type default: ${defaultValue}`);
    }
  }

  return result;
}

/**
 * 构建 widgets 对象
 */
function buildWidgetsObject(preset: NodePreset, values: WidgetValues): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // 处理 isWidget 的输入端口
  const widgetInputs = preset.inputs.filter((input) => input.isWidget);
  for (const input of widgetInputs) {
    const value = values[input.name];
    if (value !== undefined) {
      result[input.name] = value;
    } else {
      result[input.name] = getDefaultValueForInput(input);
    }
  }

  // 处理纯 widget 参数
  for (const widget of preset.widgets) {
    const value = values[widget.name];
    if (value !== undefined) {
      result[widget.name] = value;
    } else if (widget.default !== undefined) {
      result[widget.name] = widget.default;
    } else {
      result[widget.name] = getDefaultValueForWidget(widget);
    }
  }

  return result;
}

/**
 * 获取输入端口的默认值
 */
function getDefaultValueForInput(input: InputPortSpec): unknown {
  // 根据类型返回默认值
  switch (input.type) {
    case 'INT':
      return 0;
    case 'FLOAT':
      return 0.0;
    case 'STRING':
      return '';
    case 'BOOLEAN':
      return false;
    default:
      return null;
  }
}

/**
 * 获取 Widget 的类型默认值
 */
function getDefaultValueForWidget(widget: WidgetSpec): unknown {
  switch (widget.type) {
    case 'INT':
      return widget.min ?? 0;
    case 'FLOAT':
      return widget.min ?? 0.0;
    case 'STRING':
      return '';
    case 'BOOLEAN':
      return false;
    case 'COMBO':
      // 返回第一个选项
      if (widget.options) {
        const options = typeof widget.options === 'function' ? widget.options() : widget.options;
        return options[0] ?? '';
      }
      return '';
    default:
      return null;
  }
}

/**
 * 校验 Widget 参数
 */
function validateWidgets(
  preset: NodePreset,
  values: WidgetValues,
  warnings: string[]
): void {
  // 校验 isWidget 的输入端口
  const widgetInputs = preset.inputs.filter((input) => input.isWidget);
  for (const input of widgetInputs) {
    const value = values[input.name];
    if (value !== undefined) {
      validateInputValue(input, value, warnings);
    }
  }

  // 校验纯 widget 参数
  for (const widget of preset.widgets) {
    const value = values[widget.name];
    if (value !== undefined) {
      validateWidgetValue(widget, value, warnings);
    }
  }
}

/**
 * 校验输入端口值
 */
function validateInputValue(input: InputPortSpec, value: unknown, warnings: string[]): void {
  // 类型检查
  switch (input.type) {
    case 'INT':
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        warnings.push(`Input "${input.name}" should be integer, got: ${value}`);
      }
      break;
    case 'FLOAT':
      if (typeof value !== 'number') {
        warnings.push(`Input "${input.name}" should be number, got: ${value}`);
      }
      break;
    case 'STRING':
      if (typeof value !== 'string') {
        warnings.push(`Input "${input.name}" should be string, got: ${value}`);
      }
      break;
    case 'BOOLEAN':
      if (typeof value !== 'boolean') {
        warnings.push(`Input "${input.name}" should be boolean, got: ${value}`);
      }
      break;
  }
}

/**
 * 校验 Widget 值
 */
function validateWidgetValue(widget: WidgetSpec, value: unknown, warnings: string[]): void {
  // 类型检查
  switch (widget.type) {
    case 'INT':
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        warnings.push(`Widget "${widget.name}" should be integer, got: ${value}`);
      }
      // 范围检查
      if (widget.min !== undefined && (value as number) < widget.min) {
        warnings.push(`Widget "${widget.name}" value ${value} is below min ${widget.min}`);
      }
      if (widget.max !== undefined && (value as number) > widget.max) {
        warnings.push(`Widget "${widget.name}" value ${value} is above max ${widget.max}`);
      }
      break;

    case 'FLOAT':
      if (typeof value !== 'number') {
        warnings.push(`Widget "${widget.name}" should be number, got: ${value}`);
      }
      // 范围检查
      if (widget.min !== undefined && (value as number) < widget.min) {
        warnings.push(`Widget "${widget.name}" value ${value} is below min ${widget.min}`);
      }
      if (widget.max !== undefined && (value as number) > widget.max) {
        warnings.push(`Widget "${widget.name}" value ${value} is above max ${widget.max}`);
      }
      break;

    case 'STRING':
      if (typeof value !== 'string') {
        warnings.push(`Widget "${widget.name}" should be string, got: ${value}`);
      }
      break;

    case 'BOOLEAN':
      if (typeof value !== 'boolean') {
        warnings.push(`Widget "${widget.name}" should be boolean, got: ${value}`);
      }
      break;

    case 'COMBO':
      if (widget.options) {
        const options = typeof widget.options === 'function' ? widget.options() : widget.options;
        if (!options.includes(value as string)) {
          warnings.push(
            `Widget "${widget.name}" value "${value}" not in options: [${options.join(', ')}]`
          );
        }
      }
      break;
  }
}

// ---------------------------------------------------------------------------
// 便捷函数
// ---------------------------------------------------------------------------

/**
 * 创建节点（简化版，只返回节点）
 */
export function createNode(
  nodeType: string,
  widgets?: WidgetValues,
  options?: CreateNodeOptions
): StepNode {
  return createNodeFromPreset(nodeType, widgets, options).node;
}
