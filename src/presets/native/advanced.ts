/**
 * Advanced 类节点预设定义
 * 包含高级功能节点：条件时间范围、条件归零、独立加载器等
 */

import type { NodePreset } from '../types.js';

// ---------------------------------------------------------------------------
// ConditioningSetTimestepRange
// ---------------------------------------------------------------------------

/**
 * ConditioningSetTimestepRange 节点预设
 * 限制条件仅在采样的特定时间步范围内生效
 */
export const ConditioningSetTimestepRange: NodePreset = {
  type: 'ConditioningSetTimestepRange',
  name: '条件时间范围设置',
  description: '限制条件仅在采样的特定时间步范围内生效，实现精细的生成控制',
  category: 'advanced',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '要设置时间范围的条件向量',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'start',
      type: 'FLOAT',
      label: '开始时间点',
      description: '条件开始生效的时间点（0=采样开始，1=采样结束）',
      default: 0.0,
      min: 0.0,
      max: 1.0,
    },
    {
      name: 'end',
      type: 'FLOAT',
      label: '结束时间点',
      description: '条件停止生效的时间点',
      default: 1.0,
      min: 0.0,
      max: 1.0,
    },
  ],

  outputs: [
    {
      name: 'CONDITIONING',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '设置了时间范围的条件向量',
      slotIndex: 0,
    },
  ],

  tags: ['conditioning', 'timestep', 'range', 'advanced'],
};

// ---------------------------------------------------------------------------
// ConditioningZeroOut
// ---------------------------------------------------------------------------

/**
 * ConditioningZeroOut 节点预设
 * 将条件向量的嵌入值归零，创建"空白"条件
 */
export const ConditioningZeroOut: NodePreset = {
  type: 'ConditioningZeroOut',
  name: '条件归零',
  description: '将条件向量的嵌入值归零，创建"空白"条件，用于消除条件影响',
  category: 'advanced',
  stability: 'stable',
  source: 'native',

  inputs: [
    {
      name: 'conditioning',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '要归零的条件向量',
      required: true,
    },
  ],

  widgets: [],

  outputs: [
    {
      name: 'CONDITIONING',
      type: 'CONDITIONING',
      label: '条件向量',
      description: '嵌入值归零后的条件向量',
      slotIndex: 0,
    },
  ],

  tags: ['conditioning', 'zero', 'neutral', 'advanced'],
};

// ---------------------------------------------------------------------------
// CLIPLoader
// ---------------------------------------------------------------------------

/**
 * CLIPLoader 节点预设
 * 单独加载 CLIP 文本编码器，支持多种模型架构类型
 */
export const CLIPLoader: NodePreset = {
  type: 'CLIPLoader',
  name: 'CLIP 加载器',
  description: '单独加载 CLIP 文本编码器，支持多种模型架构类型',
  category: 'advanced',
  stability: 'stable',
  source: 'native',
  isIO: true,

  inputs: [],

  widgets: [
    {
      name: 'clip_name',
      type: 'COMBO',
      label: 'CLIP 文件名',
      description: 'CLIP 模型文件名，从 text_encoders 目录选择',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI text_encoders 目录动态获取列表
        return [];
      },
    },
    {
      name: 'type',
      type: 'COMBO',
      label: '模型架构类型',
      description: 'CLIP 模型架构类型，决定加载配置',
      default: 'stable_diffusion',
      required: true,
      options: [
        'stable_diffusion',
        'stable_cascade',
        'sd3',
        'stable_audio',
        'mochi',
        'ltxv',
        'pixart',
        'cosmos',
        'lumina2',
        'wan',
        'hidream',
        'chroma',
        'ace',
        'omnigen2',
        'qwen_image',
        'hunyuan_image',
        'flux2',
        'ovis',
        'longcat_image',
        'cogvideox',
      ],
    },
    {
      name: 'device',
      type: 'COMBO',
      label: '加载设备',
      description: '模型加载设备，选择 CPU 可节省显存',
      default: 'default',
      advanced: true,
      options: ['default', 'cpu'],
    },
  ],

  outputs: [
    {
      name: 'CLIP',
      type: 'CLIP',
      label: 'CLIP',
      description: '加载的 CLIP 模型',
      slotIndex: 0,
    },
  ],

  tags: ['clip', 'loader', 'text_encoder', 'advanced'],
};

// ---------------------------------------------------------------------------
// DualCLIPLoader
// ---------------------------------------------------------------------------

/**
 * DualCLIPLoader 节点预设
 * 加载双 CLIP 模型组合，用于 SDXL、SD3、Flux 等多编码器架构
 */
export const DualCLIPLoader: NodePreset = {
  type: 'DualCLIPLoader',
  name: '双 CLIP 加载器',
  description: '加载双 CLIP 模型组合，用于 SDXL、SD3、Flux 等多编码器架构',
  category: 'advanced',
  stability: 'stable',
  source: 'native',
  isIO: true,

  inputs: [],

  widgets: [
    {
      name: 'clip_name1',
      type: 'COMBO',
      label: 'CLIP 文件名1',
      description: '第一个 CLIP 模型文件名',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI text_encoders 目录动态获取列表
        return [];
      },
    },
    {
      name: 'clip_name2',
      type: 'COMBO',
      label: 'CLIP 文件名2',
      description: '第二个 CLIP 模型文件名',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI text_encoders 目录动态获取列表
        return [];
      },
    },
    {
      name: 'type',
      type: 'COMBO',
      label: '双 CLIP 架构类型',
      description: '双 CLIP 架构类型，决定编码器组合方式',
      required: true,
      options: [
        'sdxl',
        'sd3',
        'flux',
        'hunyuan_video',
        'hidream',
        'hunyuan_image',
        'hunyuan_video_15',
        'kandinsky5',
        'kandinsky5_image',
        'ltxv',
        'newbie',
        'ace',
      ],
    },
    {
      name: 'device',
      type: 'COMBO',
      label: '加载设备',
      description: '模型加载设备，选择 CPU 可节省显存',
      default: 'default',
      advanced: true,
      options: ['default', 'cpu'],
    },
  ],

  outputs: [
    {
      name: 'CLIP',
      type: 'CLIP',
      label: 'CLIP',
      description: '组合后的双 CLIP 模型',
      slotIndex: 0,
    },
  ],

  tags: ['clip', 'loader', 'dual', 'sdxl', 'flux', 'advanced'],
};

// ---------------------------------------------------------------------------
// UNETLoader
// ---------------------------------------------------------------------------

/**
 * UNETLoader 节点预设
 * 单独加载扩散模型（UNET），支持多种精度选项
 */
export const UNETLoader: NodePreset = {
  type: 'UNETLoader',
  name: 'UNET 加载器',
  description: '单独加载扩散模型（UNET），支持多种精度选项，适用于自定义模型组合',
  category: 'advanced',
  stability: 'stable',
  source: 'native',
  isIO: true,

  inputs: [],

  widgets: [
    {
      name: 'unet_name',
      type: 'COMBO',
      label: '扩散模型文件名',
      description: '扩散模型文件名，从 diffusion_models 目录选择',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI diffusion_models 目录动态获取列表
        return [];
      },
    },
    {
      name: 'weight_dtype',
      type: 'COMBO',
      label: '权重精度类型',
      description: '模型权重精度，fp8 可减少内存占用',
      default: 'default',
      options: ['default', 'fp8_e4m3fn', 'fp8_e4m3fn_fast', 'fp8_e5m2'],
    },
  ],

  outputs: [
    {
      name: 'MODEL',
      type: 'MODEL',
      label: '模型',
      description: '加载的扩散模型',
      slotIndex: 0,
    },
  ],

  tags: ['unet', 'loader', 'model', 'fp8', 'advanced'],
};

// ---------------------------------------------------------------------------
// DiffusersLoader (deprecated)
// ---------------------------------------------------------------------------

/**
 * DiffusersLoader 节点预设
 * 从 Diffusers 格式模型目录加载模型、CLIP 和 VAE（已弃用）
 */
export const DiffusersLoader: NodePreset = {
  type: 'DiffusersLoader',
  name: 'Diffusers 加载器',
  description: '从 Diffusers 格式模型目录加载模型、CLIP 和 VAE（已弃用，建议使用其他标准加载节点）',
  category: 'advanced',
  stability: 'deprecated',
  source: 'native',
  isIO: true,

  inputs: [],

  widgets: [
    {
      name: 'model_path',
      type: 'COMBO',
      label: '模型路径',
      description: 'Diffusers 模型路径，从搜索路径中自动发现',
      required: true,
      options: () => {
        // TODO: 实现从 diffusers 搜索路径动态获取列表
        return [];
      },
    },
  ],

  outputs: [
    {
      name: 'MODEL',
      type: 'MODEL',
      label: '模型',
      description: '扩散模型',
      slotIndex: 0,
    },
    {
      name: 'CLIP',
      type: 'CLIP',
      label: 'CLIP',
      description: 'CLIP 文本编码器',
      slotIndex: 1,
    },
    {
      name: 'VAE',
      type: 'VAE',
      label: 'VAE',
      description: 'VAE 编解码器',
      slotIndex: 2,
    },
  ],

  tags: ['diffusers', 'loader', 'deprecated'],
};

// ---------------------------------------------------------------------------
// 导出数组
// ---------------------------------------------------------------------------

/**
 * Advanced 类节点预设数组
 */
export const advancedPresets: NodePreset[] = [
  ConditioningSetTimestepRange,
  ConditioningZeroOut,
  CLIPLoader,
  DualCLIPLoader,
  UNETLoader,
  DiffusersLoader,
];
