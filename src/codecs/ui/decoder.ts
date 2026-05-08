import type { WorkflowCodec, DecodeResult, EncodeResult, DecodeOptions, EncodeOptions, UnifiedWorkflow } from '../types.js';
import type { StepDefinition, StepNode, InternalLink, StepInputPort, StepOutputPort, ComfyDataType } from '../../types.js';
import { detectUIVersion, normalizeLinks, convertUINodeToStepNode, type UIFormatJSON, type NormalizedLink, type UILinkV0 } from './types.js';
import { generateWorkflowId } from '../../utils/id-generator.js';

/**
 * UI 格式编解码器
 */
export const uiCodec: WorkflowCodec = {
  format: {
    id: 'ui-v0.4',
    family: 'ui',
    version: '0.4',
    displayName: 'ComfyUI UI Format (v0.4)',
    roundtripCapable: true,
  },

  detect(data: unknown): number {
    if (typeof data !== 'object' || data === null) return 0;
    const obj = data as Record<string, unknown>;

    // 必须有 nodes 数组
    if (!Array.isArray(obj.nodes) || obj.nodes.length === 0) return 0;

    // 必须有 links 键
    if (!('links' in obj)) return 0;

    // 检测版本
    const version = detectUIVersion(data);
    if (version === 'v1.0') return 0.8; // v1.0 应该用 uiV1Codec
    if (version === 'v0.4') return 1;

    return 0.5;
  },

  decode(data: unknown, options?: DecodeOptions): DecodeResult {
    const json = data as UIFormatJSON;
    const warnings: string[] = [];

    // 创建工作流
    const workflow: UnifiedWorkflow = {
      id: json.id ?? generateWorkflowId(),
      steps: new Map(),
      crossLinks: [],
    };

    // 保存 UI 元数据
    workflow.ui = {
      last_node_id: json.state?.lastNodeId ?? json.last_node_id ?? 0,
      last_link_id: json.state?.lastLinkId ?? json.last_link_id ?? 0,
      groups: json.groups ?? [],
      config: json.config ?? {},
      extra: json.extra ?? {},
      version: json.version ?? 0.4,
    };

    // 保存原始数据用于往返
    workflow.source = {
      format: 'ui-v0.4',
      raw: json,
    };

    // 默认导入为单个 Step
    const asSingleStep = options?.asSingleStep ?? true;

    if (asSingleStep) {
      const stepId = options?.stepId ?? 'main';
      const stepName = options?.stepName ?? 'Main Workflow';
      const step = convertUIToStep(json, stepId, stepName);
      workflow.steps.set(stepId, step);
    } else {
      // 多 Step 模式：根据 groups 分组
      const steps = convertUIToMultipleSteps(json);
      for (const step of steps) {
        workflow.steps.set(step.id, step);
      }
    }

    return {
      workflow,
      detectedFormat: uiCodec.format,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  encode(workflow: UnifiedWorkflow, options?: EncodeOptions): EncodeResult {
    const targetVersion = options?.format === 'ui-v1.0' ? 'v1.0' : 'v0.4';
    const includeMetadata = options?.includeMetadata ?? true;

    // 获取原始 JSON 作为基础（保留字段顺序和所有未知字段）
    const raw = workflow.source?.raw as UIFormatJSON | undefined;

    // 收集所有节点和连线
    const nodes: UIFormatJSON['nodes'] = [];
    const links: NormalizedLink[] = [];
    const nodeIdMap = new Map<string, number>();
    let nextNodeId = 1;
    let nextLinkId = 1;

    // 分配节点 ID
    for (const [stepId, step] of workflow.steps) {
      for (const node of step.nodes) {
        const originalId = node._originalId ?? nextNodeId++;
        nodeIdMap.set(`${stepId}:${node.id}`, originalId);
      }
    }

    // 构建节点
    for (const [stepId, step] of workflow.steps) {
      for (const node of step.nodes) {
        const globalId = `${stepId}:${node.id}`;
        const uiNodeId = nodeIdMap.get(globalId)!;

        nodes.push({
          id: uiNodeId,
          type: node.type,
          pos: node.pos ?? [0, 0],
          size: node.size,
          flags: node.flags ?? {},
          order: node.order ?? 0,
          mode: node.mode ?? 0,
          inputs: node.inputs,
          outputs: node.outputs,
          properties: node.properties ?? {},
          widgets_values: node.widgets_values,
          title: node.title,
          color: (node as Record<string, unknown>).color as string | undefined,
          bgcolor: (node as Record<string, unknown>).bgcolor as string | undefined,
        });
      }
    }

    // 构建内部连线
    for (const [stepId, step] of workflow.steps) {
      for (const link of step.internalLinks) {
        const sourceGlobalId = `${stepId}:${link.from[0]}`;
        const targetGlobalId = `${stepId}:${link.to[0]}`;

        const sourceNodeId = nodeIdMap.get(sourceGlobalId);
        const targetNodeId = nodeIdMap.get(targetGlobalId);

        if (sourceNodeId === undefined || targetNodeId === undefined) continue;

        // 获取目标节点的输入 slot
        const targetNode = step.nodes.find((n) => n.id === link.to[0]);
        const targetSlot = targetNode?.inputs?.findIndex((i) => i.name === link.to[1]) ?? 0;

        // 获取连线类型
        const sourceNode = step.nodes.find((n) => n.id === link.from[0]);
        const linkType = sourceNode?.outputs?.[link.from[1]]?.type ?? 'UNKNOWN';

        links.push({
          id: nextLinkId++,
          origin_id: sourceNodeId,
          origin_slot: link.from[1],
          target_id: targetNodeId,
          target_slot: targetSlot,
          type: linkType,
        });
      }
    }

    // 构建跨 Step 连线
    for (const crossLink of workflow.crossLinks) {
      const fromStep = workflow.steps.get(crossLink.from.stepId);
      const toStep = workflow.steps.get(crossLink.to.stepId);
      if (!fromStep || !toStep) continue;

      const outputPort = fromStep.outputs?.find((p) => p.id === crossLink.from.portId);
      const inputPort = toStep.inputs?.find((p) => p.id === crossLink.to.portId);
      if (!outputPort || !inputPort) continue;

      const sourceGlobalId = `${crossLink.from.stepId}:${outputPort.source[0]}`;
      const targetGlobalId = `${crossLink.to.stepId}:${inputPort.target[0]}`;

      const sourceNodeId = nodeIdMap.get(sourceGlobalId);
      const targetNodeId = nodeIdMap.get(targetGlobalId);

      if (sourceNodeId === undefined || targetNodeId === undefined) continue;

      const targetNode = toStep.nodes.find((n) => n.id === inputPort.target[0]);
      const targetSlot = targetNode?.inputs?.findIndex((i) => i.name === inputPort.target[1]) ?? 0;

      const sourceNode = fromStep.nodes.find((n) => n.id === outputPort.source[0]);
      const linkType = outputPort.type ?? sourceNode?.outputs?.[outputPort.source[1]]?.type ?? 'UNKNOWN';

      links.push({
        id: nextLinkId++,
        origin_id: sourceNodeId,
        origin_slot: outputPort.source[1],
        target_id: targetNodeId,
        target_slot: targetSlot,
        type: linkType,
      });
    }

    // 构建输出 JSON
    // 如果有原始 JSON，基于它构建以保留字段顺序和未知字段
    let output: UIFormatJSON;

    if (raw && workflow.source?.format.startsWith('ui-')) {
      // 浅拷贝原始 JSON，保留字段顺序
      output = { ...raw };

      // 只更新需要更新的字段
      output.nodes = nodes;
      output.links = targetVersion === 'v1.0'
        ? links
        : links.map((l) => [l.id, l.origin_id, l.origin_slot, l.target_id, l.target_slot, l.type]) as UILinkV0[];
      output.version = targetVersion === 'v1.0' ? 1 : 0.4;

      // 更新元数据字段
      if (includeMetadata && workflow.ui) {
        output.last_node_id = Math.max(...Array.from(nodeIdMap.values()), workflow.ui.last_node_id);
        output.last_link_id = nextLinkId - 1;
        output.groups = workflow.ui.groups;
        output.config = workflow.ui.config;
        output.extra = workflow.ui.extra;
      }
    } else {
      // 没有原始 JSON，使用默认构建顺序
      output = {
        nodes,
        links: targetVersion === 'v1.0'
          ? links
          : links.map((l) => [l.id, l.origin_id, l.origin_slot, l.target_id, l.target_slot, l.type]) as UILinkV0[],
        version: targetVersion === 'v1.0' ? 1 : 0.4,
      };

      // 保存原始工作流 ID（从 source.raw 或 workflow.id）
      const rawId = (workflow.source?.raw as { id?: string })?.id;
      if (rawId) {
        output.id = rawId;
      } else if (workflow.id) {
        output.id = workflow.id;
      }

      // 保存原始 revision
      const rawRevision = (workflow.source?.raw as { revision?: number })?.revision;
      if (rawRevision !== undefined) {
        output.revision = rawRevision;
      }

      if (includeMetadata && workflow.ui) {
        output.last_node_id = Math.max(...Array.from(nodeIdMap.values()), workflow.ui.last_node_id);
        output.last_link_id = nextLinkId - 1;
        output.groups = workflow.ui.groups;
        output.config = workflow.ui.config;
        output.extra = workflow.ui.extra;
      }
    }

    return {
      data: output,
      format: uiCodec.format,
    };
  },
};

/**
 * UI v1.0 格式编解码器
 */
export const uiV1Codec: WorkflowCodec = {
  format: {
    id: 'ui-v1.0',
    family: 'ui',
    version: '1.0',
    displayName: 'ComfyUI UI Format (v1.0)',
    roundtripCapable: true,
  },

  detect(data: unknown): number {
    if (typeof data !== 'object' || data === null) return 0;
    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj.nodes) || obj.nodes.length === 0) return 0;
    if (!('links' in obj)) return 0;

    const version = detectUIVersion(data);
    if (version === 'v1.0') return 1;
    return 0;
  },

  decode(data: unknown, options?: DecodeOptions): DecodeResult {
    // v1.0 解码逻辑与 v0.4 相同，只是版本检测不同
    return uiCodec.decode(data, options);
  },

  encode(workflow: UnifiedWorkflow, options?: EncodeOptions): EncodeResult {
    // 使用 v1.0 格式编码
    return uiCodec.encode(workflow, { ...options, format: 'ui-v1.0' });
  },
};

// === 辅助函数 ===

function convertUIToStep(json: UIFormatJSON, stepId: string, stepName: string): StepDefinition {
  const nodeMap = new Map<number | string, StepNode>();

  // 转换节点
  for (const uiNode of json.nodes) {
    const stepNode = convertUINodeToStepNode(uiNode);
    nodeMap.set(uiNode.id, stepNode);
  }

  // 转换连线
  const links = normalizeLinks(json.links);
  const internalLinks: InternalLink[] = [];
  const inputPorts: StepInputPort[] = [];
  const outputPorts: StepOutputPort[] = [];

  for (const link of links) {
    const targetNodeId = link.target_id;
    const sourceNodeId = link.origin_id;

    // 内部连接
    if (nodeMap.has(sourceNodeId) && nodeMap.has(targetNodeId)) {
      const targetNode = json.nodes.find((n) => n.id === targetNodeId);
      const targetInput = targetNode?.inputs?.[Number(link.target_slot)];

      if (targetInput) {
        internalLinks.push({
          from: [String(sourceNodeId), Number(link.origin_slot)],
          to: [String(targetNodeId), targetInput.name],
        });
      }
    }
    // 外部输入
    else if (!nodeMap.has(sourceNodeId) && nodeMap.has(targetNodeId)) {
      const targetNode = json.nodes.find((n) => n.id === targetNodeId);
      const targetInput = targetNode?.inputs?.[Number(link.target_slot)];

      if (targetInput) {
        inputPorts.push({
          id: `input_${inputPorts.length}`,
          label: targetInput.name,
          type: link.type as ComfyDataType,
          target: [String(targetNodeId), targetInput.name],
        });
      }
    }
    // 外部输出
    else if (nodeMap.has(sourceNodeId) && !nodeMap.has(targetNodeId)) {
      const sourceNode = json.nodes.find((n) => n.id === sourceNodeId);
      const outputInfo = sourceNode?.outputs?.[Number(link.origin_slot)];

      if (outputInfo) {
        outputPorts.push({
          id: `output_${outputPorts.length}`,
          label: outputInfo.name,
          type: link.type as ComfyDataType,
          source: [String(sourceNodeId), Number(link.origin_slot)],
        });
      }
    }
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

function convertUIToMultipleSteps(json: UIFormatJSON): StepDefinition[] {
  if (!json.groups || json.groups.length === 0) {
    return [convertUIToStep(json, 'main', 'Main Workflow')];
  }

  const steps: StepDefinition[] = [];

  for (const group of json.groups) {
    const nodeIds = group.nodes ?? [];
    const groupNodeSet = new Set<number | string>(nodeIds);

    const stepNodes: StepNode[] = [];
    const internalLinks: InternalLink[] = [];

    for (const nodeId of nodeIds) {
      const uiNode = json.nodes.find((n) => n.id === nodeId);
      if (!uiNode) continue;

      stepNodes.push(convertUINodeToStepNode(uiNode));
    }

    const links = normalizeLinks(json.links);
    for (const link of links) {
      if (groupNodeSet.has(link.origin_id) && groupNodeSet.has(link.target_id)) {
        const targetNode = json.nodes.find((n) => n.id === link.target_id);
        const targetInput = targetNode?.inputs?.[Number(link.target_slot)];

        if (targetInput) {
          internalLinks.push({
            from: [String(link.origin_id), Number(link.origin_slot)],
            to: [String(link.target_id), targetInput.name],
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

function sanitizeStepId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_:-]/g, '_');
}
