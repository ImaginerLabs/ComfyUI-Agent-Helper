/**
 * 掩码节点预设
 * 包含 LoadImageMask
 */

import type { NodePreset } from '../types.js';

/**
 * LoadImageMask - 从图像文件中提取指定通道作为掩码
 */
export const LoadImageMaskPreset: NodePreset = {
  type: 'LoadImageMask',
  name: '加载图像掩码',
  description: '从图像文件中提取指定通道作为掩码',
  category: 'mask',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [],
  widgets: [
    {
      name: 'image',
      type: 'COMBO',
      label: '图像文件',
      description: '要加载的图像文件名（从 input 目录）',
      required: true,
    },
    {
      name: 'channel',
      type: 'COMBO',
      label: '通道',
      description: '要提取的通道',
      default: 'alpha',
      options: ['alpha', 'red', 'green', 'blue'],
    },
  ],

  outputs: [
    {
      name: 'MASK',
      type: 'MASK',
      label: '掩码',
      description: '提取的掩码张量 [batch, H, W]',
      slotIndex: 0,
    },
  ],

  isIO: true,
  tags: ['loader', 'mask', 'channel', 'alpha'],
};

/**
 * 掩码节点预设列表
 */
export const maskPresets: NodePreset[] = [
  LoadImageMaskPreset,
];
