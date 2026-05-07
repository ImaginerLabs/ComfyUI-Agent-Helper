import { describe, it, expect } from 'vitest';
import {
  createWorkflow,
  addStep,
  connectSteps,
  compose,
  validateWorkflow,
  getWorkflowSummary,
} from '../index.js';

describe('ComfyUI Agent Helper — 端到端集成测试', () => {
  it('完整 SDXL 文生图工作流', () => {
    // 1. 创建工作流
    const wf = createWorkflow({ name: 'sdxl-txt2img' });
    expect(wf.id).toBeDefined();

    // 2. Step 1: 加载模型
    addStep(wf, {
      id: 'load-models',
      name: '加载模型',
      description: '加载 SDXL checkpoint 模型',
      nodes: [
        {
          id: 'checkpoint',
          type: 'CheckpointLoaderSimple',
          widgets: { ckpt_name: 'sd_xl_base_1.0.safetensors' },
          title: 'SDXL Checkpoint',
        },
      ],
      internalLinks: [],
      outputs: [
        { id: 'model', label: 'MODEL', type: 'MODEL', source: ['checkpoint', 0] },
        { id: 'clip', label: 'CLIP', type: 'CLIP', source: ['checkpoint', 1] },
        { id: 'vae', label: 'VAE', type: 'VAE', source: ['checkpoint', 2] },
      ],
    });

    // 3. Step 2: 提示词编码
    addStep(wf, {
      id: 'encode-prompts',
      name: '提示词编码',
      description: '使用 CLIP 编码正反向提示词',
      nodes: [
        {
          id: 'clip_source',
          type: 'CLIPSetLastLayer',
          widgets: { stop_at_clip_layer: -1 },
          title: 'CLIP 分发',
        },
        {
          id: 'positive',
          type: 'CLIPTextEncode',
          widgets: { text: 'a beautiful landscape, high quality' },
          title: '正向提示词',
        },
        {
          id: 'negative',
          type: 'CLIPTextEncode',
          widgets: { text: 'blur, low quality' },
          title: '反向提示词',
        },
      ],
      internalLinks: [
        { from: ['clip_source', 0], to: ['positive', 'clip'] },
        { from: ['clip_source', 0], to: ['negative', 'clip'] },
      ],
      inputs: [
        { id: 'clip', label: 'CLIP', type: 'CLIP', target: ['clip_source', 'clip'] },
      ],
      outputs: [
        { id: 'positive_cond', label: 'Positive', type: 'CONDITIONING', source: ['positive', 0] },
        { id: 'negative_cond', label: 'Negative', type: 'CONDITIONING', source: ['negative', 0] },
      ],
    });

    // 4. Step 3: 采样与输出
    addStep(wf, {
      id: 'sample-output',
      name: '采样与输出',
      description: 'KSampler 采样 → VAE 解码 → 保存图像',
      nodes: [
        {
          id: 'latent',
          type: 'EmptyLatentImage',
          widgets: { width: 1024, height: 1024, batch_size: 1 },
        },
        {
          id: 'sampler',
          type: 'KSampler',
          widgets: {
            seed: 42,
            steps: 20,
            cfg: 7,
            sampler_name: 'dpmpp_2m_sde',
            scheduler: 'karras',
            denoise: 1,
          },
        },
        { id: 'vae_decode', type: 'VAEDecode', widgets: {} },
        { id: 'save', type: 'SaveImage', widgets: { filename_prefix: 'ComfyUI' } },
      ],
      internalLinks: [
        { from: ['latent', 0], to: ['sampler', 'latent_image'] },
        { from: ['sampler', 0], to: ['vae_decode', 'samples'] },
        { from: ['vae_decode', 0], to: ['save', 'images'] },
      ],
      inputs: [
        { id: 'model', label: 'MODEL', type: 'MODEL', target: ['sampler', 'model'] },
        { id: 'positive', label: 'Positive', type: 'CONDITIONING', target: ['sampler', 'positive'] },
        { id: 'negative', label: 'Negative', type: 'CONDITIONING', target: ['sampler', 'negative'] },
        { id: 'vae', label: 'VAE', type: 'VAE', target: ['vae_decode', 'vae'] },
      ],
    });

    // 5. 跨 Step 连接
    connectSteps(wf, { stepId: 'load-models', portId: 'model' }, { stepId: 'sample-output', portId: 'model' });
    connectSteps(wf, { stepId: 'load-models', portId: 'vae' }, { stepId: 'sample-output', portId: 'vae' });
    connectSteps(wf, { stepId: 'load-models', portId: 'clip' }, { stepId: 'encode-prompts', portId: 'clip' });
    connectSteps(wf, { stepId: 'encode-prompts', portId: 'positive_cond' }, { stepId: 'sample-output', portId: 'positive' });
    connectSteps(wf, { stepId: 'encode-prompts', portId: 'negative_cond' }, { stepId: 'sample-output', portId: 'negative' });

    // 6. 验证 Workflow 摘要
    const summary = getWorkflowSummary(wf);
    expect(summary).not.toBeNull();
    expect(summary!.steps).toHaveLength(3);
    expect(summary!.crossLinkCount).toBe(5);

    // 7. 验证校验通过
    const validation = validateWorkflow(wf.id);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);

    // 8. 组合生成 API 格式
    const result = compose(wf.id);
    expect(result.apiFormat).toBeDefined();

    const api = result.apiFormat;
    const nodeIds = Object.keys(api);
    expect(nodeIds.length).toBe(8); // 3 steps, 8 nodes total

    // 验证 ID 命名空间：节点 ID 应包含 step 前缀
    expect(nodeIds.some((id) => id.startsWith('load-models:'))).toBe(true);
    expect(nodeIds.some((id) => id.startsWith('encode-prompts:'))).toBe(true);
    expect(nodeIds.some((id) => id.startsWith('sample-output:'))).toBe(true);

    // 验证 CheckpointLoaderSimple 节点
    const checkpointNode = Object.entries(api).find(([, n]) => n.class_type === 'CheckpointLoaderSimple');
    expect(checkpointNode).toBeDefined();
    expect(checkpointNode![1].inputs.ckpt_name).toBe('sd_xl_base_1.0.safetensors');

    // 验证 KSampler 节点的输入包含连线引用
    const samplerNode = Object.entries(api).find(([, n]) => n.class_type === 'KSampler');
    expect(samplerNode).toBeDefined();
    const samplerInputs = samplerNode![1].inputs;

    // model 输入应来自 load-models:checkpoint 的输出 slot 0
    expect(Array.isArray(samplerInputs.model)).toBe(true);
    expect(samplerInputs.model[1]).toBe(0); // slot index

    // positive 输入应来自 encode-prompts:positive 的输出 slot 0
    expect(Array.isArray(samplerInputs.positive)).toBe(true);
    expect(samplerInputs.positive[1]).toBe(0);

    // negative 输入应来自 encode-prompts:negative 的输出 slot 0
    expect(Array.isArray(samplerInputs.negative)).toBe(true);
    expect(samplerInputs.negative[1]).toBe(0);

    // latent_image 输入应来自内部连线的 sample-output:latent
    expect(Array.isArray(samplerInputs.latent_image)).toBe(true);

    // 验证 VAEDecode 的 vae 输入来自跨 Step 连线
    const vaeDecodeNode = Object.entries(api).find(([, n]) => n.class_type === 'VAEDecode');
    expect(vaeDecodeNode).toBeDefined();
    expect(Array.isArray(vaeDecodeNode![1].inputs.vae)).toBe(true);
  });

  it('校验应发现孤立节点', () => {
    const wf = createWorkflow();

    addStep(wf, {
      id: 'step1',
      name: '测试 Step',
      nodes: [
        { id: 'node1', type: 'KSampler', widgets: { seed: 1 } },
        { id: 'orphan', type: 'EmptyLatentImage', widgets: { width: 512 } },
      ],
      internalLinks: [],
      outputs: [],
    });

    const validation = validateWorkflow(wf.id);
    expect(validation.valid).toBe(true); // warning 不影响 valid
    expect(validation.issues.some((i) => i.severity === 'warning' && i.nodeId === 'orphan')).toBe(true);
  });

  it('校验应发现循环依赖', () => {
    const wf = createWorkflow();

    addStep(wf, {
      id: 'a',
      name: 'Step A',
      nodes: [{ id: 'n1', type: 'KSampler' }],
      internalLinks: [],
      outputs: [{ id: 'out', label: 'out', source: ['n1', 0] }],
      inputs: [{ id: 'in', label: 'in', target: ['n1', 'model'] }],
    });

    addStep(wf, {
      id: 'b',
      name: 'Step B',
      nodes: [{ id: 'n2', type: 'KSampler' }],
      internalLinks: [],
      outputs: [{ id: 'out', label: 'out', source: ['n2', 0] }],
      inputs: [{ id: 'in', label: 'in', target: ['n2', 'model'] }],
    });

    // a -> b -> a 形成环
    connectSteps(wf, { stepId: 'a', portId: 'out' }, { stepId: 'b', portId: 'in' });
    connectSteps(wf, { stepId: 'b', portId: 'out' }, { stepId: 'a', portId: 'in' });

    const validation = validateWorkflow(wf.id);
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((i) => i.severity === 'error' && i.message.includes('Circular'))).toBe(true);
  });

  it('connectSteps 幂等性', () => {
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

    // 第一次连接
    connectSteps(wf, { stepId: 's1', portId: 'out' }, { stepId: 's2', portId: 'in' });
    // 第二次连接（幂等）
    connectSteps(wf, { stepId: 's1', portId: 'out' }, { stepId: 's2', portId: 'in' });

    const summary = getWorkflowSummary(wf);
    expect(summary!.crossLinkCount).toBe(1);
  });
});
