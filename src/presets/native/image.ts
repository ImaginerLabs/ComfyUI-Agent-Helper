/**
 * 图像处理节点预设
 * 包含所有 image 类节点
 */

import type { NodePreset } from '../types.js';

/**
 * LoadImage - 从 ComfyUI 输入目录加载图像文件
 */
export const LoadImagePreset: NodePreset = {
  type: 'LoadImage',
  name: '加载图像',
  description: '从 ComfyUI 输入目录加载图像文件，支持静态图片和动画',
  category: 'image',
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
  tags: ['loader', 'image', 'input'],
};

/**
 * EmptyImage - 创建指定尺寸和颜色的空白图像
 */
export const EmptyImagePreset: NodePreset = {
  type: 'EmptyImage',
  name: '空白图像',
  description: '创建指定尺寸和颜色的空白图像',
  category: 'image',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [],
  widgets: [
    {
      name: 'width',
      type: 'INT',
      label: '宽度',
      description: '图像宽度（像素）',
      default: 512,
      min: 1,
      max: 16384,
    },
    {
      name: 'height',
      type: 'INT',
      label: '高度',
      description: '图像高度（像素）',
      default: 512,
      min: 1,
      max: 16384,
    },
    {
      name: 'batch_size',
      type: 'INT',
      label: '批次大小',
      description: '批次大小',
      default: 1,
      min: 1,
      max: 4096,
    },
    {
      name: 'color',
      type: 'INT',
      label: '颜色',
      description: '填充颜色（十六进制，如 0xFFFFFF 为白色）',
      default: 0,
      min: 0,
      max: 0xffffff,
    },
  ],

  outputs: [
    {
      name: 'IMAGE',
      type: 'IMAGE',
      label: '图像',
      description: '生成的空白图像',
      slotIndex: 0,
    },
  ],

  tags: ['image', 'empty', 'create'],
};

/**
 * PreviewImage - 预览图像而不保存到输出目录
 */
export const PreviewImagePreset: NodePreset = {
  type: 'PreviewImage',
  name: '预览图像',
  description: '预览图像而不保存到输出目录，图像保存到临时目录',
  category: 'image',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'images',
      type: 'IMAGE',
      label: '图像',
      description: '要预览的图像批次',
      required: true,
    },
  ],

  widgets: [],

  outputs: [],

  isIO: true,
  tags: ['preview', 'image', 'output', 'debug'],
};

/**
 * SaveImage - 将图像保存到 ComfyUI 的输出目录
 */
export const SaveImagePreset: NodePreset = {
  type: 'SaveImage',
  name: '保存图像',
  description: '将图像保存到 ComfyUI 的输出目录',
  category: 'image',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'images',
      type: 'IMAGE',
      label: '图像',
      description: '要保存的图像批次',
      required: true,
    },
  ],
  widgets: [
    {
      name: 'filename_prefix',
      type: 'STRING',
      label: '文件名前缀',
      description: '文件名前缀，支持格式化变量',
      default: 'ComfyUI',
    },
  ],

  outputs: [],

  isIO: true,
  tags: ['saver', 'image', 'output'],
};

/**
 * ImageBatch - 将两张图像合并为一个批次（已弃用）
 */
export const ImageBatchPreset: NodePreset = {
  type: 'ImageBatch',
  name: '图像批次合并',
  description: '将两张图像合并为一个批次（已弃用，建议使用其他方式处理批处理）',
  category: 'image/batch',
  stability: 'deprecated',
  source: 'nodes.py',

  inputs: [
    {
      name: 'image1',
      type: 'IMAGE',
      label: '图像1',
      description: '第一张图像（基准尺寸）',
      required: true,
    },
    {
      name: 'image2',
      type: 'IMAGE',
      label: '图像2',
      description: '第二张图像（会被调整以匹配 image1）',
      required: true,
    },
  ],

  widgets: [],

  outputs: [
    {
      name: 'IMAGE',
      type: 'IMAGE',
      label: '图像',
      description: '合并后的图像批次',
      slotIndex: 0,
    },
  ],

  tags: ['image', 'batch', 'deprecated'],
};

/**
 * ImageInvert - 反转图像颜色
 */
export const ImageInvertPreset: NodePreset = {
  type: 'ImageInvert',
  name: '图像反色',
  description: '反转图像颜色，将每个像素值从 x 变为 1-x',
  category: 'image/color',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'image',
      type: 'IMAGE',
      label: '图像',
      description: '要反转的图像张量',
      required: true,
    },
  ],

  widgets: [],

  outputs: [
    {
      name: 'IMAGE',
      type: 'IMAGE',
      label: '图像',
      description: '颜色反转后的图像',
      slotIndex: 0,
    },
  ],

  tags: ['image', 'color', 'invert', 'mask'],
};

/**
 * ImagePadForOutpaint - 扩展图像画布并生成用于 outpainting 的蒙版
 */
export const ImagePadForOutpaintPreset: NodePreset = {
  type: 'ImagePadForOutpaint',
  name: '图像外补画布',
  description: '扩展图像画布并生成用于 outpainting 的羽化蒙版',
  category: 'image/transform',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'image',
      type: 'IMAGE',
      label: '图像',
      description: '要扩展的原始图像',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'left',
      type: 'INT',
      label: '左侧填充',
      description: '左侧填充像素',
      default: 0,
      min: 0,
      max: 16384,
    },
    {
      name: 'top',
      type: 'INT',
      label: '顶部填充',
      description: '顶部填充像素',
      default: 0,
      min: 0,
      max: 16384,
    },
    {
      name: 'right',
      type: 'INT',
      label: '右侧填充',
      description: '右侧填充像素',
      default: 0,
      min: 0,
      max: 16384,
    },
    {
      name: 'bottom',
      type: 'INT',
      label: '底部填充',
      description: '底部填充像素',
      default: 0,
      min: 0,
      max: 16384,
    },
    {
      name: 'feathering',
      type: 'INT',
      label: '羽化宽度',
      description: '边缘羽化宽度',
      default: 40,
      min: 0,
      max: 16384,
    },
  ],

  outputs: [
    {
      name: 'IMAGE',
      type: 'IMAGE',
      label: '图像',
      description: '扩展后的图像',
      slotIndex: 0,
    },
    {
      name: 'MASK',
      type: 'MASK',
      label: '蒙版',
      description: '用于 outpainting 的羽化蒙版',
      slotIndex: 1,
    },
  ],

  tags: ['image', 'transform', 'outpaint', 'pad', 'canvas'],
};

/**
 * ImageScale - 将像素图像缩放到指定的尺寸
 */
export const ImageScalePreset: NodePreset = {
  type: 'ImageScale',
  name: '图像缩放',
  description: '使用指定的插值方法将图像调整到目标宽高',
  category: 'image/upscaling',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'image',
      type: 'IMAGE',
      label: '图像',
      description: '输入图像批次',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'upscale_method',
      type: 'COMBO',
      label: '插值方法',
      description: '插值方法',
      default: 'nearest-exact',
      options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'lanczos'],
    },
    {
      name: 'width',
      type: 'INT',
      label: '宽度',
      description: '目标像素宽度，0 表示保持宽高比',
      default: 512,
      min: 0,
      max: 16384,
    },
    {
      name: 'height',
      type: 'INT',
      label: '高度',
      description: '目标像素高度，0 表示保持宽高比',
      default: 512,
      min: 0,
      max: 16384,
    },
    {
      name: 'crop',
      type: 'COMBO',
      label: '裁剪方式',
      description: '裁剪方式',
      default: 'disabled',
      options: ['disabled', 'center'],
    },
  ],

  outputs: [
    {
      name: 'IMAGE',
      type: 'IMAGE',
      label: '图像',
      description: '缩放后的图像',
      slotIndex: 0,
    },
  ],

  tags: ['image', 'scale', 'resize', 'upscale'],
};

/**
 * ImageScaleBy - 按比例因子缩放像素图像
 */
export const ImageScaleByPreset: NodePreset = {
  type: 'ImageScaleBy',
  name: '图像按比例缩放',
  description: '按比例因子缩放像素图像，无需指定具体像素尺寸',
  category: 'image/upscaling',
  stability: 'stable',
  source: 'nodes.py',

  inputs: [
    {
      name: 'image',
      type: 'IMAGE',
      label: '图像',
      description: '输入图像批次',
      required: true,
    },
  ],

  widgets: [
    {
      name: 'upscale_method',
      type: 'COMBO',
      label: '插值方法',
      description: '插值方法',
      default: 'nearest-exact',
      options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'lanczos'],
    },
    {
      name: 'scale_by',
      type: 'FLOAT',
      label: '缩放比例',
      description: '缩放比例',
      default: 1.0,
      min: 0.01,
      max: 8.0,
    },
  ],

  outputs: [
    {
      name: 'IMAGE',
      type: 'IMAGE',
      label: '图像',
      description: '缩放后的图像',
      slotIndex: 0,
    },
  ],

  tags: ['image', 'scale', 'resize', 'upscale', 'ratio'],
};

/**
 * 图像处理节点预设列表
 */
export const imagePresets: NodePreset[] = [
  LoadImagePreset,
  EmptyImagePreset,
  PreviewImagePreset,
  SaveImagePreset,
  ImageBatchPreset,
  ImageInvertPreset,
  ImagePadForOutpaintPreset,
  ImageScalePreset,
  ImageScaleByPreset,
];
