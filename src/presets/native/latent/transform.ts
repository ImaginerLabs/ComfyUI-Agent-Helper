/**
 * 潜空间变换节点预设
 * 包含裁剪、翻转、旋转等
 */

import type { NodePreset } from '../../types.js';

/**
 * LatentCrop - 在潜在空间中裁剪图像
 */
export const LatentCropPreset: NodePreset = {
  type: 'LatentCrop',
  name: '潜空间裁剪',
  description: '在潜在空间中裁剪图像，提取指定区域的子图像',
  category: 'latent/transform',
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
      name: 'width',
      type: 'INT',
      label: '裁剪宽度',
      description: '裁剪区域的像素宽度',
      default: 512,
      min: 64,
      max: 16384,
      step: 8,
    },
    {
      name: 'height',
      type: 'INT',
      label: '裁剪高度',
      description: '裁剪区域的像素高度',
      default: 512,
      min: 64,
      max: 16384,
      step: 8,
    },
    {
      name: 'x',
      type: 'INT',
      label: '起始X坐标',
      description: '裁剪起始 X 坐标（像素）',
      default: 0,
      min: 0,
      max: 16384,
      step: 8,
    },
    {
      name: 'y',
      type: 'INT',
      label: '起始Y坐标',
      description: '裁剪起始 Y 坐标（像素）',
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
      description: '裁剪后的潜在图像',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['latent', 'crop', 'cut', 'extract'],
};

/**
 * LatentFlip - 在潜在空间中翻转图像
 */
export const LatentFlipPreset: NodePreset = {
  type: 'LatentFlip',
  name: '潜空间翻转',
  description: '在潜在空间中翻转图像，支持水平和垂直翻转',
  category: 'latent/transform',
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
      name: 'flip_method',
      type: 'COMBO',
      label: '翻转方式',
      description: 'x-axis 为垂直翻转，y-axis 为水平翻转',
      default: 'x-axis: vertically',
      options: ['x-axis: vertically', 'y-axis: horizontally'],
    },
  ],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '翻转后的潜在图像',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['latent', 'flip', 'mirror', 'transform'],
};

/**
 * LatentRotate - 在潜在空间中旋转图像
 */
export const LatentRotatePreset: NodePreset = {
  type: 'LatentRotate',
  name: '潜空间旋转',
  description: '在潜在空间中旋转图像，支持 90 度整数倍旋转',
  category: 'latent/transform',
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
      name: 'rotation',
      type: 'COMBO',
      label: '旋转角度',
      description: '旋转角度（90度整数倍）',
      default: 'none',
      options: ['none', '90 degrees', '180 degrees', '270 degrees'],
    },
  ],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '旋转后的潜在图像',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['latent', 'rotate', 'transform'],
};

/**
 * 潜空间变换节点预设列表
 */
export const latentTransformPresets: NodePreset[] = [
  LatentCropPreset,
  LatentFlipPreset,
  LatentRotatePreset,
];
