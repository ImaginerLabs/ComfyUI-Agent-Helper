/**
 * 条件区域控制节点预设
 * 包含区域设置、掩码设置等
 */

import type { NodePreset } from '../../types.js';

// ---------------------------------------------------------------------------
// ConditioningSetArea
// ---------------------------------------------------------------------------

/**
 * ConditioningSetArea 节点预设
 * 为条件向量设置像素级的作用区域，实现局部提示词控制
 */
export const ConditioningSetArea: NodePreset = {
  type: 'ConditioningSetArea',
  name: '条件区域设置',
  description: '为条件向量设置像素级的作用区域，实现局部提示词控制',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '要设置区域的条件向量',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'width',
      type: 'INT',
      label: '区域宽度',
      description: '区域宽度（像素，步长 8）',
      default: 64,
      min: 64,
      step: 8,
    },
    {
      name: 'height',
      type: 'INT',
      label: '区域高度',
      description: '区域高度（像素，步长 8）',
      default: 64,
      min: 64,
      step: 8,
    },
    {
      name: 'x',
      type: 'INT',
      label: '起始X坐标',
      description: '区域起始 X 坐标（像素）',
      default: 0,
      min: 0,
    },
    {
      name: 'y',
      type: 'INT',
      label: '起始Y坐标',
      description: '区域起始 Y 坐标（像素）',
      default: 0,
      min: 0,
    },
    {
      name: 'strength',
      type: 'FLOAT',
      label: '条件强度',
      description: '条件在该区域的强度',
      default: 1.0,
      min: 0.0,
      max: 10.0,
    },
  ],

  outputs: [
    {
      name: 'CONDITIONING',
      type: 'CONDITIONING',
      label: '区域条件',
      description: '设置了区域属性的条件向量',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'stable', 'area', 'regional', 'conditioning'],
};

// ---------------------------------------------------------------------------
// ConditioningSetAreaPercentage
// ---------------------------------------------------------------------------

/**
 * ConditioningSetAreaPercentage 节点预设
 * 使用百分比方式定义条件作用区域，更直观地控制区域提示词
 */
export const ConditioningSetAreaPercentage: NodePreset = {
  type: 'ConditioningSetAreaPercentage',
  name: '条件区域设置（百分比）',
  description: '使用百分比方式定义条件作用区域，更直观地控制区域提示词',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '要设置区域的条件向量',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'width',
      type: 'FLOAT',
      label: '区域宽度比例',
      description: '区域宽度占图像宽度的比例',
      default: 1.0,
      min: 0.0,
      max: 1.0,
    },
    {
      name: 'height',
      type: 'FLOAT',
      label: '区域高度比例',
      description: '区域高度占图像高度的比例',
      default: 1.0,
      min: 0.0,
      max: 1.0,
    },
    {
      name: 'x',
      type: 'FLOAT',
      label: '起始X比例',
      description: '区域起始 X 坐标占图像宽度的比例',
      default: 0.0,
      min: 0.0,
      max: 1.0,
    },
    {
      name: 'y',
      type: 'FLOAT',
      label: '起始Y比例',
      description: '区域起始 Y 坐标占图像高度的比例',
      default: 0.0,
      min: 0.0,
      max: 1.0,
    },
    {
      name: 'strength',
      type: 'FLOAT',
      label: '条件强度',
      description: '条件在该区域的强度',
      default: 1.0,
      min: 0.0,
      max: 10.0,
    },
  ],

  outputs: [
    {
      name: 'CONDITIONING',
      type: 'CONDITIONING',
      label: '区域条件',
      description: '设置了区域属性的条件向量',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'stable', 'area', 'percentage', 'regional', 'conditioning'],
};

// ---------------------------------------------------------------------------
// ConditioningSetAreaStrength
// ---------------------------------------------------------------------------

/**
 * ConditioningSetAreaStrength 节点预设
 * 调整已设置区域条件的作用强度
 */
export const ConditioningSetAreaStrength: NodePreset = {
  type: 'ConditioningSetAreaStrength',
  name: '条件强度设置',
  description: '调整已设置区域条件的作用强度',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '要调整强度的条件向量',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'strength',
      type: 'FLOAT',
      label: '条件强度',
      description: '条件的作用强度',
      default: 1.0,
      min: 0.0,
      max: 10.0,
    },
  ],

  outputs: [
    {
      name: 'CONDITIONING',
      type: 'CONDITIONING',
      label: '调整后条件',
      description: '调整强度后的条件向量',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'stable', 'strength', 'conditioning'],
};

// ---------------------------------------------------------------------------
// ConditioningSetMask
// ---------------------------------------------------------------------------

/**
 * ConditioningSetMask 节点预设
 * 使用掩码定义条件作用区域，实现任意形状的区域控制
 */
export const ConditioningSetMask: NodePreset = {
  type: 'ConditioningSetMask',
  name: '条件掩码设置',
  description: '使用掩码定义条件作用区域，实现任意形状的区域控制',
  category: 'conditioning',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '要设置掩码的条件向量',
      required: true,
    },
    {
      name: 'mask',
      type: 'MASK',
      label: '掩码',
      description: '定义作用区域的掩码图像',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'strength',
      type: 'FLOAT',
      label: '条件强度',
      description: '掩码区域的条件强度',
      default: 1.0,
      min: 0.0,
      max: 10.0,
    },
    {
      name: 'set_cond_area',
      type: 'COMBO',
      label: '区域设置方式',
      description: '条件区域设置方式',
      default: 'default',
      options: ['default', 'mask bounds'],
    },
  ],

  outputs: [
    {
      name: 'CONDITIONING',
      type: 'CONDITIONING',
      label: '掩码条件',
      description: '设置了掩码的条件向量',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['native', 'stable', 'mask', 'regional', 'conditioning'],
};

// ---------------------------------------------------------------------------
// 导出数组
// ---------------------------------------------------------------------------

/**
 * 条件区域控制节点预设数组
 */
export const conditioningAreaPresets: NodePreset[] = [
  ConditioningSetArea,
  ConditioningSetAreaPercentage,
  ConditioningSetAreaStrength,
  ConditioningSetMask,
];
