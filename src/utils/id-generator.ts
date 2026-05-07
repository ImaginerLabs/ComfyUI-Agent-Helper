let counter = 0;

export function resetIdCounter(): void {
  counter = 0;
}

export function nextId(): number {
  return ++counter;
}

/**
 * 生成合法的 ComfyUI 节点全局 ID。
 * 结果只包含字母、数字、下划线和冒号。
 */
export function generateGlobalId(stepId: string, nodeId: string): string {
  const safeStepId = sanitizeId(stepId);
  const safeNodeId = sanitizeId(nodeId);
  return `${safeStepId}:${safeNodeId}`;
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_:-]/g, '_');
}

/**
 * 生成工作流 ID
 */
export function generateWorkflowId(): string {
  return `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
