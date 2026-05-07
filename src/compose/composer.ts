import type { ComfyUIWorkflow, ComfyAPINode, ComfyUIFormat, UINode, UIInput, UIOutput } from '../types.js';
import type { ValidationMode } from '../presets/types.js';
import type { ValidationIssue } from '../validate/types.js';
import { getWorkflow } from '../workflow/workflow.js';
import { getPreset } from '../presets/registry.js';
import { validateInputType } from '../validate/node-validator.js';
import { buildIdMapping, resolveId } from './id-resolver.js';

export interface ComposeOptions {
  /** 连线类型校验模式 */
  validateLinks?: ValidationMode;
  /** 输出格式，默认只输出 api */
  outputFormat?: 'api' | 'both' | 'ui';
}

export interface ComposeResult extends ComfyUIWorkflow {
  /** 校验产生的警告（仅当 validateLinks 不为 'none' 时） */
  warnings?: ValidationIssue[];
}

export function compose(workflowId: string, options?: ComposeOptions): ComposeResult {
  const wf = getWorkflow({ id: workflowId });
  if (!wf) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  const outputFormat = options?.outputFormat ?? 'api';
  const { apiFormat, warnings, linkInfo } = buildAPIFormat(wf, options);

  const result: ComposeResult = { apiFormat };

  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  // 根据需要生成 UI 格式
  if (outputFormat === 'both' || outputFormat === 'ui') {
    result.uiFormat = buildUIFormat(wf, apiFormat, linkInfo);
  }

  return result;
}

/**
 * 连线信息，用于构建 UI 格式
 */
interface LinkInfo {
  /** globalId -> UI nodeId */
  nodeIdMap: Map<string, number>;
  /** 连线列表 */
  links: LinkData[];
  /** 下一个 link ID */
  nextLinkId: number;
  /** 下一个 node ID */
  nextNodeId: number;
}

interface LinkData {
  linkId: number;
  sourceGlobalId: string;
  sourceSlot: number;
  targetGlobalId: string;
  targetInputName: string;
  type: string;
}

/**
 * 构建 API 格式，同时收集连线信息
 */
function buildAPIFormat(
  wf: ReturnType<typeof getWorkflow>,
  options?: ComposeOptions
): { apiFormat: Record<string, ComfyAPINode>; warnings: ValidationIssue[]; linkInfo: LinkInfo } {
  const mapping = buildIdMapping(wf!);
  const apiFormat: Record<string, ComfyAPINode> = {};
  const warnings: ValidationIssue[] = [];
  const linkMode = options?.validateLinks ?? 'none';

  const linkInfo: LinkInfo = {
    nodeIdMap: new Map(),
    links: [],
    nextLinkId: 1,
    nextNodeId: 1,
  };

  // 1. 收集所有节点：widgets → inputs
  for (const [stepId, step] of wf!.steps) {
    for (const node of step.nodes) {
      const globalId = resolveId(mapping, stepId, node.id);
      if (!globalId) {
        throw new Error(
          `Failed to resolve global ID for node "${node.id}" in step "${stepId}"`
        );
      }

      // 分配 UI node ID
      linkInfo.nodeIdMap.set(globalId, linkInfo.nextNodeId++);

      const inputs: Record<string, unknown> = {};
      if (node.widgets) {
        for (const [key, value] of Object.entries(node.widgets)) {
          inputs[key] = value;
        }
      }

      apiFormat[globalId] = {
        class_type: node.type,
        inputs,
      };
    }
  }

  // 2. 处理内部连线
  for (const [stepId, step] of wf!.steps) {
    for (const link of step.internalLinks) {
      const [fromNodeId, slotIndex] = link.from;
      const [toNodeId, inputName] = link.to;

      const globalFromId = resolveId(mapping, stepId, fromNodeId);
      const globalToId = resolveId(mapping, stepId, toNodeId);

      if (!globalFromId) {
        throw new Error(
          `InternalLink references unknown source node "${fromNodeId}" in step "${stepId}"`
        );
      }
      if (!globalToId) {
        throw new Error(
          `InternalLink references unknown target node "${toNodeId}" in step "${stepId}"`
        );
      }

      const targetNode = apiFormat[globalToId];
      if (!targetNode) {
        throw new Error(
          `Target node "${globalToId}" not found in apiFormat`
        );
      }

      // 连线类型校验
      if (linkMode !== 'none') {
        const fromNode = step.nodes.find((n) => n.id === fromNodeId);
        const toNode = step.nodes.find((n) => n.id === toNodeId);
        if (fromNode && toNode) {
          const fromPreset = getPreset(fromNode.type);
          const toPreset = getPreset(toNode.type);
          if (fromPreset && toPreset) {
            const outputSpec = fromPreset.outputs.find((o) => o.slotIndex === slotIndex);
            const inputSpec = toPreset.inputs.find((i) => i.name === inputName);
            if (outputSpec && inputSpec) {
              const issue = validateInputType(
                inputName,
                outputSpec.type,
                inputSpec.type,
                linkMode
              );
              if (issue) {
                warnings.push({
                  ...issue,
                  stepId,
                  nodeId: toNodeId,
                });
              }
            }
          }
        }
      }

      targetNode.inputs[inputName] = [globalFromId, slotIndex];

      // 记录连线信息
      const linkType = getLinkType(apiFormat, globalFromId, slotIndex);
      linkInfo.links.push({
        linkId: linkInfo.nextLinkId++,
        sourceGlobalId: globalFromId,
        sourceSlot: slotIndex,
        targetGlobalId: globalToId,
        targetInputName: inputName,
        type: linkType,
      });
    }
  }

  // 3. 处理跨 Step 连线
  for (const crossLink of wf!.crossLinks) {
    const fromStep = wf!.steps.get(crossLink.from.stepId);
    const toStep = wf!.steps.get(crossLink.to.stepId);

    if (!fromStep) {
      throw new Error(
        `CrossLink references unknown source step "${crossLink.from.stepId}"`
      );
    }
    if (!toStep) {
      throw new Error(
        `CrossLink references unknown target step "${crossLink.to.stepId}"`
      );
    }

    const outputPort = fromStep.outputs?.find(
      (p) => p.id === crossLink.from.portId
    );
    const inputPort = toStep.inputs?.find(
      (p) => p.id === crossLink.to.portId
    );

    if (!outputPort) {
      throw new Error(
        `Output port "${crossLink.from.portId}" not found in step "${crossLink.from.stepId}"`
      );
    }
    if (!inputPort) {
      throw new Error(
        `Input port "${crossLink.to.portId}" not found in step "${crossLink.to.stepId}"`
      );
    }

    const [sourceNodeId, slotIndex] = outputPort.source;
    const [targetNodeId, inputName] = inputPort.target;

    const globalFromId = resolveId(mapping, crossLink.from.stepId, sourceNodeId);
    const globalToId = resolveId(mapping, crossLink.to.stepId, targetNodeId);

    if (!globalFromId) {
      throw new Error(
        `CrossLink output port "${outputPort.id}" references unknown node "${sourceNodeId}" in step "${crossLink.from.stepId}"`
      );
    }
    if (!globalToId) {
      throw new Error(
        `CrossLink input port "${inputPort.id}" references unknown node "${targetNodeId}" in step "${crossLink.to.stepId}"`
      );
    }

    const targetNode = apiFormat[globalToId];
    if (!targetNode) {
      throw new Error(
        `Target node "${globalToId}" not found in apiFormat`
      );
    }

    // 连线类型校验
    if (linkMode !== 'none') {
      if (outputPort.type && inputPort.type) {
        const issue = validateInputType(
          inputName,
          outputPort.type,
          inputPort.type,
          linkMode
        );
        if (issue) {
          warnings.push({
            ...issue,
            stepId: crossLink.to.stepId,
            nodeId: targetNodeId,
          });
        }
      }
    }

    targetNode.inputs[inputName] = [globalFromId, slotIndex];

    // 记录连线信息
    const linkType = outputPort.type || getLinkType(apiFormat, globalFromId, slotIndex);
    linkInfo.links.push({
      linkId: linkInfo.nextLinkId++,
      sourceGlobalId: globalFromId,
      sourceSlot: slotIndex,
      targetGlobalId: globalToId,
      targetInputName: inputName,
      type: linkType,
    });
  }

  return { apiFormat, warnings, linkInfo };
}

/**
 * 构建 UI 格式
 */
function buildUIFormat(
  wf: ReturnType<typeof getWorkflow>,
  apiFormat: Record<string, ComfyAPINode>,
  linkInfo: LinkInfo
): ComfyUIFormat {
  const nodes: UINode[] = [];
  const links: (number | string)[][] = [];

  // 1. 转换节点
  for (const [globalId, apiNode] of Object.entries(apiFormat)) {
    const uiNodeId = linkInfo.nodeIdMap.get(globalId)!;

    // 获取节点位置
    const position = getNodePosition(wf, globalId);

    // 尝试从原始节点获取 widgets_values（往返转换）
    const originalWidgetsValues = getOriginalWidgetsValues(wf, globalId);

    // 如果有原始 widgets_values，使用它；否则从 apiNode 提取
    const widgetsValues = originalWidgetsValues ?? extractWidgetsValues(apiNode);

    // 构建 inputs/outputs
    const preset = getPreset(apiNode.class_type);
    const inputs: UIInput[] = [];
    const outputs: UIOutput[] = [];

    if (preset) {
      for (const inp of preset.inputs) {
        inputs.push({
          name: inp.name,
          type: inp.type,
          link: undefined,
        });
      }
      for (const out of preset.outputs) {
        outputs.push({
          name: out.name,
          type: out.type,
          links: [],
          slot_index: out.slotIndex,
        });
      }
    }

    const uiNode: UINode = {
      id: uiNodeId,
      type: apiNode.class_type,
      pos: [position.x, position.y],
      inputs: inputs.length > 0 ? inputs : undefined,
      outputs: outputs.length > 0 ? outputs : undefined,
      widgets_values: widgetsValues.length > 0 ? widgetsValues : undefined,
    };

    nodes.push(uiNode);
  }

  // 2. 构建连线
  for (const link of linkInfo.links) {
    const sourceUINodeId = linkInfo.nodeIdMap.get(link.sourceGlobalId);
    const targetUINodeId = linkInfo.nodeIdMap.get(link.targetGlobalId);

    if (sourceUINodeId === undefined || targetUINodeId === undefined) {
      continue;
    }

    const targetNode = nodes.find((n) => n.id === targetUINodeId);
    const inputSlotIndex = targetNode?.inputs?.findIndex((i) => i.name === link.targetInputName) ?? 0;

    const linkArray: (number | string)[] = [
      link.linkId,
      sourceUINodeId,
      link.sourceSlot,
      targetUINodeId,
      inputSlotIndex,
      link.type,
    ];
    links.push(linkArray);

    // 更新 target node 的 input link
    if (targetNode?.inputs && inputSlotIndex >= 0) {
      targetNode.inputs[inputSlotIndex].link = link.linkId;
    }

    // 更新 source node 的 output links
    const sourceNode = nodes.find((n) => n.id === sourceUINodeId);
    if (sourceNode?.outputs && sourceNode.outputs[link.sourceSlot]) {
      sourceNode.outputs[link.sourceSlot].links = sourceNode.outputs[link.sourceSlot].links || [];
      sourceNode.outputs[link.sourceSlot].links!.push(link.linkId);
    }
  }

  return {
    last_node_id: linkInfo.nextNodeId - 1,
    last_link_id: linkInfo.nextLinkId - 1,
    nodes,
    links,
    groups: [],
    config: {},
    extra: {},
    version: 0.4,
  };
}

/**
 * 从原始节点获取 widgets_values（用于往返转换）
 */
function getOriginalWidgetsValues(
  wf: ReturnType<typeof getWorkflow>,
  globalId: string
): unknown[] | null {
  // 解析 globalId 获取 stepId 和 nodeId
  const parts = globalId.split(':');
  if (parts.length < 2) return null;

  const stepId = parts[0];
  const nodeId = parts.slice(1).join(':');

  const step = wf!.steps.get(stepId);
  if (!step) return null;

  const node = step.nodes.find((n) => n.id === nodeId);
  if (node?.widgets_values) {
    return node.widgets_values;
  }

  return null;
}

/**
 * 从 API 节点提取 widgets_values 数组
 */
function extractWidgetsValues(apiNode: ComfyAPINode): unknown[] {
  const preset = getPreset(apiNode.class_type);
  const values: unknown[] = [];

  if (!preset || !preset.widgets) {
    return Object.entries(apiNode.inputs)
      .filter(([, v]) => !Array.isArray(v))
      .map(([, v]) => v);
  }

  // 按 preset 定义的 widget 顺序提取
  for (const widget of preset.widgets) {
    const value = apiNode.inputs[widget.name];
    if (value !== undefined && !Array.isArray(value)) {
      values.push(value);
    }
  }

  return values;
}

/**
 * 获取节点位置
 */
function getNodePosition(
  wf: ReturnType<typeof getWorkflow>,
  globalId: string
): { x: number; y: number } {
  // 解析 globalId 获取 stepId 和 nodeId
  const parts = globalId.split(':');
  if (parts.length < 2) return { x: 0, y: 0 };

  const stepId = parts[0];
  const nodeId = parts.slice(1).join(':');

  const step = wf!.steps.get(stepId);
  if (!step) return { x: 0, y: 0 };

  const node = step.nodes.find((n) => n.id === nodeId);
  if (node?.position) {
    return node.position;
  }

  // 使用节点在数组中的索引计算位置
  const nodeIndex = step.nodes.findIndex((n) => n.id === nodeId);
  const stepIndex = Array.from(wf!.steps.keys()).indexOf(stepId);

  return {
    x: stepIndex * 400 + (nodeIndex % 4) * 200,
    y: Math.floor(nodeIndex / 4) * 150,
  };
}

/**
 * 获取连线的类型字符串
 */
function getLinkType(
  apiFormat: Record<string, ComfyAPINode>,
  globalId: string,
  slot: number
): string {
  const preset = getPreset(apiFormat[globalId]?.class_type ?? '');
  return preset?.outputs?.[slot]?.type ?? 'UNKNOWN';
}
