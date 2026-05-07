import { describe, it, expect } from 'vitest';
import {
  createWorkflow,
  addStep,
  connectSteps,
  disconnectSteps,
  getWorkflowSummary,
} from '../index.js';

describe('跨 Step 连接', () => {
  function createTwoSteps() {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'source',
      name: 'Source',
      nodes: [{ id: 'n1', type: 'CheckpointLoaderSimple' }],
      internalLinks: [],
      outputs: [
        { id: 'model', label: 'MODEL', type: 'MODEL', source: ['n1', 0] },
        { id: 'clip', label: 'CLIP', type: 'CLIP', source: ['n1', 1] },
      ],
    });
    addStep(wf, {
      id: 'target',
      name: 'Target',
      nodes: [{ id: 'n2', type: 'KSampler' }],
      internalLinks: [],
      inputs: [
        { id: 'model', label: 'MODEL', type: 'MODEL', target: ['n2', 'model'] },
        { id: 'positive', label: 'Positive', type: 'CONDITIONING', target: ['n2', 'positive'] },
      ],
    });
    return wf;
  }

  it('正常连接两个 Step', () => {
    const wf = createTwoSteps();
    connectSteps(
      wf,
      { stepId: 'source', portId: 'model' },
      { stepId: 'target', portId: 'model' }
    );

    const summary = getWorkflowSummary(wf);
    expect(summary!.crossLinkCount).toBe(1);
  });

  it('connectSteps 幂等性', () => {
    const wf = createTwoSteps();
    connectSteps(
      wf,
      { stepId: 'source', portId: 'model' },
      { stepId: 'target', portId: 'model' }
    );
    connectSteps(
      wf,
      { stepId: 'source', portId: 'model' },
      { stepId: 'target', portId: 'model' }
    );

    const summary = getWorkflowSummary(wf);
    expect(summary!.crossLinkCount).toBe(1);
  });

  it('多个连接同时存在', () => {
    const wf = createTwoSteps();
    connectSteps(
      wf,
      { stepId: 'source', portId: 'model' },
      { stepId: 'target', portId: 'model' }
    );
    // 同一 source Step 的不同输出端口可以分别连接
    // 但这里 target 只有一个输入端口已被占用
    // 让我们用另一个 target Step
    addStep(wf, {
      id: 'target2',
      name: 'Target 2',
      nodes: [{ id: 'n3', type: 'CLIPTextEncode' }],
      internalLinks: [],
      inputs: [{ id: 'clip', label: 'CLIP', type: 'CLIP', target: ['n3', 'clip'] }],
    });
    connectSteps(
      wf,
      { stepId: 'source', portId: 'clip' },
      { stepId: 'target2', portId: 'clip' }
    );

    const summary = getWorkflowSummary(wf);
    expect(summary!.crossLinkCount).toBe(2);
  });

  it('disconnectSteps 移除连接', () => {
    const wf = createTwoSteps();
    connectSteps(
      wf,
      { stepId: 'source', portId: 'model' },
      { stepId: 'target', portId: 'model' }
    );
    expect(getWorkflowSummary(wf)!.crossLinkCount).toBe(1);

    disconnectSteps(
      wf,
      { stepId: 'source', portId: 'model' },
      { stepId: 'target', portId: 'model' }
    );
    expect(getWorkflowSummary(wf)!.crossLinkCount).toBe(0);
  });

  it('disconnectSteps 对不存在的连接静默通过', () => {
    const wf = createTwoSteps();
    expect(() =>
      disconnectSteps(
        wf,
        { stepId: 'source', portId: 'model' },
        { stepId: 'target', portId: 'model' }
      )
    ).not.toThrow();
  });

  it('connectSteps 到不存在的 source Step 应抛出错误', () => {
    const wf = createTwoSteps();
    expect(() =>
      connectSteps(
        wf,
        { stepId: 'non-existent', portId: 'model' },
        { stepId: 'target', portId: 'model' }
      )
    ).toThrow('non-existent');
  });

  it('connectSteps 到不存在的 target Step 应抛出错误', () => {
    const wf = createTwoSteps();
    expect(() =>
      connectSteps(
        wf,
        { stepId: 'source', portId: 'model' },
        { stepId: 'non-existent', portId: 'model' }
      )
    ).toThrow('non-existent');
  });

  it('connectSteps 到不存在的 source port 应抛出错误', () => {
    const wf = createTwoSteps();
    expect(() =>
      connectSteps(
        wf,
        { stepId: 'source', portId: 'non-existent' },
        { stepId: 'target', portId: 'model' }
      )
    ).toThrow('non-existent');
  });

  it('connectSteps 到不存在的 target port 应抛出错误', () => {
    const wf = createTwoSteps();
    expect(() =>
      connectSteps(
        wf,
        { stepId: 'source', portId: 'model' },
        { stepId: 'target', portId: 'non-existent' }
      )
    ).toThrow('non-existent');
  });

  it('connectSteps 到没有 outputs 的 Step 应抛出错误', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'no-output',
      name: 'No Output',
      nodes: [{ id: 'n1', type: 'SaveImage' }],
      internalLinks: [],
    });
    addStep(wf, {
      id: 'target',
      name: 'Target',
      nodes: [{ id: 'n2', type: 'KSampler' }],
      internalLinks: [],
      inputs: [{ id: 'model', label: 'MODEL', type: 'MODEL', target: ['n2', 'model'] }],
    });

    expect(() =>
      connectSteps(
        wf,
        { stepId: 'no-output', portId: 'anything' },
        { stepId: 'target', portId: 'model' }
      )
    ).toThrow();
  });

  it('disconnectSteps 对不存在的 Workflow 静默通过', () => {
    expect(() =>
      disconnectSteps(
        { id: 'non-existent' },
        { stepId: 'a', portId: 'out' },
        { stepId: 'b', portId: 'in' }
      )
    ).not.toThrow();
  });
});
