import type { WorkflowHandle, StepDefinition } from '../types.js';
import type { ValidationIssue } from '../validate/types.js';
import type { ValidationMode } from '../presets/types.js';
import { getWorkflow } from '../workflow/workflow.js';
import { getPreset } from '../presets/registry.js';
import { validateNode } from '../validate/node-validator.js';

export interface AddStepOptions {
  /** 校验模式，默认 'none'（不校验） */
  validate?: ValidationMode;
}

export function addStep(
  wf: WorkflowHandle,
  definition: StepDefinition,
  options?: AddStepOptions
): { id: string; workflowId: string; warnings?: ValidationIssue[] } {
  const workflow = getWorkflow(wf);
  if (!workflow) {
    throw new Error(`Workflow not found: ${wf.id}`);
  }
  if (workflow.steps.has(definition.id)) {
    throw new Error(`Step "${definition.id}" already exists in workflow "${wf.id}"`);
  }

  // 可选校验：遍历节点并校验
  const warnings: ValidationIssue[] = [];
  const mode = options?.validate ?? 'none';

  if (mode !== 'none') {
    for (const node of definition.nodes) {
      const preset = getPreset(node.type);
      if (preset) {
        const issues = validateNode(node, preset, mode);
        warnings.push(...issues);
      }
    }
  }

  workflow.steps.set(definition.id, definition);

  const result: { id: string; workflowId: string; warnings?: ValidationIssue[] } = {
    id: definition.id,
    workflowId: wf.id,
  };

  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return result;
}

export function updateStep(
  wf: WorkflowHandle,
  stepId: string,
  definition: StepDefinition
): void {
  const workflow = getWorkflow(wf);
  if (!workflow) {
    throw new Error(`Workflow not found: ${wf.id}`);
  }
  if (!workflow.steps.has(stepId)) {
    throw new Error(`Step "${stepId}" not found in workflow "${wf.id}"`);
  }
  workflow.steps.set(stepId, definition);
}

export function removeStep(wf: WorkflowHandle, stepId: string): void {
  const workflow = getWorkflow(wf);
  if (!workflow) {
    throw new Error(`Workflow not found: ${wf.id}`);
  }
  // 移除与该 Step 相关的跨 Step 连接
  workflow.crossLinks = workflow.crossLinks.filter(
    (link) => link.from.stepId !== stepId && link.to.stepId !== stepId
  );
  workflow.steps.delete(stepId);
}

export function getStep(
  wf: WorkflowHandle,
  stepId: string
): StepDefinition | null {
  const workflow = getWorkflow(wf);
  if (!workflow) return null;
  return workflow.steps.get(stepId) ?? null;
}
