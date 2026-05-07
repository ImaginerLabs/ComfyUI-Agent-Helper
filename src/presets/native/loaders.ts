/**
 * Loaders 节点预设定义
 * 包含模型加载相关节点：CheckpointLoaderSimple、VAELoader、LoraLoader 等
 */

import type { NodePreset } from '../types.js';

/**
 * CheckpointLoaderSimple - 简易检查点加载器
 * 加载扩散模型检查点，自动推断模型配置
 */
export const checkpointLoaderSimplePreset: NodePreset = {
  type: 'CheckpointLoaderSimple',
  name: '简易检查点加载器',
  description: '加载扩散模型检查点，自动推断模型配置，返回模型、CLIP 和 VAE',
  category: 'loaders',
  stability: 'stable',
  source: 'native',
  isIO: true,
  inputs: [],
  widgets: [
    {
      name: 'ckpt_name',
      type: 'COMBO',
      label: '检查点名称',
      description: '检查点文件名称，从 checkpoints 目录选择',
      required: true,
      // 动态获取 checkpoints 列表
      options: () => {
        // TODO: 实现从 ComfyUI checkpoints 目录动态获取列表
        return [];
      },
    },
  ],
  outputs: [
    {
      name: 'MODEL',
      type: 'MODEL',
      label: '模型',
      description: '用于去噪的扩散模型',
      slotIndex: 0,
    },
    {
      name: 'CLIP',
      type: 'CLIP',
      label: 'CLIP',
      description: '用于文本编码的 CLIP 模型',
      slotIndex: 1,
    },
    {
      name: 'VAE',
      type: 'VAE',
      label: 'VAE',
      description: '用于图像编解码的 VAE 模型',
      slotIndex: 2,
    },
  ],
  tags: ['native', 'stable', 'IO', 'checkpoint', 'model', 'loader', 'sd', 'sdxl'],
};

/**
 * CheckpointLoader - 检查点加载器（已废弃）
 * 加载扩散模型检查点，需手动指定配置文件
 * @deprecated 建议使用 CheckpointLoaderSimple
 */
export const checkpointLoaderPreset: NodePreset = {
  type: 'CheckpointLoader',
  name: '检查点加载器',
  description: '加载扩散模型检查点，需手动指定配置文件（已废弃，建议使用 CheckpointLoaderSimple）',
  category: 'loaders',
  stability: 'deprecated',
  source: 'native',
  isIO: true,
  inputs: [],
  widgets: [
    {
      name: 'config_name',
      type: 'COMBO',
      label: '配置名称',
      description: '模型配置文件名称，从 configs 目录选择',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI configs 目录动态获取列表
        return [];
      },
    },
    {
      name: 'ckpt_name',
      type: 'COMBO',
      label: '检查点名称',
      description: '检查点文件名称，从 checkpoints 目录选择',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI checkpoints 目录动态获取列表
        return [];
      },
    },
  ],
  outputs: [
    {
      name: 'MODEL',
      type: 'MODEL',
      label: '模型',
      description: '用于去噪的扩散模型',
      slotIndex: 0,
    },
    {
      name: 'CLIP',
      type: 'CLIP',
      label: 'CLIP',
      description: '用于文本编码的 CLIP 模型',
      slotIndex: 1,
    },
    {
      name: 'VAE',
      type: 'VAE',
      label: 'VAE',
      description: '用于图像编解码的 VAE 模型',
      slotIndex: 2,
    },
  ],
  tags: ['native', 'deprecated', 'IO', 'checkpoint', 'model', 'loader'],
};

/**
 * VAELoader - VAE 加载器
 * 从文件加载 VAE 模型，支持标准 VAE、TAESD 系列和像素空间编码
 */
export const vaeLoaderPreset: NodePreset = {
  type: 'VAELoader',
  name: 'VAE 加载器',
  description: '从文件加载 VAE 模型，支持标准 VAE、TAESD 系列和像素空间编码',
  category: 'loaders',
  stability: 'stable',
  source: 'native',
  isIO: true,
  inputs: [],
  widgets: [
    {
      name: 'vae_name',
      type: 'COMBO',
      label: 'VAE 名称',
      description: 'VAE 文件名（包含标准 VAE、TAE 系列、pixel_space）',
      required: true,
      // 动态获取 VAE 列表
      options: () => {
        // TODO: 实现从 ComfyUI vae/vae_approx 目录动态获取列表
        return [];
      },
    },
  ],
  outputs: [
    {
      name: 'VAE',
      type: 'VAE',
      label: 'VAE',
      description: '加载的 VAE 编解码器',
      slotIndex: 0,
    },
  ],
  tags: ['native', 'stable', 'IO', 'vae', 'loader', 'tae', 'encoder', 'decoder'],
};

/**
 * LoraLoader - LoRA 加载器
 * 将 LoRA 权重应用到扩散模型和 CLIP 模型，实现风格或内容的微调
 */
export const loraLoaderPreset: NodePreset = {
  type: 'LoraLoader',
  name: 'LoRA 加载器',
  description: '将 LoRA 权重应用到扩散模型和 CLIP 模型，实现风格或内容的微调',
  category: 'loaders',
  stability: 'stable',
  source: 'native',
  isIO: false,
  inputs: [
    {
      name: 'model',
      type: 'MODEL',
      label: '模型',
      description: '要应用 LoRA 的扩散模型',
      required: true,
    },
    {
      name: 'clip',
      type: 'CLIP',
      label: 'CLIP',
      description: '要应用 LoRA 的 CLIP 模型',
      required: true,
    },
  ],
  widgets: [
    {
      name: 'lora_name',
      type: 'COMBO',
      label: 'LoRA 名称',
      description: 'LoRA 文件名',
      required: true,
      // 动态获取 loras 列表
      options: () => {
        // TODO: 实现从 ComfyUI loras 目录动态获取列表
        return [];
      },
    },
    {
      name: 'strength_model',
      type: 'FLOAT',
      label: '模型强度',
      description: '对扩散模型的修改强度，可为负值',
      default: 1.0,
      min: -100.0,
      max: 100.0,
    },
    {
      name: 'strength_clip',
      type: 'FLOAT',
      label: 'CLIP 强度',
      description: '对 CLIP 的修改强度，可为负值',
      default: 1.0,
      min: -100.0,
      max: 100.0,
    },
  ],
  outputs: [
    {
      name: 'MODEL',
      type: 'MODEL',
      label: '模型',
      description: '应用 LoRA 后的扩散模型',
      slotIndex: 0,
    },
    {
      name: 'CLIP',
      type: 'CLIP',
      label: 'CLIP',
      description: '应用 LoRA 后的 CLIP 模型',
      slotIndex: 1,
    },
  ],
  tags: ['native', 'stable', 'lora', 'loader', 'finetune', 'style', 'character'],
};

/**
 * LoraLoaderModelOnly - LoRA 加载器（仅模型）
 * 仅将 LoRA 权重应用到扩散模型，不影响 CLIP 模型
 */
export const loraLoaderModelOnlyPreset: NodePreset = {
  type: 'LoraLoaderModelOnly',
  name: 'LoRA 加载器（仅模型）',
  description: '仅将 LoRA 权重应用到扩散模型，不影响 CLIP 模型',
  category: 'loaders',
  stability: 'stable',
  source: 'native',
  isIO: false,
  inputs: [
    {
      name: 'model',
      type: 'MODEL',
      label: '模型',
      description: '要应用 LoRA 的扩散模型',
      required: true,
    },
  ],
  widgets: [
    {
      name: 'lora_name',
      type: 'COMBO',
      label: 'LoRA 名称',
      description: 'LoRA 文件名',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI loras 目录动态获取列表
        return [];
      },
    },
    {
      name: 'strength_model',
      type: 'FLOAT',
      label: '模型强度',
      description: '对扩散模型的修改强度，可为负值',
      default: 1.0,
      min: -100.0,
      max: 100.0,
    },
  ],
  outputs: [
    {
      name: 'MODEL',
      type: 'MODEL',
      label: '模型',
      description: '应用 LoRA 后的扩散模型',
      slotIndex: 0,
    },
  ],
  tags: ['native', 'stable', 'lora', 'loader', 'finetune', 'model-only'],
};

/**
 * CLIPVisionLoader - CLIP Vision 加载器
 * 加载 CLIP Vision 图像编码器模型
 */
export const clipVisionLoaderPreset: NodePreset = {
  type: 'CLIPVisionLoader',
  name: 'CLIP Vision 加载器',
  description: '加载 CLIP Vision 图像编码器模型，用于图像条件生成、风格迁移等场景',
  category: 'loaders',
  stability: 'stable',
  source: 'native',
  isIO: true,
  inputs: [],
  widgets: [
    {
      name: 'clip_name',
      type: 'COMBO',
      label: 'CLIP 名称',
      description: 'CLIP Vision 文件名，从 clip_vision 目录选择',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI clip_vision 目录动态获取列表
        return [];
      },
    },
  ],
  outputs: [
    {
      name: 'CLIP_VISION',
      type: 'CLIP_VISION',
      label: 'CLIP Vision',
      description: '加载的 CLIP Vision 模型',
      slotIndex: 0,
    },
  ],
  tags: ['native', 'stable', 'IO', 'clip', 'vision', 'loader', 'image-encoder'],
};

/**
 * ControlNetLoader - ControlNet 加载器
 * 从文件加载 ControlNet 模型，用于图像条件引导生成
 */
export const controlNetLoaderPreset: NodePreset = {
  type: 'ControlNetLoader',
  name: 'ControlNet 加载器',
  description: '从文件加载 ControlNet 模型，用于图像条件引导生成',
  category: 'loaders',
  stability: 'stable',
  source: 'native',
  isIO: true,
  inputs: [],
  widgets: [
    {
      name: 'control_net_name',
      type: 'COMBO',
      label: 'ControlNet 名称',
      description: 'ControlNet 文件名，从 controlnet 目录选择',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI controlnet 目录动态获取列表
        return [];
      },
    },
  ],
  outputs: [
    {
      name: 'CONTROL_NET',
      type: 'CONTROL_NET',
      label: 'ControlNet',
      description: '加载的 ControlNet 模型',
      slotIndex: 0,
    },
  ],
  tags: ['native', 'stable', 'IO', 'controlnet', 'loader', 'conditioning'],
};

/**
 * DiffControlNetLoader - 扩散模型兼容 ControlNet 加载器
 * 加载与特定扩散模型兼容的 ControlNet，需要传入模型参数
 */
export const diffControlNetLoaderPreset: NodePreset = {
  type: 'DiffControlNetLoader',
  name: '扩散模型兼容 ControlNet 加载器',
  description: '加载与特定扩散模型兼容的 ControlNet，需要传入模型参数',
  category: 'loaders',
  stability: 'stable',
  source: 'native',
  isIO: false,
  inputs: [
    {
      name: 'model',
      type: 'MODEL',
      label: '模型',
      description: '用于确定 ControlNet 加载方式的扩散模型',
      required: true,
    },
  ],
  widgets: [
    {
      name: 'control_net_name',
      type: 'COMBO',
      label: 'ControlNet 名称',
      description: 'ControlNet 文件名，从 controlnet 目录选择',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI controlnet 目录动态获取列表
        return [];
      },
    },
  ],
  outputs: [
    {
      name: 'CONTROL_NET',
      type: 'CONTROL_NET',
      label: 'ControlNet',
      description: '加载的 ControlNet 模型',
      slotIndex: 0,
    },
  ],
  tags: ['native', 'stable', 'controlnet', 'loader', 'diffusers', 'conditioning'],
};

/**
 * GLIGENLoader - GLIGEN 加载器
 * 加载 GLIGEN 模型，用于实现空间定位的文本条件生成
 */
export const gligenLoaderPreset: NodePreset = {
  type: 'GLIGENLoader',
  name: 'GLIGEN 加载器',
  description: '加载 GLIGEN 模型，用于实现空间定位的文本条件生成',
  category: 'loaders',
  stability: 'stable',
  source: 'native',
  isIO: true,
  inputs: [],
  widgets: [
    {
      name: 'gligen_name',
      type: 'COMBO',
      label: 'GLIGEN 名称',
      description: 'GLIGEN 文件名，从 gligen 目录选择',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI gligen 目录动态获取列表
        return [];
      },
    },
  ],
  outputs: [
    {
      name: 'GLIGEN',
      type: 'GLIGEN',
      label: 'GLIGEN',
      description: '加载的 GLIGEN 模型',
      slotIndex: 0,
    },
  ],
  tags: ['native', 'stable', 'IO', 'gligen', 'loader', 'grounded-generation'],
};

/**
 * StyleModelLoader - 风格模型加载器
 * 加载风格模型，用于实现图像风格迁移
 */
export const styleModelLoaderPreset: NodePreset = {
  type: 'StyleModelLoader',
  name: '风格模型加载器',
  description: '加载风格模型，用于实现图像风格迁移',
  category: 'loaders',
  stability: 'stable',
  source: 'native',
  isIO: true,
  inputs: [],
  widgets: [
    {
      name: 'style_model_name',
      type: 'COMBO',
      label: '风格模型名称',
      description: '风格模型文件名，从 style_models 目录选择',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI style_models 目录动态获取列表
        return [];
      },
    },
  ],
  outputs: [
    {
      name: 'STYLE_MODEL',
      type: 'STYLE_MODEL',
      label: '风格模型',
      description: '加载的风格模型',
      slotIndex: 0,
    },
  ],
  tags: ['native', 'stable', 'IO', 'style', 'loader', 'style-transfer'],
};

/**
 * unCLIPCheckpointLoader - unCLIP 检查点加载器
 * 加载 unCLIP 架构的检查点模型，输出模型、CLIP、VAE 和 CLIP Vision 四个组件
 */
export const unclipCheckpointLoaderPreset: NodePreset = {
  type: 'unCLIPCheckpointLoader',
  name: 'unCLIP 检查点加载器',
  description: '加载 unCLIP 架构的检查点模型，输出模型、CLIP、VAE 和 CLIP Vision 四个组件',
  category: 'loaders',
  stability: 'stable',
  source: 'native',
  isIO: true,
  inputs: [],
  widgets: [
    {
      name: 'ckpt_name',
      type: 'COMBO',
      label: '检查点名称',
      description: '检查点文件名，从 checkpoints 目录选择',
      required: true,
      options: () => {
        // TODO: 实现从 ComfyUI checkpoints 目录动态获取列表
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
    {
      name: 'CLIP_VISION',
      type: 'CLIP_VISION',
      label: 'CLIP Vision',
      description: 'CLIP Vision 图像编码器',
      slotIndex: 3,
    },
  ],
  tags: ['native', 'stable', 'IO', 'checkpoint', 'unclip', 'loader', 'image-conditioning'],
};

/**
 * Loaders 节点预设数组
 */
export const loadersPresets: NodePreset[] = [
  checkpointLoaderSimplePreset,
  checkpointLoaderPreset,
  vaeLoaderPreset,
  loraLoaderPreset,
  loraLoaderModelOnlyPreset,
  clipVisionLoaderPreset,
  controlNetLoaderPreset,
  diffControlNetLoaderPreset,
  gligenLoaderPreset,
  styleModelLoaderPreset,
  unclipCheckpointLoaderPreset,
];
