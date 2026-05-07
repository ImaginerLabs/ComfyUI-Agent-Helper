import type { WorkflowCodec, DecodeResult, EncodeResult, DecodeOptions, EncodeOptions, UnifiedWorkflow } from '../types.js';
import type { StepDefinition, StepNode, InternalLink, StepInputPort, StepOutputPort, ComfyAPINode, ComfyDataType } from '../../types.js';
import { getPreset } from '../../presets/registry.js';
import { generateWorkflowId } from '../../utils/id-generator.js';

/**
 * API 格式 JSON 结构
 */
type APIFormatJSON = Record<string, ComfyAPINode>;

/**
 * API 格式编解码器
 */
export const apiCodec: WorkflowCodec = {
  format: {
    id: 'api-v1',
    family: 'api',
    version: '1',
    displayName: 'ComfyUI API Format',
    roundtripCapable: false, // API 格式丢失位置等元数据
  },

  detect(data: unknown): number {
    if (typeof data !== 'object' || data === null) return 0;
    const obj = data as Record<string, unknown>;

    const keys = Object.keys(obj);
    if (keys.length === 0) return 0;

    // 检查所有值是否都是 { class_type, inputs } 结构
    for (const key of keys) {
      const val = obj[key];
      if (typeof val !== 'object' || val === null) return 0;
      if (!('class_type' in val)) return 0;
      if (!('inputs' in val)) return 0;
    }

    return 1;
  },

  decode(data: unknown, options?: DecodeOptions): DecodeResult {
    const apiData = data as APIFormatJSON;
    const warnings: string[] = [];

    const workflow: UnifiedWorkflow = {
      id: generateWorkflowId(),
      steps: new Map(),
      crossLinks: [],
    };

    const stepId = options?.stepId ?? 'main';
    const stepName = options?.stepName ?? 'Main Workflow';

    const nodes: StepNode[] = [];
    const internalLinks: InternalLink[] = [];
    const inputPorts: StepInputPort[] = [];
    const outputPorts: StepOutputPort[] = [];

    const nodeIds = Object.keys(apiData);

    // 收集外部连接
    const externalInputs = new Map<string, { inputName: string; sourceType: string }>();
    const externalOutputs = new Map<string, { slot: number; type: string; name: string }>();

    for (const [nodeId, apiNode] of Object.entries(apiData)) {
      const widgets: Record<string, unknown> = {};

      for (const [inputName, inputValue] of Object.entries(apiNode.inputs)) {
        if (Array.isArray(inputValue)) {
          // 连接引用 [nodeId, slot]
          const [sourceNodeId, slot] = inputValue;

          if (nodeIds.includes(String(sourceNodeId))) {
            internalLinks.push({
              from: [String(sourceNodeId), slot],
              to: [nodeId, inputName],
            });
          } else {
            // 外部输入
            externalInputs.set(`${nodeId}:${inputName}`, {
              inputName,
              sourceType: 'unknown',
            });
          }
        } else {
          // 标量值（widget）
          widgets[inputName] = inputValue;
        }
      }

      nodes.push({
        id: nodeId,
        type: apiNode.class_type,
        ...(Object.keys(widgets).length > 0 ? { widgets } : {}),
      });
    }

    // 检测外部输出
    for (const [nodeId, apiNode] of Object.entries(apiData)) {
      const preset = getPreset(apiNode.class_type);
      if (preset?.outputs) {
        for (const output of preset.outputs) {
          const isUsed = internalLinks.some(
            (link) => link.from[0] === nodeId && link.from[1] === output.slotIndex
          );
          if (!isUsed) {
            externalOutputs.set(`${nodeId}:${output.slotIndex}`, {
              slot: output.slotIndex,
              type: output.type,
              name: output.name,
            });
          }
        }
      }
    }

    // 创建端口
    for (const [key, info] of externalInputs.entries()) {
      inputPorts.push({
        id: `input_${inputPorts.length}`,
        label: info.inputName,
        type: info.sourceType as ComfyDataType,
        target: [key.split(':')[0], info.inputName],
      });
    }

    for (const [key, info] of externalOutputs.entries()) {
      outputPorts.push({
        id: `output_${outputPorts.length}`,
        label: info.name,
        type: info.type as ComfyDataType,
        source: [key.split(':')[0], info.slot],
      });
    }

    const stepDef: StepDefinition = {
      id: stepId,
      name: stepName,
      nodes,
      internalLinks,
      ...(inputPorts.length > 0 ? { inputs: inputPorts } : {}),
      ...(outputPorts.length > 0 ? { outputs: outputPorts } : {}),
    };

    workflow.steps.set(stepId, stepDef);

    return {
      workflow,
      detectedFormat: apiCodec.format,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  encode(workflow: UnifiedWorkflow, _options?: EncodeOptions): EncodeResult {
    const apiFormat: APIFormatJSON = {};
    const nodeIdMap = new Map<string, string>();

    // 分配全局 ID
    for (const [stepId, step] of workflow.steps) {
      for (const node of step.nodes) {
        const globalId = `${stepId}:${node.id}`;
        nodeIdMap.set(globalId, globalId);
      }
    }

    // 构建节点
    for (const [stepId, step] of workflow.steps) {
      for (const node of step.nodes) {
        const globalId = nodeIdMap.get(`${stepId}:${node.id}`)!;

        const inputs: Record<string, unknown> = {};

        // 添加 widgets
        if (node.widgets) {
          for (const [key, value] of Object.entries(node.widgets)) {
            inputs[key] = value;
          }
        }
        if (node.widgets_values) {
          // widgets_values 需要通过 preset 映射到具名参数
          const preset = getPreset(node.type);
          if (preset) {
            const widgetNames: string[] = [];
            for (const inp of preset.inputs) {
              if (inp.isWidget) widgetNames.push(inp.name);
            }
            for (const w of preset.widgets) {
              widgetNames.push(w.name);
            }
            // widgets_values 可能是数组或对象
            const values = node.widgets_values;
            if (Array.isArray(values)) {
              for (let i = 0; i < Math.min(values.length, widgetNames.length); i++) {
                inputs[widgetNames[i]] = values[i];
              }
            }
          }
        }

        apiFormat[globalId] = {
          class_type: node.type,
          inputs,
        };
      }
    }

    // 构建内部连线
    for (const [stepId, step] of workflow.steps) {
      for (const link of step.internalLinks) {
        const sourceGlobalId = nodeIdMap.get(`${stepId}:${link.from[0]}`);
        const targetGlobalId = nodeIdMap.get(`${stepId}:${link.to[0]}`);

        if (!sourceGlobalId || !targetGlobalId) continue;

        const targetNode = apiFormat[targetGlobalId];
        if (targetNode) {
          targetNode.inputs[link.to[1]] = [sourceGlobalId, link.from[1]];
        }
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

      const sourceGlobalId = nodeIdMap.get(`${crossLink.from.stepId}:${outputPort.source[0]}`);
      const targetGlobalId = nodeIdMap.get(`${crossLink.to.stepId}:${inputPort.target[0]}`);

      if (!sourceGlobalId || !targetGlobalId) continue;

      const targetNode = apiFormat[targetGlobalId];
      if (targetNode) {
        targetNode.inputs[inputPort.target[1]] = [sourceGlobalId, outputPort.source[1]];
      }
    }

    return {
      data: apiFormat,
      format: apiCodec.format,
    };
  },
};