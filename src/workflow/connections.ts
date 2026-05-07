import type { WorkflowHandle } from '../types.js';
import { getWorkflow } from './workflow.js';

export function connectSteps(
  wf: WorkflowHandle,
  source: { stepId: string; portId: string },
  target: { stepId: string; portId: string }
): void {
  const workflow = getWorkflow(wf);
  if (!workflow) {
    throw new Error(
      `Workflow not found: "${wf.id}". Please create the workflow first using createWorkflow().`
    );
  }

  const sourceStep = workflow.steps.get(source.stepId);
  if (!sourceStep) {
    throw new Error(
      `Source step "${source.stepId}" not found in workflow "${wf.id}". ` +
        `Available steps: ${Array.from(workflow.steps.keys()).join(', ') || '(none)'}.`
    );
  }

  const targetStep = workflow.steps.get(target.stepId);
  if (!targetStep) {
    throw new Error(
      `Target step "${target.stepId}" not found in workflow "${wf.id}". ` +
        `Available steps: ${Array.from(workflow.steps.keys()).join(', ') || '(none)'}.`
    );
  }

  const sourcePortExists = sourceStep.outputs?.some((p) => p.id === source.portId) ?? false;
  if (!sourcePortExists) {
    throw new Error(
      `Source port "${source.portId}" not found on step "${source.stepId}". ` +
        `Available output ports: ${sourceStep.outputs?.map((p) => p.id).join(', ') || '(none)'}.`
    );
  }

  const targetPortExists = targetStep.inputs?.some((p) => p.id === target.portId) ?? false;
  if (!targetPortExists) {
    throw new Error(
      `Target port "${target.portId}" not found on step "${target.stepId}". ` +
        `Available input ports: ${targetStep.inputs?.map((p) => p.id).join(', ') || '(none)'}.`
    );
  }

  const alreadyExists = workflow.crossLinks.some(
    (link) =>
      link.from.stepId === source.stepId &&
      link.from.portId === source.portId &&
      link.to.stepId === target.stepId &&
      link.to.portId === target.portId
  );

  if (alreadyExists) {
    return;
  }

  workflow.crossLinks.push({
    from: { stepId: source.stepId, portId: source.portId },
    to: { stepId: target.stepId, portId: target.portId },
  });
}

export function disconnectSteps(
  wf: WorkflowHandle,
  source: { stepId: string; portId: string },
  target: { stepId: string; portId: string }
): void {
  const workflow = getWorkflow(wf);
  if (!workflow) {
    return;
  }

  workflow.crossLinks = workflow.crossLinks.filter(
    (link) =>
      !(
        link.from.stepId === source.stepId &&
        link.from.portId === source.portId &&
        link.to.stepId === target.stepId &&
        link.to.portId === target.portId
      )
  );
}
