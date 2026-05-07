/**
 * 潜空间批次操作节点预设
 * 包含批次提取、重复等
 */

import type { NodePreset } from '../../types.js';

/**
 * LatentFromBatch - 从潜在图像批次中提取子批次
 */
export const LatentFromBatchPreset: NodePreset = {
  type: 'LatentFromBatch',
  name: '从批次提取',
  description: '从潜在图像批次中提取指定范围的子批次',
  category: 'latent/batch',
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
      name: 'batch_index',
      type: 'INT',
      label: '起始索引',
      description: '提取的起始索引',
      default: 0,
      min: 0,
      max: 63,
    },
    {
      name: 'length',
      type: 'INT',
      label: '提取数量',
      description: '提取的样本数量',
      default: 1,
      min: 1,
      max: 64,
    },
  ],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '提取的子批次潜在图像',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['latent', 'batch', 'extract', 'slice'],
};

/**
 * RepeatLatentBatch - 复制潜在图像批次
 */
export const RepeatLatentBatchPreset: NodePreset = {
  type: 'RepeatLatentBatch',
  name: '重复批次',
  description: '复制潜在图像批次以增加批次大小',
  category: 'latent/batch',
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
      name: 'amount',
      type: 'INT',
      label: '重复次数',
      description: '每个样本的重复次数',
      default: 1,
      min: 1,
      max: 64,
    },
  ],

  outputs: [
    {
      name: 'LATENT',
      type: 'LATENT',
      label: '潜空间',
      description: '重复后的潜在图像批次',
      slotIndex: 0,
    },
  ],

  isIO: false,
  tags: ['latent', 'batch', 'repeat', 'duplicate'],
};

/**
 * 潜空间批次操作节点预设列表
 */
export const latentBatchPresets: NodePreset[] = [
  LatentFromBatchPreset,
  RepeatLatentBatchPreset,
];
