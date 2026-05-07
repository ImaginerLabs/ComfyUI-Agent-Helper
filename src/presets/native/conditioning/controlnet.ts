/**
 * ControlNet 节点预设
 * 包含 ControlNet 应用相关节点
 */

import type { NodePreset } from '../../types.js';

// ---------------------------------------------------------------------------
// ControlNetApply
// ---------------------------------------------------------------------------

/**
 * ControlNetApply 节点预设
 * 将 ControlNet 应用到条件上，使用控制图像引导生成
 */
export const ControlNetApply: NodePreset = {
  type: 'ControlNetApply',
  name: 'ControlNet应用',
  description: '将 ControlNet 应用到条件上，使用控制图像引导生成',
  category: 'conditioning/controlnet',
  stability: 'deprecated',
  source: 'native',

  inputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '要应用 ControlNet 的条件',
      required: true,
    },
    {
      name: 'control_net',
      type: 'CONTROL_NET',
      label: 'ControlNet模型',
      description: 'ControlNet 模型',
      required: true,
    },
    {
      name: 'image',
      type: 'IMAGE',
      label: '控制图像',
      description: '控制图像（边缘图、深度图等）',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'strength',
      type: 'FLOAT',
      label: 'ControlNet强度',
      description: 'ControlNet 强度',
      default: 1.0,
      min: 0.0,
      max: 10.0,
    },
  ],

  outputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '应用后条件',
      description: '应用 ControlNet 后的条件',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'deprecated', 'controlnet'],
};

// ---------------------------------------------------------------------------
// ControlNetApplyAdvanced
// ---------------------------------------------------------------------------

/**
 * ControlNetApplyAdvanced 节点预设
 * 将 ControlNet 分别应用到正向和负向条件，支持强度和时机范围的精细控制
 */
export const ControlNetApplyAdvanced: NodePreset = {
  type: 'ControlNetApplyAdvanced',
  name: 'ControlNet应用（高级）',
  description: '将 ControlNet 分别应用到正向和负向条件，支持强度和时机范围的精细控制',
  category: 'conditioning/controlnet',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'positive',
      type: 'CONDITIONING',
      label: '正向条件',
      description: '正向条件',
      required: true,
    },
    {
      name: 'negative',
      type: 'CONDITIONING',
      label: '负向条件',
      description: '负向条件',
      required: true,
    },
    {
      name: 'control_net',
      type: 'CONTROL_NET',
      label: 'ControlNet模型',
      description: 'ControlNet 模型',
      required: true,
    },
    {
      name: 'image',
      type: 'IMAGE',
      label: '控制图像',
      description: '控制图像',
      required: true,
    },
    {
      name: 'vae',
      type: 'VAE',
      label: 'VAE模型',
      description: 'VAE 模型（可选，用于某些 ControlNet 类型）',
      required: false,
    },
  ],

  widgets: [
    {
      name: 'strength',
      type: 'FLOAT',
      label: 'ControlNet强度',
      description: 'ControlNet 强度',
      default: 1.0,
      min: 0.0,
      max: 10.0,
    },
    {
      name: 'start_percent',
      type: 'FLOAT',
      label: '开始百分比',
      description: 'ControlNet 开始生效的采样百分比',
      default: 0.0,
      min: 0.0,
      max: 1.0,
    },
    {
      name: 'end_percent',
      type: 'FLOAT',
      label: '结束百分比',
      description: 'ControlNet 结束生效的采样百分比',
      default: 1.0,
      min: 0.0,
      max: 1.0,
    },
  ],

  outputs: [
    {
      name: 'positive',
      type: 'CONDITIONING',
      label: '正向条件',
      description: '应用 ControlNet 后的正向条件',
      slotIndex: 0,
    },
    {
      name: 'negative',
      type: 'CONDITIONING',
      label: '负向条件',
      description: '应用 ControlNet 后的负向条件',
      slotIndex: 1,
    },
  ],

  isIO: false,
  tags: ['native', 'controlnet', 'advanced'],
};

// ---------------------------------------------------------------------------
// 导出数组
// ---------------------------------------------------------------------------

/**
 * ControlNet 节点预设数组
 */
export const controlnetPresets: NodePreset[] = [
  ControlNetApply,
  ControlNetApplyAdvanced,
];
