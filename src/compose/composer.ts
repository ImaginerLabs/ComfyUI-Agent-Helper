import type { ComfyUIWorkflow, ComfyAPINode } from '../types.js';
import type { ValidationMode } from '../presets/types.js';
import type { ValidationIssue } from '../validate/types.js';
import { getWorkflow } from '../workflow/workflow.js';
import { getPreset } from '../presets/registry.js';
import { validateInputType } from '../validate/node-validator.js';
import { buildIdMapping, resolveId } from './id-resolver.js';

export interface ComposeOptions {
  /** 连线类型校验模式 */
  validateLinks?: ValidationMode;
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

  const mapping = buildIdMapping(wf);
  const apiFormat: Record<string, ComfyAPINode> = {};
  const warnings: ValidationIssue[] = [];
  const linkMode = options?.validateLinks ?? 'none';

  // 1. 收集所有节点：widgets → inputs
  for (const [stepId, step] of wf.steps) {
    for (const node of step.nodes) {
      const globalId = resolveId(mapping, stepId, node.id);
      if (!globalId) {
        throw new Error(
          `Failed to resolve global ID for node "${node.id}" in step "${stepId}"`
        );
      }

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
  for (const [stepId, step] of wf.steps) {
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
    }
  }

  // 3. 处理跨 Step 连线
  for (const crossLink of wf.crossLinks) {
    const fromStep = wf.steps.get(crossLink.from.stepId);
    const toStep = wf.steps.get(crossLink.to.stepId);

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
  }

  const result: ComposeResult = { apiFormat };
  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return result;
}
