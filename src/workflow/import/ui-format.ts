import type { Workflow } from '../types.js';
import type {
  WorkflowHandle,
  StepDefinition,
  StepNode,
  InternalLink,
  StepInputPort,
  StepOutputPort,
  ImportResult,
  ImportOptions,
  UINode,
  ComfyDataType,
} from '../../types.js';
import { getPreset } from '../../presets/registry.js';

/**
 * UI 格式 JSON 结构
 */
interface UIFormatJSON {
  last_node_id: number;
  last_link_id: number;
  nodes: UINode[];
  links: (number | string)[];
  groups: unknown[];
  config: Record<string, unknown>;
  extra: Record<string, unknown>;
  version: number;
}

/**
 * 解析后的连线结构
 */
interface ParsedLink {
  id: number;
  origin_id: number;
  origin_slot: number;
  target_id: number;
  target_slot: number;
  type: string;
}

/**
 * 从 UI 格式导入工作流
 */
export function importFromUIFormat(
  handle: WorkflowHandle,
  wf: Workflow,
  json: unknown,
  options?: ImportOptions
): ImportResult {
  const data = json as UIFormatJSON;
  const warnings: string[] = [];

  // 默认导入为单个 Step
  const asSingleStep = options?.asSingleStep ?? true;

  if (asSingleStep) {
    const stepId = options?.stepId ?? 'imported_workflow';
    const stepName = options?.stepName ?? 'Imported Workflow';

    const stepDef = convertUIToStep(data, stepId, stepName, warnings);
    wf.steps.set(stepId, stepDef);

    return {
      importedStepIds: [stepId],
      detectedFormat: 'ui',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } else {
    // 多 Step 模式：尝试根据 groups 分组
    const steps = convertUIToMultipleSteps(data, warnings);
    for (const step of steps) {
      wf.steps.set(step.id, step);
    }

    return {
      importedStepIds: steps.map((s) => s.id),
      detectedFormat: 'ui',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

/**
 * 将 UI 格式转换为单个 StepDefinition
 */
function convertUIToStep(
  data: UIFormatJSON,
  stepId: string,
  stepName: string,
  warnings: string[]
): StepDefinition {
  const nodeMap = new Map<number, StepNode>();

  // 1. 转换节点
  for (const uiNode of data.nodes) {
    const { widgets, widgets_values } = extractWidgetsFromUINode(uiNode, warnings);

    nodeMap.set(uiNode.id, {
      id: String(uiNode.id),
      type: uiNode.type,
      ...(Object.keys(widgets).length > 0 ? { widgets } : {}),
      ...(widgets_values ? { widgets_values } : {}),
      ...(uiNode.pos ? { position: { x: uiNode.pos[0], y: uiNode.pos[1] } } : {}),
      ...(uiNode.title ? { title: uiNode.title } : {}),
    });
  }

  // 2. 转换连线
  const internalLinks: InternalLink[] = [];
  const inputPorts: StepInputPort[] = [];
  const outputPorts: StepOutputPort[] = [];

  // 用于追踪外部连接
  const externalInputs = new Map<string, { inputName: string; type: string; slot: number }>();
  const externalOutputs = new Map<number, { slot: number; type: string; name: string }>();

  for (const linkData of data.links) {
    const link = parseLink(linkData);
    if (!link) continue;

    const { origin_id, origin_slot, target_id, target_slot, type } = link;

    // 内部连接：两端节点都存在
    if (nodeMap.has(origin_id) && nodeMap.has(target_id)) {
      const targetNode = data.nodes.find((n) => n.id === target_id);
      const targetInput = targetNode?.inputs?.[target_slot];

      if (targetInput) {
        internalLinks.push({
          from: [String(origin_id), origin_slot],
          to: [String(target_id), targetInput.name],
        });
      }
    }
    // 外部输入：源节点不存在
    else if (!nodeMap.has(origin_id) && nodeMap.has(target_id)) {
      const targetNode = data.nodes.find((n) => n.id === target_id);
      const targetInput = targetNode?.inputs?.[target_slot];

      if (targetInput) {
        externalInputs.set(`${target_id}:${target_slot}`, {
          inputName: targetInput.name,
          type: type,
          slot: target_slot,
        });
      }
    }
    // 外部输出：目标节点不存在
    else if (nodeMap.has(origin_id) && !nodeMap.has(target_id)) {
      const sourceNode = data.nodes.find((n) => n.id === origin_id);
      const outputInfo = sourceNode?.outputs?.[origin_slot];

      if (outputInfo) {
        externalOutputs.set(origin_id, {
          slot: origin_slot,
          type: type,
          name: outputInfo.name,
        });
      }
    }
  }

  // 3. 创建输入端口
  let inputIndex = 0;
  for (const [key, info] of externalInputs) {
    const [nodeIdStr] = key.split(':');
    const nodeId = parseInt(nodeIdStr, 10);

    inputPorts.push({
      id: `input_${inputIndex}`,
      label: info.inputName,
      type: info.type as ComfyDataType,
      target: [String(nodeId), info.inputName],
    });
    inputIndex++;
  }

  // 4. 创建输出端口
  let outputIndex = 0;
  for (const [nodeId, info] of externalOutputs) {
    outputPorts.push({
      id: `output_${outputIndex}`,
      label: info.name,
      type: info.type as ComfyDataType,
      source: [String(nodeId), info.slot],
    });
    outputIndex++;
  }

  return {
    id: stepId,
    name: stepName,
    nodes: Array.from(nodeMap.values()),
    internalLinks,
    ...(inputPorts.length > 0 ? { inputs: inputPorts } : {}),
    ...(outputPorts.length > 0 ? { outputs: outputPorts } : {}),
  };
}

/**
 * 将 UI 格式转换为多个 StepDefinition（根据 groups 分组）
 */
function convertUIToMultipleSteps(
  data: UIFormatJSON,
  warnings: string[]
): StepDefinition[] {
  // 如果没有 groups，则作为单个 Step
  if (!data.groups || data.groups.length === 0) {
    return [convertUIToStep(data, 'main', 'Main Workflow', warnings)];
  }

  const steps: StepDefinition[] = [];
  const groupNodes = new Map<number, number[]>(); // groupId -> nodeIds

  // 解析 groups
  for (const group of data.groups as Array<{ id: number; title: string; nodes?: number[] }>) {
    if (group.nodes) {
      groupNodes.set(group.id, group.nodes);
    }
  }

  // 为每个 group 创建 Step
  for (const group of data.groups as Array<{ id: number; title: string; nodes?: number[] }>) {
    const nodeIds = group.nodes || [];
    const groupNodeSet = new Set(nodeIds);

    const stepNodes: StepNode[] = [];
    const internalLinks: InternalLink[] = [];

    for (const nodeId of nodeIds) {
      const uiNode = data.nodes.find((n) => n.id === nodeId);
      if (!uiNode) continue;

      const { widgets, widgets_values } = extractWidgetsFromUINode(uiNode, warnings);
      stepNodes.push({
        id: String(uiNode.id),
        type: uiNode.type,
        ...(Object.keys(widgets).length > 0 ? { widgets } : {}),
        ...(widgets_values ? { widgets_values } : {}),
        ...(uiNode.pos ? { position: { x: uiNode.pos[0], y: uiNode.pos[1] } } : {}),
        ...(uiNode.title ? { title: uiNode.title } : {}),
      });
    }

    // 处理内部连线
    for (const linkData of data.links) {
      const link = parseLink(linkData);
      if (!link) continue;

      const { origin_id, origin_slot, target_id, target_slot } = link;

      if (groupNodeSet.has(origin_id) && groupNodeSet.has(target_id)) {
        const targetNode = data.nodes.find((n) => n.id === target_id);
        const targetInput = targetNode?.inputs?.[target_slot];

        if (targetInput) {
          internalLinks.push({
            from: [String(origin_id), origin_slot],
            to: [String(target_id), targetInput.name],
          });
        }
      }
    }

    const stepId = sanitizeStepId(group.title) || `group_${group.id}`;

    steps.push({
      id: stepId,
      name: group.title,
      nodes: stepNodes,
      internalLinks,
    });
  }

  return steps;
}

/**
 * 从 UI 节点提取 widgets 值
 */
function extractWidgetsFromUINode(
  node: UINode,
  warnings: string[]
): { widgets: Record<string, unknown>; widgets_values?: unknown[] } {
  const result: { widgets: Record<string, unknown>; widgets_values?: unknown[] } = {
    widgets: {},
  };

  if (!node.widgets_values || node.widgets_values.length === 0) {
    return result;
  }

  // 保留原始 widgets_values 数组（用于往返转换）
  result.widgets_values = [...node.widgets_values];

  // 尝试从 preset 获取 widget 名称映射
  const preset = getPreset(node.type);

  if (preset) {
    // 收集所有 widget 参数名（包括 inputs 中 isWidget=true 的和 widgets 数组中的）
    const widgetNames: string[] = [];

    // 从 inputs 中收集带 isWidget 的参数
    for (const inp of preset.inputs) {
      if (inp.isWidget) {
        widgetNames.push(inp.name);
      }
    }

    // 从 widgets 数组中收集
    for (const w of preset.widgets) {
      widgetNames.push(w.name);
    }

    // 按 widget 顺序提取值（尽可能映射到具名参数）
    for (let i = 0; i < Math.min(node.widgets_values.length, widgetNames.length); i++) {
      const widgetName = widgetNames[i];
      const value = node.widgets_values[i];
      if (value !== undefined && value !== null) {
        result.widgets[widgetName] = value;
      }
    }

    // 处理额外的 widgets_values（如 control_after_generate）
    // 这些值保留在 widgets_values 数组中，但不映射到 widgets 对象
  } else {
    // 无 preset 时使用索引名
    node.widgets_values.forEach((val, i) => {
      if (val !== undefined && val !== null) {
        result.widgets[`widget_${i}`] = val;
      }
    });
    warnings.push(`Node type "${node.type}" has no preset, using indexed widget names`);
  }

  return result;
}

/**
 * 解析连线数据
 */
function parseLink(linkData: number | string): ParsedLink | null {
  if (typeof linkData === 'string') {
    // 某些格式可能使用字符串 ID
    return null;
  }

  // links 数组格式: [linkId, originId, originSlot, targetId, targetSlot, type]
  if (Array.isArray(linkData) && linkData.length >= 6) {
    return {
      id: linkData[0],
      origin_id: linkData[1],
      origin_slot: linkData[2],
      target_id: linkData[3],
      target_slot: linkData[4],
      type: String(linkData[5]),
    };
  }

  return null;
}

function sanitizeStepId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_:-]/g, '_');
}