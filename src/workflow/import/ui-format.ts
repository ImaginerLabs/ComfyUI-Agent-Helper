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

/**
 * UI 格式 JSON 结构
 */
interface UIFormatJSON {
  id?: string;
  revision?: number;
  last_node_id: number;
  last_link_id: number;
  nodes: UINode[];
  links: (number | string)[][];
  groups: unknown[];
  config: Record<string, unknown>;
  extra: Record<string, unknown>;
  version: number;
  [key: string]: unknown;
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

  // 保存工作流级别的元数据
  wf._meta = {
    id: data.id,
    revision: data.revision,
    last_node_id: data.last_node_id,
    last_link_id: data.last_link_id,
    groups: data.groups,
    config: data.config,
    extra: data.extra,
    version: data.version,
  };

  // 默认导入为单个 Step
  const asSingleStep = options?.asSingleStep ?? true;

  if (asSingleStep) {
    const stepId = options?.stepId ?? 'imported_workflow';
    const stepName = options?.stepName ?? 'Imported Workflow';

    const stepDef = convertUIToStep(data, stepId, stepName);
    wf.steps.set(stepId, stepDef);

    return {
      importedStepIds: [stepId],
      detectedFormat: 'ui',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } else {
    // 多 Step 模式：尝试根据 groups 分组
    const steps = convertUIToMultipleSteps(data);
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
  stepName: string
): StepDefinition {
  const nodeMap = new Map<number, StepNode>();

  // 1. 转换节点 - 直接保存原始节点数据
  for (const uiNode of data.nodes) {
    const stepNode: StepNode = {
      ...uiNode, // 直接复制所有原始字段
      id: String(uiNode.id),
      type: uiNode.type,
      _originalId: uiNode.id, // 保存原始数字 ID
    };
    nodeMap.set(uiNode.id, stepNode);
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
  data: UIFormatJSON
): StepDefinition[] {
  // 如果没有 groups，则作为单个 Step
  if (!data.groups || data.groups.length === 0) {
    return [convertUIToStep(data, 'main', 'Main Workflow')];
  }

  const steps: StepDefinition[] = [];

  // 为每个 group 创建 Step
  for (const group of data.groups as Array<{ id: number; title: string; nodes?: number[] }>) {
    const nodeIds = group.nodes || [];
    const groupNodeSet = new Set(nodeIds);

    const stepNodes: StepNode[] = [];
    const internalLinks: InternalLink[] = [];

    for (const nodeId of nodeIds) {
      const uiNode = data.nodes.find((n) => n.id === nodeId);
      if (!uiNode) continue;

      // 直接保存原始节点数据
      const stepNode: StepNode = {
        ...uiNode,
        id: String(uiNode.id),
        type: uiNode.type,
        _originalId: uiNode.id,
      };
      stepNodes.push(stepNode);
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
 * 解析连线数据
 */
function parseLink(linkData: number | string): ParsedLink | null {
  if (typeof linkData === 'string') {
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
