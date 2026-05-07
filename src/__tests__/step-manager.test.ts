import { describe, it, expect } from 'vitest';
import {
  createWorkflow,
  addStep,
  updateStep,
  removeStep,
  getStep,
  connectSteps,
  getWorkflowSummary,
} from '../index.js';

describe('Step 管理', () => {
  it('添加 Step 到 Workflow', () => {
    const wf = createWorkflow();
    const handle = addStep(wf, {
      id: 's1',
      name: 'Step 1',
      nodes: [{ id: 'n1', type: 'KSampler' }],
      internalLinks: [],
    });

    expect(handle.id).toBe('s1');
    expect(handle.workflowId).toBe(wf.id);

    const summary = getWorkflowSummary(wf);
    expect(summary!.steps).toHaveLength(1);
  });

  it('添加重复 ID 的 Step 应抛出错误', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 's1',
      name: 'Step 1',
      nodes: [{ id: 'n1', type: 'KSampler' }],
      internalLinks: [],
    });

    expect(() =>
      addStep(wf, {
        id: 's1',
        name: 'Duplicate',
        nodes: [{ id: 'n2', type: 'KSampler' }],
        internalLinks: [],
      })
    ).toThrow('already exists');
  });

  it('添加 Step 到不存在的 Workflow 应抛出错误', () => {
    expect(() =>
      addStep(
        { id: 'non-existent' },
        {
          id: 's1',
          name: 'Step 1',
          nodes: [{ id: 'n1', type: 'KSampler' }],
          internalLinks: [],
        }
      )
    ).toThrow('Workflow not found');
  });

  it('更新已存在的 Step', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 's1',
      name: 'Old Name',
      nodes: [{ id: 'n1', type: 'KSampler' }],
      internalLinks: [],
    });

    updateStep(wf, 's1', {
      id: 's1',
      name: 'New Name',
      nodes: [
        { id: 'n1', type: 'KSampler' },
        { id: 'n2', type: 'EmptyLatentImage' },
      ],
      internalLinks: [],
    });

    const step = getStep(wf, 's1');
    expect(step).not.toBeNull();
    expect(step!.name).toBe('New Name');
    expect(step!.nodes).toHaveLength(2);
  });

  it('更新不存在的 Step 应抛出错误', () => {
    const wf = createWorkflow();
    expect(() =>
      updateStep(wf, 'non-existent', {
        id: 'non-existent',
        name: 'X',
        nodes: [],
        internalLinks: [],
      })
    ).toThrow('not found');
  });

  it('移除 Step 并从 Workflow 中删除', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 's1',
      name: 'Step 1',
      nodes: [{ id: 'n1', type: 'KSampler' }],
      internalLinks: [],
    });

    removeStep(wf, 's1');
    expect(getStep(wf, 's1')).toBeNull();
    expect(getWorkflowSummary(wf)!.steps).toHaveLength(0);
  });

  it('移除 Step 同时清除相关跨 Step 连接', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 's1',
      name: 'S1',
      nodes: [{ id: 'n1', type: 'KSampler' }],
      internalLinks: [],
      outputs: [{ id: 'out', label: 'out', source: ['n1', 0] }],
    });
    addStep(wf, {
      id: 's2',
      name: 'S2',
      nodes: [{ id: 'n2', type: 'KSampler' }],
      internalLinks: [],
      inputs: [{ id: 'in', label: 'in', target: ['n2', 'model'] }],
    });
    connectSteps(wf, { stepId: 's1', portId: 'out' }, { stepId: 's2', portId: 'in' });

    expect(getWorkflowSummary(wf)!.crossLinkCount).toBe(1);

    removeStep(wf, 's1');
    expect(getWorkflowSummary(wf)!.crossLinkCount).toBe(0);
  });

  it('移除不存在的 Step 静默通过', () => {
    const wf = createWorkflow();
    expect(() => removeStep(wf, 'non-existent')).not.toThrow();
  });

  it('获取不存在的 Step 返回 null', () => {
    const wf = createWorkflow();
    expect(getStep(wf, 'non-existent')).toBeNull();
  });

  it('获取不存在的 Workflow 中的 Step 返回 null', () => {
    expect(getStep({ id: 'non-existent' }, 's1')).toBeNull();
  });

  it('空 Step（无节点）可以添加', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'empty',
      name: 'Empty Step',
      nodes: [],
      internalLinks: [],
    });

    const step = getStep(wf, 'empty');
    expect(step).not.toBeNull();
    expect(step!.nodes).toHaveLength(0);
  });
});
