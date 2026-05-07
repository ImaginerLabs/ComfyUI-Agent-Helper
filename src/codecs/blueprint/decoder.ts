import type { WorkflowCodec, DecodeResult, EncodeResult, DecodeOptions, EncodeOptions, UnifiedWorkflow } from '../types.js';
import type { StepDefinition, StepNode, InternalLink, StepInputPort, StepOutputPort } from '../../types.js';
import { generateWorkflowId } from '../../utils/id-generator.js';

// Blueprint JSON 内部类型
interface BlueprintJSON {
  definitions?: {
    subgraphs?: BlueprintSubgraph[];
  };
}

interface BlueprintSubgraph {
  id: string;
  name: string;
  category?: string;
  nodes: BlueprintNode[];
  links: BlueprintLink[];
  inputs: BlueprintPortDef[];
  outputs: BlueprintPortDef[];
}

interface BlueprintNode {
  id: number;
  type: string;
  title?: string;
  pos?: [number, number];
  inputs: BlueprintNodeInput[];
  outputs: BlueprintNodeOutput[];
  widgets_values?: unknown[] | Record<string, unknown>;
}

interface BlueprintNodeInput {
  name: string;
  type: string;
  link?: number | null;
  widget?: { name: string };
}

interface BlueprintNodeOutput {
  name: string;
  type: string;
  links?: number[] | null;
}

interface BlueprintLink {
  id: number;
  origin_id: number;
  origin_slot: number;
  target_id: number;
  target_slot: number;
  type: string;
}

interface BlueprintPortDef {
  id: string;
  name: string;
  type: string;
  label?: string;
  linkIds: number[];
}

/**
 * Blueprint 格式编解码器
 */
export const blueprintCodec: WorkflowCodec = {
  format: {
    id: 'blueprint-v1',
    family: 'blueprint',
    version: '1',
    displayName: 'ComfyUI Blueprint Format',
    roundtripCapable: true,
  },

  detect(data: unknown): number {
    if (typeof data !== 'object' || data === null) return 0;
    const obj = data as Record<string, unknown>;

    if (obj.definitions && typeof obj.definitions === 'object') {
      const defs = obj.definitions as Record<string, unknown>;
      if (Array.isArray(defs.subgraphs) && defs.subgraphs.length > 0) {
        return 1;
      }
    }

    return 0;
  },

  decode(data: unknown, _options?: DecodeOptions): DecodeResult {
    const json = data as BlueprintJSON;
    const subgraphs = json.definitions?.subgraphs;

    if (!subgraphs || subgraphs.length === 0) {
      return {
        workflow: {
          id: generateWorkflowId(),
          steps: new Map(),
          crossLinks: [],
        },
        detectedFormat: blueprintCodec.format,
      };
    }

    const workflow: UnifiedWorkflow = {
      id: generateWorkflowId(),
      steps: new Map(),
      crossLinks: [],
      blueprint: {
        revision: 1,
      },
    };

    const usedStepIds = new Set<string>();

    for (const sg of subgraphs) {
      let stepId = sanitizeStepId(sg.name);
      if (!stepId) stepId = sg.id.replace(/-/g, '_');

      // 处理 ID 冲突
      if (usedStepIds.has(stepId)) {
        let suffix = 1;
        while (usedStepIds.has(`${stepId}_${suffix}`)) {
          suffix++;
        }
        stepId = `${stepId}_${suffix}`;
      }
      usedStepIds.add(stepId);

      // 排除虚拟节点 -10, -20
      const nodeIdSet = new Set(sg.nodes.map((n) => n.id));
      const realNodes = sg.nodes.filter((n) => n.id !== -10 && n.id !== -20);

      const stepNodes: StepNode[] = [];
      for (const bn of realNodes) {
        // 提取 widget 参数
        const widgetInputs = bn.inputs.filter((inp) => inp.widget);
        const widgets: Record<string, unknown> = {};
        if (bn.widgets_values && widgetInputs.length > 0 && Array.isArray(bn.widgets_values)) {
          for (let i = 0; i < widgetInputs.length; i++) {
            const val = bn.widgets_values[i];
            if (val !== undefined && val !== null) {
              widgets[widgetInputs[i].widget!.name] = val;
            }
          }
        }

        stepNodes.push({
          id: String(bn.id),
          type: bn.type,
          ...(Object.keys(widgets).length > 0 ? { widgets } : {}),
          ...(bn.title ? { title: bn.title } : {}),
          ...(bn.pos ? { pos: bn.pos } : {}),
        });
      }

      // 构建内部连线
      const internalLinks: InternalLink[] = [];
      for (const link of sg.links) {
        if (link.origin_id === -10 || link.origin_id === -20) continue;
        if (link.target_id === -10 || link.target_id === -20) continue;
        if (!nodeIdSet.has(link.origin_id) || !nodeIdSet.has(link.target_id)) continue;

        const targetNode = sg.nodes.find((n) => n.id === link.target_id);
        if (!targetNode) continue;

        const targetInput = targetNode.inputs[link.target_slot];
        if (!targetInput) continue;

        internalLinks.push({
          from: [String(link.origin_id), link.origin_slot],
          to: [String(link.target_id), targetInput.name],
        });
      }

      // 构建输入端口
      const stepInputs: StepInputPort[] = [];
      for (const sgInput of sg.inputs) {
        const inputLink = sg.links.find(
          (l) => sgInput.linkIds.includes(l.id) && l.origin_id === -10
        );
        if (!inputLink) continue;

        const targetNode = sg.nodes.find((n) => n.id === inputLink.target_id);
        if (!targetNode) continue;

        const targetInput = targetNode.inputs[inputLink.target_slot];
        if (!targetInput) continue;

        stepInputs.push({
          id: sgInput.label || sgInput.name.replace(/[^a-zA-Z0-9_]/g, '_'),
          label: sgInput.label || sgInput.name,
          type: sgInput.type as never,
          target: [String(inputLink.target_id), targetInput.name],
        });
      }

      // 构建输出端口
      const stepOutputs: StepOutputPort[] = [];
      for (const sgOutput of sg.outputs) {
        const outputLink = sg.links.find(
          (l) => sgOutput.linkIds.includes(l.id) && l.target_id === -20
        );
        if (!outputLink) continue;
        if (!nodeIdSet.has(outputLink.origin_id)) continue;

        stepOutputs.push({
          id: sgOutput.label || sgOutput.name,
          label: sgOutput.label || sgOutput.name,
          type: sgOutput.type as never,
          source: [String(outputLink.origin_id), outputLink.origin_slot],
        });
      }

      const stepDef: StepDefinition = {
        id: stepId,
        name: sg.name,
        nodes: stepNodes,
        internalLinks,
        ...(stepInputs.length > 0 ? { inputs: stepInputs } : {}),
        ...(stepOutputs.length > 0 ? { outputs: stepOutputs } : {}),
      };

      workflow.steps.set(stepId, stepDef);
    }

    return {
      workflow,
      detectedFormat: blueprintCodec.format,
    };
  },

  encode(workflow: UnifiedWorkflow, _options?: EncodeOptions): EncodeResult {
    const subgraphs: BlueprintSubgraph[] = [];
    let linkId = 1;

    for (const [stepId, step] of workflow.steps) {
      const nodes: BlueprintNode[] = [];
      const links: BlueprintLink[] = [];

      // 构建节点
      for (const node of step.nodes) {
        const inputs: BlueprintNodeInput[] = [];
        const outputs: BlueprintNodeOutput[] = [];

        // TODO: 从 preset 获取 inputs/outputs

        nodes.push({
          id: parseInt(node.id, 10) || 0,
          type: node.type,
          ...(node.title ? { title: node.title } : {}),
          ...(node.pos ? { pos: node.pos } : {}),
          inputs,
          outputs,
          ...(node.widgets_values ? { widgets_values: node.widgets_values } : {}),
        });
      }

      // 构建内部连线
      for (const link of step.internalLinks) {
        links.push({
          id: linkId++,
          origin_id: parseInt(link.from[0], 10),
          origin_slot: link.from[1],
          target_id: parseInt(link.to[0], 10),
          target_slot: 0, // TODO: 需要从目标节点获取 slot
          type: 'UNKNOWN',
        });
      }

      // 构建端口定义
      const inputs: BlueprintPortDef[] = step.inputs?.map((inp, i) => ({
        id: inp.id,
        name: inp.label,
        type: inp.type ?? 'UNKNOWN',
        label: inp.label,
        linkIds: [linkId + i],
      })) ?? [];

      const outputs: BlueprintPortDef[] = step.outputs?.map((out, i) => ({
        id: out.id,
        name: out.label,
        type: out.type ?? 'UNKNOWN',
        label: out.label,
        linkIds: [linkId + inputs.length + i],
      })) ?? [];

      subgraphs.push({
        id: stepId,
        name: step.name,
        nodes,
        links,
        inputs,
        outputs,
      });
    }

    return {
      data: {
        definitions: {
          subgraphs,
        },
      },
      format: blueprintCodec.format,
    };
  },
};

function sanitizeStepId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_:-]/g, '_');
}