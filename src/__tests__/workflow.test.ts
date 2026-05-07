import { describe, it, expect } from 'vitest';
import {
  createWorkflow,
  getWorkflowSummary,
  addStep,
  resetWorkflow,
} from '../index.js';

describe('Workflow 管理', () => {
  it('创建空 Workflow', () => {
    const wf = createWorkflow();
    expect(wf.id).toBeDefined();
    expect(typeof wf.id).toBe('string');

    const summary = getWorkflowSummary(wf);
    expect(summary).not.toBeNull();
    expect(summary!.steps).toHaveLength(0);
    expect(summary!.crossLinkCount).toBe(0);
  });

  it('创建带名称的 Workflow', () => {
    const wf = createWorkflow({ name: 'my-workflow' });
    const summary = getWorkflowSummary(wf);
    expect(summary!.name).toBe('my-workflow');
  });

  it('创建多个 Workflow 互不干扰', () => {
    const wf1 = createWorkflow();
    const wf2 = createWorkflow();
    expect(wf1.id).not.toBe(wf2.id);

    addStep(wf1, {
      id: 's1',
      name: 'S1',
      nodes: [{ id: 'n1', type: 'KSampler' }],
      internalLinks: [],
    });

    const summary1 = getWorkflowSummary(wf1);
    const summary2 = getWorkflowSummary(wf2);
    expect(summary1!.steps).toHaveLength(1);
    expect(summary2!.steps).toHaveLength(0);
  });

  it('获取不存在的 Workflow 摘要返回 null', () => {
    const summary = getWorkflowSummary({ id: 'non-existent' });
    expect(summary).toBeNull();
  });

  it('重置 Workflow 清空所有 Step 和连接', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 's1',
      name: 'S1',
      nodes: [{ id: 'n1', type: 'KSampler' }],
      internalLinks: [],
      outputs: [{ id: 'out', label: 'out', source: ['n1', 0] }],
    });

    const before = getWorkflowSummary(wf);
    expect(before!.steps).toHaveLength(1);

    const ok = resetWorkflow(wf);
    expect(ok).toBe(true);

    const after = getWorkflowSummary(wf);
    expect(after!.steps).toHaveLength(0);
    expect(after!.crossLinkCount).toBe(0);
  });

  it('重置不存在的 Workflow 返回 false', () => {
    const ok = resetWorkflow({ id: 'non-existent' });
    expect(ok).toBe(false);
  });

  it('Workflow 摘要正确统计节点和端口', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'load',
      name: '加载',
      nodes: [
        { id: 'ckpt', type: 'CheckpointLoaderSimple' },
        { id: 'lora', type: 'LoraLoader' },
      ],
      internalLinks: [],
      inputs: [{ id: 'in1', label: 'In', target: ['ckpt', 'ckpt_name'] }],
      outputs: [
        { id: 'model', label: 'MODEL', source: ['ckpt', 0] },
        { id: 'clip', label: 'CLIP', source: ['ckpt', 1] },
      ],
    });

    const summary = getWorkflowSummary(wf);
    expect(summary!.steps[0].nodeCount).toBe(2);
    expect(summary!.steps[0].inputPorts).toBe(1);
    expect(summary!.steps[0].outputPorts).toBe(2);
  });
});
