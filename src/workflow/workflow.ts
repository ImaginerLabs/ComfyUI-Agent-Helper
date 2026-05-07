import type { Workflow, WorkflowSummary } from './types.js';
import type { WorkflowHandle, WorkflowOptions } from '../types.js';

const workflows = new Map<string, Workflow>();

export function createWorkflow(options?: WorkflowOptions): WorkflowHandle {
  const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const wf: Workflow = {
    id,
    name: options?.name,
    steps: new Map(),
    crossLinks: [],
  };
  workflows.set(id, wf);
  return { id };
}

export function getWorkflow(handle: WorkflowHandle): Workflow | undefined {
  return workflows.get(handle.id);
}

export function getWorkflowSummary(handle: WorkflowHandle): WorkflowSummary | null {
  const wf = workflows.get(handle.id);
  if (!wf) return null;

  return {
    id: wf.id,
    name: wf.name,
    steps: Array.from(wf.steps.values()).map((step) => ({
      id: step.id,
      name: step.name,
      nodeCount: step.nodes.length,
      inputPorts: step.inputs?.length ?? 0,
      outputPorts: step.outputs?.length ?? 0,
    })),
    crossLinkCount: wf.crossLinks.length,
  };
}

export function resetWorkflow(handle: WorkflowHandle): boolean {
  const wf = workflows.get(handle.id);
  if (!wf) return false;
  wf.steps.clear();
  wf.crossLinks = [];
  return true;
}
