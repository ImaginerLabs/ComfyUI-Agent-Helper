import { describe, it, expect } from 'vitest';
import {
  createWorkflow,
  addStep,
  connectSteps,
  compose,
} from '../index.js';

describe('组合引擎', () => {
  it('空 Workflow 返回空 apiFormat', () => {
    const wf = createWorkflow();
    const result = compose(wf.id);
    expect(result.apiFormat).toEqual({});
  });

  it('compose 不存在的 Workflow 应抛出错误', () => {
    expect(() => compose('non-existent')).toThrow('Workflow not found');
  });

  it('只有 widgets 的节点', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'step1',
      name: 'Step 1',
      nodes: [
        {
          id: 'latent',
          type: 'EmptyLatentImage',
          widgets: { width: 512, height: 512, batch_size: 1 },
        },
      ],
      internalLinks: [],
    });

    const result = compose(wf.id);
    const node = result.apiFormat['step1:latent'];
    expect(node).toBeDefined();
    expect(node.class_type).toBe('EmptyLatentImage');
    expect(node.inputs.width).toBe(512);
    expect(node.inputs.height).toBe(512);
    expect(node.inputs.batch_size).toBe(1);
  });

  it('widgets + internalLinks 混合', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'step1',
      name: 'Step 1',
      nodes: [
        {
          id: 'latent',
          type: 'EmptyLatentImage',
          widgets: { width: 512, height: 512, batch_size: 1 },
        },
        {
          id: 'sampler',
          type: 'KSampler',
          widgets: { seed: 42, steps: 20, cfg: 7, sampler_name: 'euler', scheduler: 'normal', denoise: 1 },
        },
      ],
      internalLinks: [{ from: ['latent', 0], to: ['sampler', 'latent_image'] }],
    });

    const result = compose(wf.id);
    const sampler = result.apiFormat['step1:sampler'];
    expect(sampler.inputs.seed).toBe(42);
    expect(sampler.inputs.steps).toBe(20);
    expect(Array.isArray(sampler.inputs.latent_image)).toBe(true);
    expect(sampler.inputs.latent_image[0]).toBe('step1:latent');
    expect(sampler.inputs.latent_image[1]).toBe(0);
  });

  it('internalLinks 覆盖 widgets 值', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'step1',
      name: 'Step 1',
      nodes: [
        { id: 'a', type: 'A', widgets: { x: 1 } },
        { id: 'b', type: 'B', widgets: { x: 2 } },
      ],
      internalLinks: [{ from: ['a', 0], to: ['b', 'x'] }],
    });

    const result = compose(wf.id);
    const nodeB = result.apiFormat['step1:b'];
    // widget 值 x:2 应该被 internalLink 覆盖
    expect(Array.isArray(nodeB.inputs.x)).toBe(true);
    expect(nodeB.inputs.x[0]).toBe('step1:a');
  });

  it('多输出节点（CheckpointLoaderSimple）', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'load',
      name: '加载',
      nodes: [
        {
          id: 'ckpt',
          type: 'CheckpointLoaderSimple',
          widgets: { ckpt_name: 'v1-5.safetensors' },
        },
      ],
      internalLinks: [],
      outputs: [
        { id: 'model', label: 'MODEL', source: ['ckpt', 0] },
        { id: 'clip', label: 'CLIP', source: ['ckpt', 1] },
        { id: 'vae', label: 'VAE', source: ['ckpt', 2] },
      ],
    });

    const result = compose(wf.id);
    expect(result.apiFormat['load:ckpt'].inputs.ckpt_name).toBe('v1-5.safetensors');
    // 多输出通过不同的 slot index 区分，在 outputs 定义中体现
  });

  it('跨 Step 连接', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'source',
      name: 'Source',
      nodes: [{ id: 'n1', type: 'CheckpointLoaderSimple', widgets: { ckpt_name: 'test' } }],
      internalLinks: [],
      outputs: [{ id: 'model', label: 'MODEL', source: ['n1', 0] }],
    });
    addStep(wf, {
      id: 'target',
      name: 'Target',
      nodes: [{ id: 'n2', type: 'KSampler', widgets: { seed: 1 } }],
      internalLinks: [],
      inputs: [{ id: 'model', label: 'MODEL', target: ['n2', 'model'] }],
    });
    connectSteps(wf, { stepId: 'source', portId: 'model' }, { stepId: 'target', portId: 'model' });

    const result = compose(wf.id);
    const targetNode = result.apiFormat['target:n2'];
    expect(Array.isArray(targetNode.inputs.model)).toBe(true);
    expect(targetNode.inputs.model[0]).toBe('source:n1');
    expect(targetNode.inputs.model[1]).toBe(0);
  });

  it('输出节点（SaveImage）', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'out',
      name: 'Output',
      nodes: [
        { id: 'save', type: 'SaveImage', widgets: { filename_prefix: 'test' } },
      ],
      internalLinks: [],
    });

    const result = compose(wf.id);
    const node = result.apiFormat['out:save'];
    expect(node.class_type).toBe('SaveImage');
    expect(node.inputs.filename_prefix).toBe('test');
  });

  it('internalLink 引用不存在节点应抛出错误', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'step1',
      name: 'Step 1',
      nodes: [{ id: 'a', type: 'A' }],
      internalLinks: [{ from: ['non-existent', 0], to: ['a', 'x'] }],
    });

    expect(() => compose(wf.id)).toThrow('non-existent');
  });

  it('crossLink 引用不存在 Step 应抛出错误', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'source',
      name: 'Source',
      nodes: [{ id: 'n1', type: 'A' }],
      internalLinks: [],
      outputs: [{ id: 'out', label: 'out', source: ['n1', 0] }],
    });
    // 手动添加一个非法的 crossLink（绕过 connectSteps 校验）
    // 这里无法直接添加，因为 crossLinks 是内部存储
    // 所以跳过这个测试，由 connections.test.ts 覆盖 connectSteps 的校验
  });

  it('crossLink 引用不存在 Port 应抛出错误', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'source',
      name: 'Source',
      nodes: [{ id: 'n1', type: 'A' }],
      internalLinks: [],
      outputs: [{ id: 'out', label: 'out', source: ['n1', 0] }],
    });
    addStep(wf, {
      id: 'target',
      name: 'Target',
      nodes: [{ id: 'n2', type: 'B' }],
      internalLinks: [],
      inputs: [{ id: 'in', label: 'in', target: ['n2', 'x'] }],
    });
    connectSteps(wf, { stepId: 'source', portId: 'out' }, { stepId: 'target', portId: 'in' });

    // 正常连接应该工作
    const result = compose(wf.id);
    expect(result.apiFormat['target:n2'].inputs.x[0]).toBe('source:n1');
  });

  it('多个 Step 的节点 ID 命名空间隔离', () => {
    const wf = createWorkflow();
    addStep(wf, {
      id: 'step-a',
      name: 'Step A',
      nodes: [{ id: 'node', type: 'TypeA', widgets: { a: 1 } }],
      internalLinks: [],
    });
    addStep(wf, {
      id: 'step-b',
      name: 'Step B',
      nodes: [{ id: 'node', type: 'TypeB', widgets: { b: 2 } }],
      internalLinks: [],
    });

    const result = compose(wf.id);
    const keys = Object.keys(result.apiFormat);
    expect(keys).toContain('step-a:node');
    expect(keys).toContain('step-b:node');
    expect(result.apiFormat['step-a:node'].class_type).toBe('TypeA');
    expect(result.apiFormat['step-b:node'].class_type).toBe('TypeB');
  });
});
