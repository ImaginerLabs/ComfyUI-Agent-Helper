/**
 * CLIP 编码相关节点预设
 * 包含 CLIP 文本编码、视觉编码、停止层设置等
 */

import type { NodePreset } from '../../types.js';

// ---------------------------------------------------------------------------
// CLIPSetLastLayer
// ---------------------------------------------------------------------------

/**
 * CLIPSetLastLayer 节点预设
 * 设置 CLIP 文本编码器的停止层，用于控制文本编码的粒度
 */
export const CLIPSetLastLayer: NodePreset = {
  type: 'CLIPSetLastLayer',
  name: 'CLIP停止层设置',
  description: '设置 CLIP 文本编码器的停止层，用于控制文本编码的粒度',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'clip',
      type: 'CLIP',
      label: 'CLIP模型',
      description: '要修改的 CLIP 模型',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'stop_at_clip_layer',
      type: 'INT',
      label: '停止层索引',
      description: 'CLIP 停止层索引（负数，-1为最后一层）',
      default: -1,
      min: -24,
      max: -1,
    },
  ],

  outputs: [
    {
      name: 'clip',
      type: 'CLIP',
      label: 'CLIP模型',
      description: '修改后的 CLIP 模型',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'clip', 'layer'],
};

// ---------------------------------------------------------------------------
// CLIPTextEncode
// ---------------------------------------------------------------------------

/**
 * CLIPTextEncode 节点预设
 * 将文本提示词编码为 CLIP 嵌入向量，用于引导扩散模型生成图像
 */
export const CLIPTextEncode: NodePreset = {
  type: 'CLIPTextEncode',
  name: 'CLIP文本编码',
  description: '将文本提示词编码为 CLIP 嵌入向量，用于引导扩散模型生成图像',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'clip',
      type: 'CLIP',
      label: 'CLIP模型',
      description: '用于编码文本的 CLIP 模型',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'text',
      type: 'STRING',
      label: '文本内容',
      description: '要编码的文本内容，支持多行和动态提示词',
      default: '',
    },
  ],

  outputs: [
    {
      name: 'CONDITIONING',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '包含嵌入文本的条件向量，用于引导扩散模型',
      slotIndex: 0,
    },
  ],

  isIO: true,
  tags: ['native', 'stable', 'IO', 'text', 'encode', 'clip', 'prompt'],
};

// ---------------------------------------------------------------------------
// CLIPVisionEncode
// ---------------------------------------------------------------------------

/**
 * CLIPVisionEncode 节点预设
 * 使用 CLIP Vision 模型对图像进行编码，提取视觉特征
 */
export const CLIPVisionEncode: NodePreset = {
  type: 'CLIPVisionEncode',
  name: 'CLIP视觉编码',
  description: '使用 CLIP Vision 模型对图像进行编码，提取视觉特征',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'clip_vision',
      type: 'CLIP_VISION',
      label: 'CLIP Vision模型',
      description: 'CLIP Vision 模型',
      required: true,
    },
    {
      name: 'image',
      type: 'IMAGE',
      label: '图像',
      description: '要编码的图像',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'crop',
      type: 'COMBO',
      label: '裁剪方式',
      description: '图像裁剪方式',
      default: 'center',
      options: ['center', 'none'],
    },
  ],

  outputs: [
    {
      name: 'clip_vision_output',
      type: 'CLIP_VISION_OUTPUT',
      label: '视觉编码输出',
      description: '图像的 CLIP Vision 编码特征',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'clip', 'vision', 'encode', 'image'],
};

// ---------------------------------------------------------------------------
// 导出数组
// ---------------------------------------------------------------------------

/**
 * CLIP 编码相关节点预设数组
 */
export const clipPresets: NodePreset[] = [
  CLIPSetLastLayer,
  CLIPTextEncode,
  CLIPVisionEncode,
];
