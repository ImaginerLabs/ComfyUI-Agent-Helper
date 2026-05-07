/**
 * ComfyUI 原生采样节点预设定义
 */

import type { NodePreset } from '../types.js';

// ---------------------------------------------------------------------------
// KSampler - 标准采样器
// ---------------------------------------------------------------------------

/**
 * KSampler 节点预设
 *
 * 核心采样节点，使用扩散模型对潜在图像进行去噪采样，生成最终图像。
 * 将模型、条件信息和潜在图像结合，通过指定的采样器和调度器执行去噪过程。
 */
export const KSampler: NodePreset = {
  // === 元信息 ===
  type: 'KSampler',
  name: 'KSampler 采样器',
  description: '使用扩散模型对潜在图像进行去噪采样，生成最终图像',
  category: 'sampling',
  stability: 'stable',
  source: 'nodes.py',

  // === 输入定义 ===
  inputs: [
    {
      name: 'model',
      type: 'MODEL',
      label: '模型',
      description: '扩散模型实例',
      required: true,
    },
    {
      name: 'seed',
      type: 'INT',
      label: '随机种子',
      description: '控制噪声生成的随机种子',
      isWidget: true,
      required: true,
    },
    {
      name: 'steps',
      type: 'INT',
      label: '采样步数',
      description: '去噪迭代步数',
      isWidget: true,
      required: true,
    },
    {
      name: 'cfg',
      type: 'FLOAT',
      label: 'CFG 强度',
      description: 'Classifier-Free Guidance 强度，较高值使输出更贴近提示词',
      isWidget: true,
      required: true,
    },
    {
      name: 'sampler_name',
      type: 'COMBO',
      label: '采样器',
      description: '采样算法名称',
      isWidget: true,
      required: true,
    },
    {
      name: 'scheduler',
      type: 'COMBO',
      label: '调度器',
      description: '噪声调度器名称',
      isWidget: true,
      required: true,
    },
    {
      name: 'positive',
      type: 'CONDITIONING',
      label: '正向条件',
      description: '正向条件（描述要包含的内容）',
      required: true,
    },
    {
      name: 'negative',
      type: 'CONDITIONING',
      label: '负向条件',
      description: '负向条件（描述要排除的内容）',
      required: true,
    },
    {
      name: 'latent_image',
      type: 'LATENT',
      label: '潜在图像',
      description: '待去噪的潜在图像',
      required: true,
    },
  ],

  // === Widget 参数 ===
  widgets: [
    {
      name: 'denoise',
      type: 'FLOAT',
      label: '去噪强度',
      description: '去噪强度，1.0 为完全去噪，较低值保留更多原图结构（用于 img2img）',
      default: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.01,
    },
  ],

  // === 输出定义 ===
  outputs: [
    {
      name: 'latent',
      type: 'LATENT',
      label: '潜在图像',
      description: '去噪后的潜在图像',
      slotIndex: 0,
    },
  ],

  // === UI 层元数据 ===
  uiMetadata: {
    size: [320, 480],
    properties: {
      cnr_id: 'comfy-core',
    },
    controlWidgets: [
      {
        name: 'seed_control_after_generate',
        type: 'control',
        label: '种子控制',
        default: 'randomize',
        options: ['fixed', 'increment', 'decrement', 'randomize'],
      },
    ],
  },

  // === 元数据 ===
  tags: ['sampling', 'denoise', 'core'],
};

// ---------------------------------------------------------------------------
// KSamplerAdvanced - 高级采样器
// ---------------------------------------------------------------------------

/**
 * KSamplerAdvanced 节点预设
 *
 * 高级采样器节点，提供比 KSampler 更精细的采样过程控制。
 * 支持手动控制噪声添加、采样步数范围和噪声返回选项。
 */
export const KSamplerAdvanced: NodePreset = {
  // === 元信息 ===
  type: 'KSamplerAdvanced',
  name: 'KSampler 高级采样器',
  description: '高级采样器节点，提供更精细的采样过程控制',
  category: 'sampling',
  stability: 'stable',
  source: 'nodes.py',

  // === 输入定义 ===
  inputs: [
    {
      name: 'model',
      type: 'MODEL',
      label: '模型',
      description: '扩散模型实例',
      required: true,
    },
    {
      name: 'add_noise',
      type: 'COMBO',
      label: '添加噪声',
      description: '是否在采样开始时添加噪声',
      isWidget: true,
      required: true,
    },
    {
      name: 'noise_seed',
      type: 'INT',
      label: '噪声种子',
      description: '控制噪声生成的随机种子',
      isWidget: true,
      required: true,
    },
    {
      name: 'steps',
      type: 'INT',
      label: '采样步数',
      description: '总去噪迭代步数',
      isWidget: true,
      required: true,
    },
    {
      name: 'cfg',
      type: 'FLOAT',
      label: 'CFG 强度',
      description: 'Classifier-Free Guidance 强度',
      isWidget: true,
      required: true,
    },
    {
      name: 'sampler_name',
      type: 'COMBO',
      label: '采样器',
      description: '采样算法名称',
      isWidget: true,
      required: true,
    },
    {
      name: 'scheduler',
      type: 'COMBO',
      label: '调度器',
      description: '噪声调度器名称',
      isWidget: true,
      required: true,
    },
    {
      name: 'positive',
      type: 'CONDITIONING',
      label: '正向条件',
      description: '正向条件（描述要包含的内容）',
      required: true,
    },
    {
      name: 'negative',
      type: 'CONDITIONING',
      label: '负向条件',
      description: '负向条件（描述要排除的内容）',
      required: true,
    },
    {
      name: 'latent_image',
      type: 'LATENT',
      label: '潜在图像',
      description: '待去噪的潜在图像',
      required: true,
    },
    {
      name: 'start_at_step',
      type: 'INT',
      label: '起始步',
      description: '采样起始步',
      isWidget: true,
      required: true,
    },
    {
      name: 'end_at_step',
      type: 'INT',
      label: '结束步',
      description: '采样结束步',
      isWidget: true,
      required: true,
    },
    {
      name: 'return_with_leftover_noise',
      type: 'COMBO',
      label: '返回残留噪声',
      description: '是否返回带有残留噪声的潜在样本',
      isWidget: true,
      required: true,
    },
  ],

  // === Widget 参数 ===
  widgets: [],

  // === 输出定义 ===
  outputs: [
    {
      name: 'latent',
      type: 'LATENT',
      label: '潜在图像',
      description: '采样后的潜在图像',
      slotIndex: 0,
    },
  ],

  // === 元数据 ===
  tags: ['sampling', 'denoise', 'advanced', 'iterative'],
};

// ---------------------------------------------------------------------------
// 采样器选项定义
// ---------------------------------------------------------------------------

/**
 * 可用的采样算法列表
 */
export const SAMPLER_OPTIONS = [
  'euler',
  'euler_ancestral',
  'heun',
  'dpm_2',
  'dpm_2_ancestral',
  'lms',
  'dpm_fast',
  'dpm_adaptive',
  'ddim',
  'uni_pc',
  'uni_pc_bh2',
] as const;

/**
 * 可用的调度器列表
 */
export const SCHEDULER_OPTIONS = [
  'normal',
  'karras',
  'exponential',
  'sgm_uniform',
  'simple',
  'ddim_uniform',
] as const;

/**
 * add_noise 选项
 */
export const ADD_NOISE_OPTIONS = ['enable', 'disable'] as const;

/**
 * return_with_leftover_noise 选项
 */
export const LEFTOVER_NOISE_OPTIONS = ['disable', 'enable'] as const;

// ---------------------------------------------------------------------------
// 导出数组
// ---------------------------------------------------------------------------

/**
 * 所有采样节点预设
 */
export const samplingPresets: NodePreset[] = [KSampler, KSamplerAdvanced];