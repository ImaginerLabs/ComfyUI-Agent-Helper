/**
 * 特殊条件节点预设
 * 包含 unCLIP、GLIGEN、重绘条件、风格模型等
 */

import type { NodePreset } from '../../types.js';

// ---------------------------------------------------------------------------
// unCLIPConditioning
// ---------------------------------------------------------------------------

/**
 * unCLIPConditioning 节点预设
 * 将 CLIP Vision 编码的图像特征注入到条件中，实现 unCLIP 架构的图像条件生成
 */
export const unCLIPConditioning: NodePreset = {
  type: 'unCLIPConditioning',
  name: 'unCLIP条件',
  description: '将 CLIP Vision 编码的图像特征注入到条件中，实现 unCLIP 架构的图像条件生成',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '要添加图像条件的条件',
      required: true,
    },
    {
      name: 'clip_vision_output',
      type: 'CLIP_VISION_OUTPUT',
      label: '视觉编码输出',
      description: '图像的 CLIP Vision 编码',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'strength',
      type: 'FLOAT',
      label: '图像条件强度',
      description: '图像条件强度',
      default: 1.0,
      min: -10.0,
      max: 10.0,
    },
    {
      name: 'noise_augmentation',
      type: 'FLOAT',
      label: '噪声增强',
      description: '噪声增强程度',
      default: 0.0,
      min: 0.0,
      max: 1.0,
    },
  ],

  outputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '增强条件',
      description: '添加图像条件后的条件',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'unclip', 'vision', 'conditioning'],
};

// ---------------------------------------------------------------------------
// GLIGENTextBoxApply
// ---------------------------------------------------------------------------

/**
 * GLIGENTextBoxApply 节点预设
 * 将 GLIGEN 文本框条件应用到条件中，指定文本的生成位置
 */
export const GLIGENTextBoxApply: NodePreset = {
  type: 'GLIGENTextBoxApply',
  name: 'GLIGEN文本框应用',
  description: '将 GLIGEN 文本框条件应用到条件中，指定文本的生成位置',
  category: 'conditioning/gligen',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning_to',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '要添加 GLIGEN 条件的条件',
      required: true,
    },
    {
      name: 'clip',
      type: 'CLIP',
      label: 'CLIP模型',
      description: '用于文本编码的 CLIP 模型',
      required: true,
    },
    {
      name: 'gligen_textbox_model',
      type: 'GLIGEN',
      label: 'GLIGEN模型',
      description: 'GLIGEN 模型',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'text',
      type: 'STRING',
      label: '文本描述',
      description: '边界框内的文本描述',
      default: '',
    },
    {
      name: 'width',
      type: 'INT',
      label: '文本框宽度',
      description: '文本框宽度（像素）',
      default: 64,
      min: 8,
    },
    {
      name: 'height',
      type: 'INT',
      label: '文本框高度',
      description: '文本框高度（像素）',
      default: 64,
      min: 8,
    },
    {
      name: 'x',
      type: 'INT',
      label: 'X坐标',
      description: '文本框左上角 X 坐标',
      default: 0,
      min: 0,
    },
    {
      name: 'y',
      type: 'INT',
      label: 'Y坐标',
      description: '文本框左上角 Y 坐标',
      default: 0,
      min: 0,
    },
  ],

  outputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '增强条件',
      description: '添加 GLIGEN 条件后的条件',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'gligen', 'textbox', 'position'],
};

// ---------------------------------------------------------------------------
// InpaintModelConditioning
// ---------------------------------------------------------------------------

/**
 * InpaintModelConditioning 节点预设
 * 为支持重绘的扩散模型准备条件，包括潜空间编码和掩码配置
 */
export const InpaintModelConditioning: NodePreset = {
  type: 'InpaintModelConditioning',
  name: '重绘模型条件',
  description: '为支持重绘的扩散模型准备条件，包括潜空间编码和掩码配置',
  category: 'conditioning/inpaint',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'positive',
      type: 'CONDITIONING',
      label: '正向条件',
      description: '正向条件向量',
      required: true,
    },
    {
      name: 'negative',
      type: 'CONDITIONING',
      label: '负向条件',
      description: '负向条件向量',
      required: true,
    },
    {
      name: 'vae',
      type: 'VAE',
      label: 'VAE模型',
      description: '用于编码的 VAE 模型',
      required: true,
    },
    {
      name: 'pixels',
      type: 'IMAGE',
      label: '输入图像',
      description: '输入图像',
      required: true,
    },
    {
      name: 'mask',
      type: 'MASK',
      label: '重绘掩码',
      description: '定义重绘区域的掩码',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'noise_mask',
      type: 'BOOLEAN',
      label: '噪声掩码',
      description: '是否添加噪声掩码到潜空间',
      default: true,
    },
  ],

  outputs: [
    {
      name: 'positive',
      type: 'CONDITIONING',
      label: '正向条件',
      description: '处理后的正向条件',
      slotIndex: 0,
    },
    {
      name: 'negative',
      type: 'CONDITIONING',
      label: '负向条件',
      description: '处理后的负向条件',
      slotIndex: 1,
    },
    {
      name: 'latent',
      type: 'LATENT',
      label: '潜空间',
      description: '包含样本和可选噪声掩码的潜空间',
      slotIndex: 2,
    },
  ],

  isIO: false,
  tags: ['native', 'stable', 'inpaint', 'conditioning'],
};

// ---------------------------------------------------------------------------
// StyleModelApply
// ---------------------------------------------------------------------------

/**
 * StyleModelApply 节点预设
 * 将风格模型应用到条件上，实现图像风格迁移
 */
export const StyleModelApply: NodePreset = {
  type: 'StyleModelApply',
  name: '风格模型应用',
  description: '将风格模型应用到条件上，实现图像风格迁移',
  category: 'conditioning/style_model',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '要应用风格的条件',
      required: true,
    },
    {
      name: 'style_model',
      type: 'STYLE_MODEL',
      label: '风格模型',
      description: '风格模型',
      required: true,
    },
    {
      name: 'clip_vision_output',
      type: 'CLIP_VISION_OUTPUT',
      label: '视觉编码输出',
      description: '参考图像的 CLIP Vision 编码',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'strength',
      type: 'FLOAT',
      label: '风格强度',
      description: '风格强度',
      default: 1.0,
      min: 0.0,
      max: 10.0,
    },
    {
      name: 'strength_type',
      type: 'COMBO',
      label: '强度类型',
      description: '强度类型',
      default: 'multiply',
      options: ['multiply', 'attn_bias'],
    },
  ],

  outputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '风格化条件',
      description: '应用风格后的条件',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'style', 'transfer', 'conditioning'],
};

// ---------------------------------------------------------------------------
// 导出数组
// ---------------------------------------------------------------------------

/**
 * 特殊条件节点预设数组
 */
export const specialConditioningPresets: NodePreset[] = [
  unCLIPConditioning,
  GLIGENTextBoxApply,
  InpaintModelConditioning,
  StyleModelApply,
];
