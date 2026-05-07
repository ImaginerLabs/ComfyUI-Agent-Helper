/**
 * 基础节点预设
 * 包含 LoadImageOutput
 */

import type { NodePreset } from '../types.js';

/**
 * LoadImageOutput - 从 ComfyUI 输出目录加载已生成的图像
 */
export const LoadImageOutputPreset: NodePreset = {
  type: 'LoadImageOutput',
  name: '加载输出图像',
  description: '从 ComfyUI 输出目录加载已生成的图像',
  category: 'basics',
  stability: 'beta',
  source: 'nodes.py',

  inputs: [],
  widgets: [
    {
      name: 'image',
      type: 'COMBO',
      label: '图像文件',
      description: '要加载的图像文件名（从 output 目录），支持刷新按钮自动选择第一张',
      required: true,
    },
  ],

  outputs: [
    {
      name: 'IMAGE',
      type: 'IMAGE',
      label: '图像',
      description: '加载的图像张量 [batch, H, W, 3]',
      slotIndex: 0,
    },
    {
      name: 'MASK',
      type: 'MASK',
      label: '掩码',
      description: 'Alpha 通道掩码 [batch, H, W]',
      slotIndex: 1,
    },
  ],

  isIO: true,
  tags: ['loader', 'image', 'output', 'iteration'],
};

/**
 * 基础节点预设列表
 */
export const basicsPresets: NodePreset[] = [
  LoadImageOutputPreset,
];
