import type { Workflow } from '../workflow/types.js';
import type { IDMapping } from './types.js';
import { generateGlobalId } from '../utils/id-generator.js';

export function buildIdMapping(workflow: Workflow): IDMapping {
  const mapping: IDMapping = new Map();

  for (const [stepId, step] of workflow.steps) {
    const stepMap = new Map<string, string>();
    for (const node of step.nodes) {
      stepMap.set(node.id, generateGlobalId(stepId, node.id));
    }
    mapping.set(stepId, stepMap);
  }

  return mapping;
}

export function resolveId(
  mapping: IDMapping,
  stepId: string,
  nodeId: string
): string | undefined {
  return mapping.get(stepId)?.get(nodeId);
}
