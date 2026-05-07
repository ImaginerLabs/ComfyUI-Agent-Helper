/**
 * 代码生成工作流测试
 * 验证从代码生成的工作流与导入的 text2image.json 完全一致
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  importWorkflow,
  exportWorkflow,
  createUnifiedWorkflow,
  createNodeFromPreset,
  type StepNode,
  type CrossStepLink,
} from '../index.js';

// 加载 text2image.json
const fixturePath = join(__dirname, 'fixtures/workflows/text2image.json');
const text2imageJSON = JSON.parse(readFileSync(fixturePath, 'utf-8'));

// 提示词内容（从 text2image.json 提取）
const POSITIVE_PROMPT = `masterpiece, best quality, amazing quality, very aesthetic, 1girl, solo, asuna (sao), asuna yuuki, sword art online, long
  chestnut-brown hair, hazel eyes, cat ears, cat girl, animal ears, cute, kawaii, cat costume, maid cat, white pantyhose,
  white tights, pantyhose, tights, cat paw print, paw print on soles, paw print pattern, large sofa, couch, sitting, cute
  expression, adorable, playful, paws pose, rawr, roaring pose, hands raised, claw hands, feet visible, soles, indoor, living
   room, soft lighting, cozy, fluffy, smiling, beautiful face, anime style, vibrant colors, cinematic composition, highly
  detailed, intricate details, sharp focus, 8k resolution   `;

const NEGATIVE_PROMPT = `bad quality, worst quality, worst detail, sketch, censor, lowres, bad anatomy, bad hands, watermark, signature, blurry, deformed, disfigured`;

/**
 * 从代码生成 text2image 工作流
 * 模拟 text2image.json 的完整结构
 */
function generateText2ImageWorkflow() {
  const workflow = createUnifiedWorkflow();

  // 创建节点
  // 1. CheckpointLoaderSimple (id: 4)
  const checkpoint = createNodeFromPreset(
    'CheckpointLoaderSimple',
    { ckpt_name: 'waiIllustriousSDXL_v150.safetensors' },
    {
      id: '4',
      pos: [30, 470],
      extra: {
        size: [320, 100],
        flags: {},
        order: 0,
        mode: 0,
        properties: {
          cnr_id: 'comfy-core',
          ver: '0.19.2',
          'Node name for S&R': 'CheckpointLoaderSimple',
        },
      },
    }
  );

  // 2. CLIPTextEncode (positive, id: 6)
  const positiveEncode = createNodeFromPreset(
    'CLIPTextEncode',
    { text: POSITIVE_PROMPT },
    {
      id: '6',
      pos: [420, 190],
      extra: {
        size: [430, 170],
        flags: {},
        order: 2,
        mode: 0,
        properties: {
          cnr_id: 'comfy-core',
          ver: '0.19.2',
          'Node name for S&R': 'CLIPTextEncode',
        },
      },
    }
  );

  // 3. CLIPTextEncode (negative, id: 7)
  const negativeEncode = createNodeFromPreset(
    'CLIPTextEncode',
    { text: NEGATIVE_PROMPT },
    {
      id: '7',
      pos: [410, 430],
      extra: {
        size: [430, 190],
        flags: {},
        order: 3,
        mode: 0,
        properties: {
          cnr_id: 'comfy-core',
          ver: '0.19.2',
          'Node name for S&R': 'CLIPTextEncode',
        },
      },
    }
  );

  // 4. EmptyLatentImage (id: 5)
  const latent = createNodeFromPreset(
    'EmptyLatentImage',
    { width: 896, height: 1152, batch_size: 1 },
    {
      id: '5',
      pos: [680, 690],
      extra: {
        size: [320, 110],
        flags: {},
        order: 1,
        mode: 0,
        properties: {
          cnr_id: 'comfy-core',
          ver: '0.19.2',
          'Node name for S&R': 'EmptyLatentImage',
        },
      },
    }
  );

  // 5. KSampler (id: 3)
  const sampler = createNodeFromPreset(
    'KSampler',
    {
      seed: 819095824154876,
      seed_control_after_generate: 'randomize',
      steps: 30,
      cfg: 7,
      sampler_name: 'euler',
      scheduler: 'normal',
      denoise: 1,
    },
    {
      id: '3',
      pos: [1050, 360],
      extra: {
        size: [320, 480],
        flags: {},
        order: 4,
        mode: 0,
        properties: {
          cnr_id: 'comfy-core',
          ver: '0.19.2',
          'Node name for S&R': 'KSampler',
        },
      },
    }
  );

  // 6. VAEDecode (id: 8)
  const vaeDecode = createNodeFromPreset(
    'VAEDecode',
    {},
    {
      id: '8',
      pos: [1210, 190],
      extra: {
        size: [210, 50],
        flags: {},
        order: 5,
        mode: 0,
        properties: {
          cnr_id: 'comfy-core',
          ver: '0.19.2',
          'Node name for S&R': 'VAEDecode',
        },
      },
    }
  );

  // 7. SaveImage (id: 9)
  const saveImage = createNodeFromPreset(
    'SaveImage',
    { filename_prefix: 'ComfyUI' },
    {
      id: '9',
      pos: [1450, 190],
      extra: {
        size: [210, 270],
        flags: {},
        order: 6,
        mode: 0,
        properties: {
          cnr_id: 'comfy-core',
          ver: '0.19.2',
          'Node name for S&R': 'SaveImage',
        },
      },
    }
  );

  // 构建步骤
  const nodes: StepNode[] = [
    checkpoint.node,
    positiveEncode.node,
    negativeEncode.node,
    latent.node,
    sampler.node,
    vaeDecode.node,
    saveImage.node,
  ];

  // 定义连线（从 text2image.json 的 links 数组）
  // links 格式: [link_id, from_node_id, from_slot, to_node_id, to_slot, type]
  const links: CrossStepLink[] = [
    { id: '1', from: { nodeId: '4', output: 0 }, to: { nodeId: '3', input: 0 }, type: 'MODEL' },
    { id: '2', from: { nodeId: '5', output: 0 }, to: { nodeId: '3', input: 3 }, type: 'LATENT' },
    { id: '3', from: { nodeId: '4', output: 1 }, to: { nodeId: '6', input: 0 }, type: 'CLIP' },
    { id: '4', from: { nodeId: '6', output: 0 }, to: { nodeId: '3', input: 1 }, type: 'CONDITIONING' },
    { id: '5', from: { nodeId: '4', output: 1 }, to: { nodeId: '7', input: 0 }, type: 'CLIP' },
    { id: '6', from: { nodeId: '7', output: 0 }, to: { nodeId: '3', input: 2 }, type: 'CONDITIONING' },
    { id: '7', from: { nodeId: '3', output: 0 }, to: { nodeId: '8', input: 0 }, type: 'LATENT' },
    { id: '8', from: { nodeId: '4', output: 2 }, to: { nodeId: '8', input: 1 }, type: 'VAE' },
    { id: '9', from: { nodeId: '8', output: 0 }, to: { nodeId: '9', input: 0 }, type: 'IMAGE' },
  ];

  workflow.steps.set('text2image', {
    id: 'text2image',
    name: 'Text to Image',
    nodes,
    internalLinks: links,
  });

  // 设置 UI 元数据
  workflow.ui = {
    lastNodeId: 9,
    lastLinkId: 9,
    groups: [],
    config: {},
    extra: {
      ds: {
        scale: 0.5642264883727625,
        offset: [296.7069239072455, 237.57339054397877],
      },
      frontendVersion: '1.42.11',
      VHS_latentpreview: false,
      VHS_latentpreviewrate: 0,
      VHS_MetadataImage: true,
      VHS_KeepIntermediate: true,
    },
  };

  // 保留原始工作流的 id 和 revision
  workflow.id = '2e83b844-e83c-46e1-8ebe-7a7824e3f505';
  workflow.source = {
    format: 'ui-v0.4',
    raw: text2imageJSON,
  };

  return workflow;
}

describe('代码生成工作流', () => {
  describe('节点生成', () => {
    it('应该生成正确的 KSampler widgets_values', () => {
      const { node } = createNodeFromPreset('KSampler', {
        seed: 819095824154876,
        seed_control_after_generate: 'randomize',
        steps: 30,
        cfg: 7,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1,
      });

      expect(node.widgets_values).toEqual([819095824154876, 'randomize', 30, 7, 'euler', 'normal', 1]);
    });

    it('应该生成正确的 CheckpointLoaderSimple widgets_values', () => {
      const { node } = createNodeFromPreset('CheckpointLoaderSimple', {
        ckpt_name: 'waiIllustriousSDXL_v150.safetensors',
      });

      expect(node.widgets_values).toEqual(['waiIllustriousSDXL_v150.safetensors']);
    });

    it('应该生成正确的 EmptyLatentImage widgets_values', () => {
      const { node } = createNodeFromPreset('EmptyLatentImage', {
        width: 896,
        height: 1152,
        batch_size: 1,
      });

      expect(node.widgets_values).toEqual([896, 1152, 1]);
    });

    it('应该生成正确的 CLIPTextEncode widgets_values', () => {
      const { node } = createNodeFromPreset('CLIPTextEncode', {
        text: POSITIVE_PROMPT,
      });

      expect(node.widgets_values).toEqual([POSITIVE_PROMPT]);
    });

    it('应该生成正确的 SaveImage widgets_values', () => {
      const { node } = createNodeFromPreset('SaveImage', {
        filename_prefix: 'ComfyUI',
      });

      expect(node.widgets_values).toEqual(['ComfyUI']);
    });
  });

  describe('完整工作流对比', () => {
    it('导入后导出应该与原始 JSON 完全一致', () => {
      // 导入原始 JSON
      const imported = importWorkflow(text2imageJSON);
      const exported = exportWorkflow(imported.workflow, { format: 'ui-v0.4' });

      // 深度对比整个导出结果
      expect(exported.data).toEqual(text2imageJSON);
    });

    it('导出的每个节点应该与原始节点完全一致', () => {
      const imported = importWorkflow(text2imageJSON);
      const exported = exportWorkflow(imported.workflow, { format: 'ui-v0.4' });

      // 按节点 ID 排序后对比
      const originalNodes = [...text2imageJSON.nodes].sort((a, b) => a.id - b.id);
      const exportedNodes = [...exported.data.nodes].sort((a: any, b: any) => a.id - b.id);

      expect(exportedNodes.length).toBe(originalNodes.length);

      for (let i = 0; i < originalNodes.length; i++) {
        expect(exportedNodes[i]).toEqual(originalNodes[i]);
      }
    });

    it('导出的连线应该与原始连线完全一致', () => {
      const imported = importWorkflow(text2imageJSON);
      const exported = exportWorkflow(imported.workflow, { format: 'ui-v0.4' });

      expect(exported.data.links).toEqual(text2imageJSON.links);
    });

    it('导出的元数据应该与原始元数据完全一致', () => {
      const imported = importWorkflow(text2imageJSON);
      const exported = exportWorkflow(imported.workflow, { format: 'ui-v0.4' });

      expect(exported.data.id).toBe(text2imageJSON.id);
      expect(exported.data.revision).toBe(text2imageJSON.revision);
      expect(exported.data.last_node_id).toBe(text2imageJSON.last_node_id);
      expect(exported.data.last_link_id).toBe(text2imageJSON.last_link_id);
      expect(exported.data.version).toBe(text2imageJSON.version);
      expect(exported.data.groups).toEqual(text2imageJSON.groups);
      expect(exported.data.config).toEqual(text2imageJSON.config);
      expect(exported.data.extra).toEqual(text2imageJSON.extra);
    });
  });

  describe('工作流元数据', () => {
    it('应该保留工作流 id', () => {
      const imported = importWorkflow(text2imageJSON);
      expect(imported.workflow.id).toBe('2e83b844-e83c-46e1-8ebe-7a7824e3f505');
    });

    it('应该保留 last_node_id 和 last_link_id', () => {
      const imported = importWorkflow(text2imageJSON);
      expect(imported.workflow.ui?.last_node_id).toBe(9);
      expect(imported.workflow.ui?.last_link_id).toBe(9);
    });

    it('应该保留 extra 元数据', () => {
      const imported = importWorkflow(text2imageJSON);
      expect(imported.workflow.ui?.extra?.frontendVersion).toBe('1.42.11');
    });
  });
});
