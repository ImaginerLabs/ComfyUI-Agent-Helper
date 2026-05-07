import type { Workflow } from '../types.js';
import type {
  WorkflowHandle,
  StepDefinition,
  StepNode,
  InternalLink,
  StepInputPort,
  StepOutputPort,
  ImportResult,
} from '../../types.js';

// ---------------------------------------------------------------------------
// Blueprint JSON 内部类型（ComfyUI UI 格式的子图结构）
// ---------------------------------------------------------------------------

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
  widgets_values?: unknown[];
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
 * 从 Blueprint JSON 导入工作流
 */
export function importFromBlueprint(
  handle: WorkflowHandle,
  wf: Workflow,
  json: unknown
): ImportResult {
  const data = json as BlueprintJSON;
  const subgraphs = data.definitions?.subgraphs;
  if (!subgraphs || subgraphs.length === 0) {
    return { importedStepIds: [], detectedFormat: 'blueprint' };
  }

  const usedStepIds = new Set(wf.steps.keys());
  const importedStepIds: string[] = [];

  for (const sg of subgraphs) {
    // 生成唯一的 Step ID
    let baseId = sanitizeStepId(sg.name);
    if (!baseId) baseId = sg.id.replace(/-/g, '_');

    // 同名 subgraph 覆盖，不同名 subgraph 碰撞则加后缀
    const existing = wf.steps.get(baseId);
    let stepId: string;
    if (existing && existing.name === sg.name) {
      stepId = baseId; // 同名覆盖
    } else {
      stepId = baseId;
      let suffix = 1;
      while (usedStepIds.has(stepId)) {
        stepId = `${baseId}_${suffix}`;
        suffix++;
      }
    }
    usedStepIds.add(stepId);

    // 1. 构建节点列表（排除虚拟节点 -10, -20）
    const nodeIdSet = new Set(sg.nodes.map((n) => n.id));
    const realNodes = sg.nodes.filter((n) => n.id !== -10 && n.id !== -20);

    const stepNodes: StepNode[] = [];
    for (const bn of realNodes) {
      // 从 inputs 中提取 widget 参数（有 widget 属性的输入）
      const widgetInputs = bn.inputs.filter((inp) => inp.widget);
      const widgets: Record<string, unknown> = {};
      if (bn.widgets_values && widgetInputs.length > 0) {
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
        ...(bn.pos ? { position: { x: bn.pos[0], y: bn.pos[1] } } : {}),
      });
    }

    // 2. 构建内部连线（跳过涉及 -10 或 -20 的连线）
    const internalLinks: InternalLink[] = [];
    for (const link of sg.links) {
      if (link.origin_id === -10 || link.origin_id === -20) continue;
      if (link.target_id === -10 || link.target_id === -20) continue;

      // 检查来源和目标节点是否都存在
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

    // 3. 构建输入端口（subgraph.inputs → StepInputPort）
    const stepInputs: StepInputPort[] = [];
    for (const sgInput of sg.inputs) {
      // 找到连接此输入到内部节点的 link
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

    // 4. 构建输出端口（subgraph.outputs → StepOutputPort）
    const stepOutputs: StepOutputPort[] = [];
    for (const sgOutput of sg.outputs) {
      // 找到连接内部节点到此输出的 link
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

    wf.steps.set(stepId, stepDef);
    importedStepIds.push(stepId);
  }

  return { importedStepIds, detectedFormat: 'blueprint' };
}

function sanitizeStepId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_:-]/g, '_');
}