/**
 * 基础潜空间节点预设
 * 包含空白潜空间创建、VAE 编解码、合成、缩放等
 */

import type { NodePreset } from '../../types.js';

/**
 * EmptyLatentImage - 创建空白潜在空间图像
 */
export const EmptyLatentImagePreset: NodePreset = {
  type: 'EmptyLatentImage',
  name: '空白潜空间',
  description: '创建一个空白的潜在空间图像批次，作为采样过程的起点',
  category: 'latent',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [],
  widgets: [
    {
      name: 'width',
      type: 'INT',
      label: '宽度',
      description: '输出图像的像素宽度，必须是8的倍数',
      default: 512,
      min: 16,
      max: 16384,
      step: 8,
    },
    {
      name: 'height',
      type: 'INT',
      label: '高度',
      description: '输出图像的像素高度，必须是8的倍数',
      default: 512,
      min: 16,
      max: 16384,
      step: 8,
    },
    {
      name: 'batch_size',
      type: 'INT',
      label: '批次大小',
      description: '同时生成的图像数量',
      default: 1,
      min: 1,
      max: 4096,
    },
  ],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '空白潜在图像批次',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['latent', 'empty', 'txt2img'],
};

/**
 * VAEDecode - 将潜空间表示解码为像素图像
 */
export const VAEDecodePreset: NodePreset = {
  type: 'VAEDecode',
  name: 'VAE解码',
  description: '将潜空间表示解码为像素图像，完成从潜空间到图像空间的转换',
  category: 'latent',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'samples',
      type: 'LATENT',
      label: '潜空间样本',
      description: '要解码的潜空间样本',
      required: true,
    },
    {
      name: 'vae',
      type: 'VAE',
      label: 'VAE',
      description: '用于解码的 VAE 模型',
      required: true,
    },
  ],
  widgets: [],

  outputs: [
    {
      name: 'IMAGE',
      type: 'IMAGE',
      label: '图像',
      description: '解码后的像素图像',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['vae', 'decode', 'latent-to-image'],
};

/**
 * VAEEncode - 将像素图像编码为潜空间表示
 */
export const VAEEncodePreset: NodePreset = {
  type: 'VAEEncode',
  name: 'VAE编码',
  description: '将像素图像编码为潜空间表示，实现图像到潜空间的转换',
  category: 'latent',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'pixels',
      type: 'IMAGE',
      label: '像素图像',
      description: '要编码的像素图像',
      required: true,
    },
    {
      name: 'vae',
      type: 'VAE',
      label: 'VAE',
      description: '用于编码的 VAE 模型',
      required: true,
    },
  ],
  widgets: [],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '编码后的潜空间样本',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['vae', 'encode', 'image-to-latent', 'img2img'],
};

/**
 * LatentComposite - 在潜在空间中合成图像
 */
export const LatentCompositePreset: NodePreset = {
  type: 'LatentComposite',
  name: '潜空间合成',
  description: '在潜在空间中将一个图像合成到另一个图像上，支持边缘羽化',
  category: 'latent',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'samples_to',
      type: 'LATENT',
      label: '目标图像',
      description: '目标潜在图像（被合成到）',
      required: true,
    },
    {
      name: 'samples_from',
      type: 'LATENT',
      label: '源图像',
      description: '源潜在图像（合成内容）',
      required: true,
    },
  ],
  widgets: [
    {
      name: 'x',
      type: 'INT',
      label: 'X坐标',
      description: '合成位置的 X 坐标（像素）',
      default: 0,
      min: 0,
      max: 16384,
      step: 8,
    },
    {
      name: 'y',
      type: 'INT',
      label: 'Y坐标',
      description: '合成位置的 Y 坐标（像素）',
      default: 0,
      min: 0,
      max: 16384,
      step: 8,
    },
    {
      name: 'feather',
      type: 'INT',
      label: '羽化宽度',
      description: '边缘羽化宽度（像素），0 表示无羽化',
      default: 0,
      min: 0,
      max: 16384,
      step: 8,
    },
  ],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '合成后的潜在图像',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['latent', 'composite', 'blend', 'merge'],
};

/**
 * LatentUpscale - 将潜在图像缩放到指定像素尺寸
 */
export const LatentUpscalePreset: NodePreset = {
  type: 'LatentUpscale',
  name: '潜空间缩放',
  description: '将潜在图像缩放到指定的像素尺寸，支持多种插值方法',
  category: 'latent',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'samples',
      type: 'LATENT',
      label: '潜空间样本',
      description: '输入的潜在图像批次',
      required: true,
    },
  ],
  widgets: [
    {
      name: 'upscale_method',
      type: 'COMBO',
      label: '插值方法',
      description: '缩放使用的插值方法',
      default: 'nearest-exact',
      options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'bislerp'],
    },
    {
      name: 'width',
      type: 'INT',
      label: '目标宽度',
      description: '目标像素宽度，0表示保持宽高比',
      default: 512,
      min: 0,
      max: 16384,
      step: 8,
    },
    {
      name: 'height',
      type: 'INT',
      label: '目标高度',
      description: '目标像素高度，0表示保持宽高比',
      default: 512,
      min: 0,
      max: 16384,
      step: 8,
    },
    {
      name: 'crop',
      type: 'COMBO',
      label: '裁剪方式',
      description: '缩放后的裁剪方式',
      default: 'disabled',
      options: ['disabled', 'center'],
    },
  ],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '缩放后的潜在图像',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['latent', 'upscale', 'resize', 'scale'],
};

/**
 * LatentUpscaleBy - 按比例因子缩放潜在图像
 */
export const LatentUpscaleByPreset: NodePreset = {
  type: 'LatentUpscaleBy',
  name: '潜空间按比例缩放',
  description: '按比例因子缩放潜在图像，无需指定具体像素尺寸',
  category: 'latent',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'samples',
      type: 'LATENT',
      label: '潜空间样本',
      description: '输入的潜在图像批次',
      required: true,
    },
  ],
  widgets: [
    {
      name: 'upscale_method',
      type: 'COMBO',
      label: '插值方法',
      description: '缩放使用的插值方法',
      default: 'nearest-exact',
      options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'bislerp'],
    },
    {
      name: 'scale_by',
      type: 'FLOAT',
      label: '缩放比例',
      description: '缩放比例因子',
      default: 1.5,
      min: 0.01,
      max: 8.0,
      step: 0.01,
    },
  ],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '缩放后的潜在图像',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['latent', 'upscale', 'scale', 'resize'],
};

/**
 * 基础潜空间节点预设列表
 */
export const latentBasicPresets: NodePreset[] = [
  EmptyLatentImagePreset,
  VAEDecodePreset,
  VAEEncodePreset,
  LatentCompositePreset,
  LatentUpscalePreset,
  LatentUpscaleByPreset,
];
