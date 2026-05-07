import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createWorkflow,
  addStep,
  compose,
  validateWorkflow,
  connectSteps,
} from '../../index.js';
import { registerPreset, getRegistry } from '../../presets/registry.js';
import type { NodePreset } from '../../presets/types.js';

// 测试用的预设节点
const ksamplerPreset: NodePreset = {
  type: 'TestKSampler',
  name: 'Test KSampler',
  description: 'Test KSampler for integration tests',
  category: 'sampling',
  inputs: [
    { name: 'model', type: 'MODEL', label: '模型' },
    { name: 'positive', type: 'CONDITIONING', label: '正向条件' },
    { name: 'negative', type: 'CONDITIONING', label: '负向条件' },
    { name: 'latent_image', type: 'LATENT', label: '潜空间图像' },
  ],
  widgets: [
    { name: 'seed', type: 'INT', label: '种子', default: 0 },
    { name: 'steps', type: 'INT', label: '步数', min: 1, max: 100, default: 20 },
    { name: 'cfg', type: 'FLOAT', label: 'CFG', min: 0, max: 20, default: 7 },
    {
      name: 'sampler_name',
      type: 'COMBO',
      label: '采样器',
      options: ['euler', 'euler_ancestral', 'dpmpp_2m'],
      default: 'euler',
    },
  ],
  outputs: [
    { name: 'output', type: 'LATENT', label: '输出', slotIndex: 0 },
  ],
};

const loaderPreset: NodePreset = {
  type: 'TestCheckpointLoader',
  name: 'Test Checkpoint Loader',
  description: 'Test checkpoint loader for integration tests',
  category: 'loaders',
  inputs: [],
  widgets: [
    { name: 'ckpt_name', type: 'STRING', label: '模型文件', required: true },
  ],
  outputs: [
    { name: 'MODEL', type: 'MODEL', label: '模型', slotIndex: 0 },
    { name: 'CLIP', type: 'CLIP', label: 'CLIP', slotIndex: 1 },
    { name: 'VAE', type: 'VAE', label: 'VAE', slotIndex: 2 },
  ],
};

const latentPreset: NodePreset = {
  type: 'TestEmptyLatent',
  name: 'Test Empty Latent',
  description: 'Test empty latent for integration tests',
  category: 'latent',
  inputs: [],
  widgets: [
    { name: 'width', type: 'INT', label: '宽度', min: 64, max: 4096, default: 512 },
    { name: 'height', type: 'INT', label: '高度', min: 64, max: 4096, default: 512 },
    { name: 'batch_size', type: 'INT', label: '批次大小', min: 1, default: 1 },
  ],
  outputs: [
    { name: 'LATENT', type: 'LATENT', label: '潜空间', slotIndex: 0 },
  ],
};

describe('预设节点集成测试', () => {
  beforeEach(() => {
    // 注册测试预设
    registerPreset(ksamplerPreset);
    registerPreset(loaderPreset);
    registerPreset(latentPreset);
  });

  afterEach(() => {
    // 清理测试预设
    const registry = getRegistry();
    registry.removePreset('TestKSampler');
    registry.removePreset('TestCheckpointLoader');
    registry.removePreset('TestEmptyLatent');
  });

  describe('addStep 带 validate 选项', () => {
    it('validate: "none" 不校验', () => {
      const wf = createWorkflow();

      const result = addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'sampler',
            type: 'TestKSampler',
            widgets: {
              seed: 42,
              steps: 20,
              cfg: 7,
              sampler_name: 'euler',
              // unknown_param 不会被检测
              unknown_param: 'value',
            },
          },
        ],
        internalLinks: [],
      }, { validate: 'none' });

      expect(result.warnings).toBeUndefined();
    });

    it('validate: "warn" 报告问题', () => {
      const wf = createWorkflow();

      const result = addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'sampler',
            type: 'TestKSampler',
            widgets: {
              seed: 42,
              steps: 200, // 超出 max: 100
              cfg: 7,
              sampler_name: 'euler',
            },
          },
        ],
        internalLinks: [],
      }, { validate: 'warn' });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.warnings!.some((w) => w.message.includes('大于最大值'))).toBe(true);
    });

    it('validate: "strict" 报告错误级别', () => {
      const wf = createWorkflow();

      const result = addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'loader',
            type: 'TestCheckpointLoader',
            widgets: {}, // 缺少必填的 ckpt_name
          },
        ],
        internalLinks: [],
      }, { validate: 'strict' });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.every((w) => w.severity === 'error')).toBe(true);
    });

    it('有效节点不产生警告', () => {
      const wf = createWorkflow();

      const result = addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'latent',
            type: 'TestEmptyLatent',
            widgets: { width: 512, height: 512, batch_size: 1 },
          },
        ],
        internalLinks: [],
      }, { validate: 'warn' });

      expect(result.warnings).toBeUndefined();
    });

    it('未知节点类型不校验', () => {
      const wf = createWorkflow();

      // 不应该抛出错误
      const result = addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'unknown',
            type: 'UnknownNodeType',
            widgets: { any: 'value' },
          },
        ],
        internalLinks: [],
      }, { validate: 'warn' });

      expect(result.warnings).toBeUndefined();
    });
  });

  describe('validateWorkflow 带 nodeValidation 选项', () => {
    it('nodeValidation: "none" 不校验节点', () => {
      const wf = createWorkflow();

      addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'sampler',
            type: 'TestKSampler',
            widgets: {
              steps: 500, // 超出范围
              sampler_name: 'invalid', // 无效选项
            },
          },
        ],
        internalLinks: [],
      });

      const result = validateWorkflow(wf.id, { nodeValidation: 'none' });

      // 不应有节点校验问题
      const nodeIssues = result.issues.filter(
        (i) => i.message.includes('Widget') || i.message.includes('步数')
      );
      expect(nodeIssues).toHaveLength(0);
    });

    it('nodeValidation: "warn" 报告节点问题', () => {
      const wf = createWorkflow();

      addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'sampler',
            type: 'TestKSampler',
            widgets: {
              steps: 500, // 超出范围
              sampler_name: 'invalid', // 无效选项
            },
          },
        ],
        internalLinks: [],
      });

      const result = validateWorkflow(wf.id, { nodeValidation: 'warn' });

      // 应有节点校验问题（warning 级别不影响 valid）
      const nodeIssues = result.issues.filter((i) =>
        i.message.includes('Widget') || i.message.includes('采样器')
      );
      expect(nodeIssues.length).toBeGreaterThan(0);
      expect(nodeIssues.every((i) => i.severity === 'warning')).toBe(true);
    });

    it('nodeValidation: "strict" 报告错误级别', () => {
      const wf = createWorkflow();

      addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'sampler',
            type: 'TestKSampler',
            widgets: {
              steps: 500,
            },
          },
        ],
        internalLinks: [],
      });

      const result = validateWorkflow(wf.id, { nodeValidation: 'strict' });

      const nodeIssues = result.issues.filter((i) => i.severity === 'error');
      expect(nodeIssues.length).toBeGreaterThan(0);
    });

    it('多种校验问题同时存在', () => {
      const wf = createWorkflow();

      addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'sampler',
            type: 'TestKSampler',
            widgets: { steps: 500, cfg: 100 }, // 都超出范围
          },
          { id: 'orphan', type: 'TestEmptyLatent' }, // 孤立节点
        ],
        internalLinks: [],
      });

      const result = validateWorkflow(wf.id, { nodeValidation: 'warn' });

      // 节点校验问题
      const widgetIssues = result.issues.filter((i) => i.message.includes('Widget'));
      expect(widgetIssues.length).toBeGreaterThan(0);

      // 孤立节点问题
      const orphanIssues = result.issues.filter((i) => i.message.includes('no internal links'));
      expect(orphanIssues.length).toBeGreaterThan(0);
    });
  });

  describe('compose 带 validateLinks 选项', () => {
    it('validateLinks: "none" 不校验连线类型', () => {
      const wf = createWorkflow();

      addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'loader',
            type: 'TestCheckpointLoader',
            widgets: { ckpt_name: 'test.safetensors' },
          },
          {
            id: 'sampler',
            type: 'TestKSampler',
            widgets: { seed: 1, steps: 20, cfg: 7, sampler_name: 'euler' },
          },
        ],
        // MODEL -> latent_image (类型不匹配: MODEL != LATENT)
        internalLinks: [{ from: ['loader', 0], to: ['sampler', 'latent_image'] }],
      });

      // 不应抛出错误
      const result = compose(wf.id, { validateLinks: 'none' });
      expect(result.apiFormat).toBeDefined();
      expect(result.warnings).toBeUndefined();
    });

    it('validateLinks: "warn" 报告连线类型问题', () => {
      const wf = createWorkflow();

      addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'loader',
            type: 'TestCheckpointLoader',
            widgets: { ckpt_name: 'test.safetensors' },
          },
          {
            id: 'sampler',
            type: 'TestKSampler',
            widgets: { seed: 1, steps: 20, cfg: 7, sampler_name: 'euler' },
          },
        ],
        // MODEL -> latent_image (类型不匹配)
        internalLinks: [{ from: ['loader', 0], to: ['sampler', 'latent_image'] }],
      });

      const result = compose(wf.id, { validateLinks: 'warn' });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some((w) => w.message.includes('类型不匹配'))).toBe(true);
    });

    it('validateLinks: "strict" 报告错误级别', () => {
      const wf = createWorkflow();

      addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'loader',
            type: 'TestCheckpointLoader',
            widgets: { ckpt_name: 'test.safetensors' },
          },
          {
            id: 'sampler',
            type: 'TestKSampler',
            widgets: { seed: 1, steps: 20, cfg: 7, sampler_name: 'euler' },
          },
        ],
        // MODEL -> latent_image (类型不匹配)
        internalLinks: [{ from: ['loader', 0], to: ['sampler', 'latent_image'] }],
      });

      const result = compose(wf.id, { validateLinks: 'strict' });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.every((w) => w.severity === 'error')).toBe(true);
    });

    it('连线类型匹配时无警告', () => {
      const wf = createWorkflow();

      addStep(wf, {
        id: 'step1',
        name: 'Step 1',
        nodes: [
          {
            id: 'latent',
            type: 'TestEmptyLatent',
            widgets: { width: 512, height: 512, batch_size: 1 },
          },
          {
            id: 'sampler',
            type: 'TestKSampler',
            widgets: { seed: 1, steps: 20, cfg: 7, sampler_name: 'euler' },
          },
        ],
        // LATENT -> latent_image (类型匹配)
        internalLinks: [{ from: ['latent', 0], to: ['sampler', 'latent_image'] }],
      });

      const result = compose(wf.id, { validateLinks: 'warn' });

      expect(result.warnings).toBeUndefined();
    });

    it('跨 Step 连线的类型校验', () => {
      const wf = createWorkflow();

      addStep(wf, {
        id: 'loader',
        name: 'Loader',
        nodes: [
          {
            id: 'ckpt',
            type: 'TestCheckpointLoader',
            widgets: { ckpt_name: 'test.safetensors' },
          },
        ],
        internalLinks: [],
        outputs: [
          { id: 'model', label: 'MODEL', type: 'MODEL', source: ['ckpt', 0] },
        ],
      });

      addStep(wf, {
        id: 'sampler',
        name: 'Sampler',
        nodes: [
          {
            id: 'ksampler',
            type: 'TestKSampler',
            widgets: { seed: 1, steps: 20, cfg: 7, sampler_name: 'euler' },
          },
          {
            id: 'latent',
            type: 'TestEmptyLatent',
            widgets: { width: 512, height: 512, batch_size: 1 },
          },
        ],
        internalLinks: [
          { from: ['latent', 0], to: ['ksampler', 'latent_image'] },
        ],
        inputs: [
          // 正确类型
          { id: 'model', label: 'MODEL', type: 'MODEL', target: ['ksampler', 'model'] },
        ],
        outputs: [],
      });

      // 正确类型的跨 Step 连接
      // 连接 MODEL -> MODEL
      const result = compose(wf.id, { validateLinks: 'warn' });

      // 因为没有连接 crossStep link，所以不会有警告
      expect(result.warnings).toBeUndefined();
    });

    it('跨 Step 连线类型不匹配', () => {
      const wf = createWorkflow();

      addStep(wf, {
        id: 'loader',
        name: 'Loader',
        nodes: [
          {
            id: 'ckpt',
            type: 'TestCheckpointLoader',
            widgets: { ckpt_name: 'test.safetensors' },
          },
        ],
        internalLinks: [],
        outputs: [
          // 输出 MODEL
          { id: 'vae', label: 'VAE', type: 'VAE', source: ['ckpt', 2] },
        ],
      });

      addStep(wf, {
        id: 'sampler',
        name: 'Sampler',
        nodes: [
          {
            id: 'ksampler',
            type: 'TestKSampler',
            widgets: { seed: 1, steps: 20, cfg: 7, sampler_name: 'euler' },
          },
        ],
        internalLinks: [],
        inputs: [
          // 期望 LATENT
          { id: 'latent', label: 'LATENT', type: 'LATENT', target: ['ksampler', 'latent_image'] },
        ],
        outputs: [],
      });

      // VAE -> LATENT (类型不匹配)
      connectSteps(wf, { stepId: 'loader', portId: 'vae' }, { stepId: 'sampler', portId: 'latent' });

      const result = compose(wf.id, { validateLinks: 'warn' });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some((w) => w.message.includes('类型不匹配'))).toBe(true);
    });
  });
});
