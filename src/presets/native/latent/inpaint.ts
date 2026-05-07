/**
 * 潜空间重绘节点预设
 * 包含噪声掩码设置、重绘编码等
 */

import type { NodePreset } from '../../types.js';

/**
 * SetLatentNoiseMask - 为潜在图像设置噪声掩码
 */
export const SetLatentNoiseMaskPreset: NodePreset = {
  type: 'SetLatentNoiseMask',
  name: '设置噪声掩码',
  description: '为潜在图像设置噪声掩码，用于局部重绘（inpainting）',
  category: 'latent/inpaint',
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
    {
      name: 'mask',
      type: 'MASK',
      label: '掩码',
      description: '噪声掩码，白色区域将被重绘',
      required: true,
    },
  ],
  widgets: [],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '带噪声掩码的潜在图像',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['latent', 'mask', 'inpaint', 'noise'],
};

/**
 * VAEEncodeForInpaint - 为重绘任务编码图像
 */
export const VAEEncodeForInpaintPreset: NodePreset = {
  type: 'VAEEncodeForInpaint',
  name: '重绘VAE编码',
  description: '为重绘任务编码图像，自动处理掩码区域的边缘过渡',
  category: 'latent/inpaint',
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
    {
      name: 'mask',
      type: 'MASK',
      label: '掩码',
      description: '定义重绘区域的掩码',
      required: true,
    },
  ],
  widgets: [
    {
      name: 'grow_mask_by',
      type: 'INT',
      label: '掩码扩展',
      description: '掩码边缘扩展像素数，用于平滑过渡',
      default: 6,
      min: 0,
      max: 64,
    },
  ],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '包含样本和噪声掩码的潜空间数据',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['vae', 'encode', 'inpaint', 'mask'],
};

/**
 * 潜空间重绘节点预设列表
 */
export const latentInpaintPresets: NodePreset[] = [
  SetLatentNoiseMaskPreset,
  VAEEncodeForInpaintPreset,
];
