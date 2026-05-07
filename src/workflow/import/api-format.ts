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
  ComfyAPINode,
  ComfyDataType,
} from '../../types.js';
import { getPreset } from '../../presets/registry.js';

/**
 * 从 API 格式导入工作流
 */
export function importFromAPIFormat(
  handle: WorkflowHandle,
  wf: Workflow,
  json: unknown,
  options?: ImportOptions
): ImportResult {
  const apiData = json as Record<string, ComfyAPINode>;
  const warnings: string[] = [];

  // API 格式无法获取位置信息，需要自动布局
  const stepId = options?.stepId ?? 'imported_api';
  const stepName = options?.stepName ?? 'Imported API';

  const nodes: StepNode[] = [];
  const internalLinks: InternalLink[] = [];

  // 用于收集外部连接
  const externalInputs = new Map<string, { inputName: string; sourceType: string }>();
  const externalOutputs = new Map<string, { slot: number; type: string; name: string }>();

  // 首先收集所有节点 ID
  const nodeIds = Object.keys(apiData);

  for (const [nodeId, apiNode] of Object.entries(apiData)) {
    const widgets: Record<string, unknown> = {};

    for (const [inputName, inputValue] of Object.entries(apiNode.inputs)) {
      if (Array.isArray(inputValue)) {
        // 连接引用 [nodeId, slot]
        const [sourceNodeId, slot] = inputValue;

        // 检查源节点是否存在
        if (nodeIds.includes(sourceNodeId)) {
          internalLinks.push({
            from: [sourceNodeId, slot],
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

  // 检测外部输出：哪些节点有输出但未被连接
  for (const [nodeId, apiNode] of Object.entries(apiData)) {
    const preset = getPreset(apiNode.class_type);
    if (preset && preset.outputs) {
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
  const inputPorts: StepInputPort[] = Array.from(externalInputs.entries()).map(
    ([key, info], i) => ({
      id: `input_${i}`,
      label: info.inputName,
      type: info.sourceType as ComfyDataType,
      target: [key.split(':')[0], info.inputName],
    })
  );

  const outputPorts: StepOutputPort[] = Array.from(externalOutputs.entries()).map(
    ([key, info], i) => ({
      id: `output_${i}`,
      label: info.name,
      type: info.type as ComfyDataType,
      source: [key.split(':')[0], info.slot],
    })
  );

  const stepDef: StepDefinition = {
    id: stepId,
    name: stepName,
    nodes,
    internalLinks,
    ...(inputPorts.length > 0 ? { inputs: inputPorts } : {}),
    ...(outputPorts.length > 0 ? { outputs: outputPorts } : {}),
  };

  wf.steps.set(stepId, stepDef);

  return {
    importedStepIds: [stepId],
    detectedFormat: 'api',
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}