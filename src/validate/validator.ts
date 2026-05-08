import type { ValidationResult, ValidationIssue } from './types.js';
import type { UnifiedWorkflow } from '../codecs/types.js';

export type { ValidationMode } from './types.js';

export interface ValidateWorkflowOptions {
  /** 节点校验模式 */
  nodeValidation?: 'none' | 'warn' | 'strict';
}

/**
 * 校验 UnifiedWorkflow 的完整性
 */
export function validateWorkflow(
  workflow: UnifiedWorkflow,
  _options?: ValidateWorkflowOptions
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // a. 完整性检查
  issues.push(...validateIntegrity(workflow));

  // b. 孤立节点检测
  issues.push(...validateOrphanNodes(workflow));

  // c. 循环依赖检测
  issues.push(...validateCycleDependencies(workflow));

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
  };
}

function validateIntegrity(wf: UnifiedWorkflow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [stepId, step] of wf.steps) {
    const nodeIds = new Set(step.nodes.map((n) => n.id));

    for (const link of step.internalLinks) {
      const [fromNodeId] = link.from;
      const [toNodeId] = link.to;

      if (!nodeIds.has(fromNodeId)) {
        issues.push({
          severity: 'error',
          message: `Internal link references non-existent source node "${fromNodeId}" in step "${stepId}"`,
          stepId,
          nodeId: fromNodeId,
          suggestion: `Add a node with id "${fromNodeId}" to step "${stepId}" or fix the link source.`,
        });
      }

      if (!nodeIds.has(toNodeId)) {
        issues.push({
          severity: 'error',
          message: `Internal link references non-existent target node "${toNodeId}" in step "${stepId}"`,
          stepId,
          nodeId: toNodeId,
          suggestion: `Add a node with id "${toNodeId}" to step "${stepId}" or fix the link target.`,
        });
      }
    }
  }

  for (const link of wf.crossLinks) {
    const fromStep = wf.steps.get(link.from.stepId);
    const toStep = wf.steps.get(link.to.stepId);

    if (!fromStep) {
      issues.push({
        severity: 'error',
        message: `Cross-step link references non-existent source step "${link.from.stepId}"`,
        stepId: link.from.stepId,
        suggestion: `Create step "${link.from.stepId}" or update the cross-link source.`,
      });
      continue;
    }

    if (!toStep) {
      issues.push({
        severity: 'error',
        message: `Cross-step link references non-existent target step "${link.to.stepId}"`,
        stepId: link.to.stepId,
        suggestion: `Create step "${link.to.stepId}" or update the cross-link target.`,
      });
      continue;
    }

    const fromPortExists = fromStep.outputs?.some((o) => o.id === link.from.portId) ?? false;
    if (!fromPortExists) {
      issues.push({
        severity: 'error',
        message: `Cross-step link references non-existent output port "${link.from.portId}" in step "${link.from.stepId}"`,
        stepId: link.from.stepId,
        suggestion: `Add output port "${link.from.portId}" to step "${link.from.stepId}" or fix the cross-link source port.`,
      });
    }

    const toPortExists = toStep.inputs?.some((i) => i.id === link.to.portId) ?? false;
    if (!toPortExists) {
      issues.push({
        severity: 'error',
        message: `Cross-step link references non-existent input port "${link.to.portId}" in step "${link.to.stepId}"`,
        stepId: link.to.stepId,
        suggestion: `Add input port "${link.to.portId}" to step "${link.to.stepId}" or fix the cross-link target port.`,
      });
    }
  }

  return issues;
}

function validateOrphanNodes(wf: UnifiedWorkflow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [stepId, step] of wf.steps) {
    const linkedNodeIds = new Set<string>();

    for (const link of step.internalLinks) {
      linkedNodeIds.add(link.from[0]);
      linkedNodeIds.add(link.to[0]);
    }

    // 被 outputs 引用的节点也不算孤立（如纯输出节点 CheckpointLoaderSimple）
    for (const output of step.outputs ?? []) {
      linkedNodeIds.add(output.source[0]);
    }

    for (const node of step.nodes) {
      if (!linkedNodeIds.has(node.id)) {
        issues.push({
          severity: 'warning',
          message: `Node "${node.id}" (${node.type}) in step "${stepId}" has no internal links`,
          stepId,
          nodeId: node.id,
          suggestion: 'Connect this node to other nodes within the step, or remove it if unused.',
        });
      }
    }
  }

  return issues;
}

function validateCycleDependencies(wf: UnifiedWorkflow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Build adjacency list from crossLinks
  const adj = new Map<string, string[]>();
  for (const stepId of wf.steps.keys()) {
    adj.set(stepId, []);
  }

  for (const link of wf.crossLinks) {
    const fromStepId = link.from.stepId;
    const toStepId = link.to.stepId;
    if (adj.has(fromStepId)) {
      adj.get(fromStepId)!.push(toStepId);
    }
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    for (const neighbor of adj.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart).concat(neighbor);
        issues.push({
          severity: 'error',
          message: `Circular dependency detected between steps: ${cycle.join(' -> ')}`,
          suggestion: 'Break the cycle by removing one of the cross-step links or restructuring the workflow.',
        });
        return true;
      }
    }

    path.pop();
    recStack.delete(node);
    return false;
  }

  for (const stepId of wf.steps.keys()) {
    if (!visited.has(stepId)) {
      dfs(stepId);
    }
  }

  return issues;
}
