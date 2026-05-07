/**
 * 条件混合/组合节点预设
 * 包含条件加权平均、组合、拼接等
 */

import type { NodePreset } from '../../types.js';

// ---------------------------------------------------------------------------
// ConditioningAverage
// ---------------------------------------------------------------------------

/**
 * ConditioningAverage 节点预设
 * 按权重比例混合两组条件向量，实现提示词风格融合
 */
export const ConditioningAverage: NodePreset = {
  type: 'ConditioningAverage',
  name: '条件加权平均',
  description: '按权重比例混合两组条件向量，实现提示词风格融合',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning_to',
      type: 'CONDITIONING',
      label: '目标条件',
      description: '目标条件向量（高权重时主导）',
      required: true,
    },
    {
      name: 'conditioning_from',
      type: 'CONDITIONING',
      label: '来源条件',
      description: '来源条件向量（低权重时主导）',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'conditioning_to_strength',
      type: 'FLOAT',
      label: '目标条件强度',
      description: '目标条件的权重强度，1.0 表示完全使用 conditioning_to',
      default: 1.0,
      min: 0.0,
      max: 1.0,
    },
  ],

  outputs: [
    {
      name: 'CONDITIONING',
      type: 'CONDITIONING',
      label: '混合条件',
      description: '加权混合后的条件向量',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'stable', 'average', 'blend', 'conditioning'],
};

// ---------------------------------------------------------------------------
// ConditioningCombine
// ---------------------------------------------------------------------------

/**
 * ConditioningCombine 节点预设
 * 将两个条件向量合并为一个，实现多提示词组合
 */
export const ConditioningCombine: NodePreset = {
  type: 'ConditioningCombine',
  name: '条件组合',
  description: '将两个条件向量合并为一个，实现多提示词组合',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning_1',
      type: 'CONDITIONING',
      label: '条件向量1',
      description: '第一个条件向量',
      required: true,
    },
    {
      name: 'conditioning_2',
      type: 'CONDITIONING',
      label: '条件向量2',
      description: '第二个条件向量',
      required: true,
    },
  ],

  widgets: [],

  outputs: [
    {
      name: 'CONDITIONING',
      type: 'CONDITIONING',
      label: '合并条件',
      description: '合并后的条件向量',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'stable', 'combine', 'merge', 'conditioning'],
};

// ---------------------------------------------------------------------------
// ConditioningConcat
// ---------------------------------------------------------------------------

/**
 * ConditioningConcat 节点预设
 * 在序列维度上拼接两组条件向量，扩展条件的表示能力
 */
export const ConditioningConcat: NodePreset = {
  type: 'ConditioningConcat',
  name: '条件序列拼接',
  description: '在序列维度上拼接两组条件向量，扩展条件的表示能力',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning_to',
      type: 'CONDITIONING',
      label: '目标条件',
      description: '目标条件向量',
      required: true,
    },
    {
      name: 'conditioning_from',
      type: 'CONDITIONING',
      label: '来源条件',
      description: '来源条件向量（仅使用第一个）',
      required: true,
    },
  ],

  widgets: [],

  outputs: [
    {
      name: 'CONDITIONING',
      type: 'CONDITIONING',
      label: '拼接条件',
      description: '序列拼接后的条件向量',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'stable', 'concat', 'conditioning'],
};

// ---------------------------------------------------------------------------
// 导出数组
// ---------------------------------------------------------------------------

/**
 * 条件混合节点预设数组
 */
export const conditioningMixPresets: NodePreset[] = [
  ConditioningAverage,
  ConditioningCombine,
  ConditioningConcat,
];
