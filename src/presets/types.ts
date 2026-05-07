/**
 * 预设节点类型系统
 * 用于定义 ComfyUI 节点的类型约束和校验规格
 */

import type { ComfyDataType } from '../types.js';

// ---------------------------------------------------------------------------
// 校验模式
// ---------------------------------------------------------------------------

/**
 * 校验模式
 * - strict: 严格模式，类型不匹配时报错
 * - warn: 警告模式，类型不匹配时发出警告
 * - none: 关闭校验
 */
export type ValidationMode = 'strict' | 'warn' | 'none';

// ---------------------------------------------------------------------------
// Widget 类型定义
// ---------------------------------------------------------------------------

/**
 * Widget 基础类型
 * 对应 ComfyUI 的控件类型
 */
export type WidgetBaseType =
  | 'INT'      // 整数
  | 'FLOAT'    // 浮点数
  | 'STRING'   // 字符串
  | 'BOOLEAN'  // 布尔值
  | 'COMBO';   // 下拉选择

/**
 * Widget 参数规格
 */
export interface WidgetSpec {
  /** 参数名称 */
  name: string;
  /** 参数类型 */
  type: WidgetBaseType;
  /** 参数显示名称（中文） */
  label: string;
  /** 参数描述 */
  description?: string;
  /** 默认值 */
  default?: unknown;
  /** 最小值（INT/FLOAT） */
  min?: number;
  /** 最大值（INT/FLOAT） */
  max?: number;
  /** 步进值（INT/FLOAT） */
  step?: number;
  /**
   * 可选项列表（COMBO 类型）
   * 可以是字符串数组或函数（动态获取）
   */
  options?: string[] | (() => string[]);
  /** 是否必填 */
  required?: boolean;
  /** 是否为高级参数 */
  advanced?: boolean;
}

// ---------------------------------------------------------------------------
// 端口规格定义
// ---------------------------------------------------------------------------

/**
 * 输入端口规格
 */
export interface InputPortSpec {
  /** 端口名称（对应 ComfyUI 的 input name） */
  name: string;
  /** 数据类型 */
  type: ComfyDataType;
  /** 端口显示名称（中文） */
  label: string;
  /** 端口描述 */
  description?: string;
  /** 是否必填（必须有连线或 widget 值） */
  required?: boolean;
  /**
   * 是否为 Widget 端口
   * true: 该端口同时对应一个 widget，可接受连线或静态值
   * false: 该端口只能接受连线
   */
  isWidget?: boolean;
  /** slot 索引（在 ComfyUI 内部的位置） */
  slotIndex?: number;
}

/**
 * 输出端口规格
 */
export interface OutputPortSpec {
  /** 端口名称 */
  name: string;
  /** 数据类型 */
  type: ComfyDataType;
  /** 端口显示名称（中文） */
  label: string;
  /** 端口描述 */
  description?: string;
  /** slot 索引（在 ComfyUI 内部的位置） */
  slotIndex: number;
}

// ---------------------------------------------------------------------------
// 节点预设定义
// ---------------------------------------------------------------------------

/**
 * 节点分类
 * 支持主分类和子分类，格式为 "主分类" 或 "主分类/子分类"
 */
export type NodeCategory =
  | 'basics' // 基础节点
  | 'loaders' // 加载器
  | 'conditioning' // 条件编码
  | 'conditioning/controlnet' // ControlNet
  | 'conditioning/gligen' // GLIGEN
  | 'conditioning/inpaint' // 重绘
  | 'conditioning/style_model' // 风格模型
  | 'sampling' // 采样
  | 'latent' // 潜空间操作
  | 'latent/basic' // 潜空间基础操作
  | 'latent/batch' // 批处理
  | 'latent/inpaint' // 重绘
  | 'latent/transform' // 变换
  | 'image' // 图像处理
  | 'image/batch' // 图像批处理
  | 'image/color' // 图像颜色
  | 'image/transform' // 图像变换
  | 'image/upscaling' // 图像放大
  | 'mask' // 掩码
  | 'advanced'; // 高级节点

/**
 * 节点来源类型
 */
export type NodeSourceType = 'native' | 'custom' | 'community';

/**
 * 节点稳定性状态
 */
export type NodeStability = 'stable' | 'beta' | 'deprecated';

/**
 * 控件规格（UI 层特有的控件，如 control_after_generate）
 */
export interface ControlWidgetSpec {
  /** 控件名称 */
  name: string;
  /** 控件类型 */
  type: 'control';
  /** 显示名称 */
  label: string;
  /** 默认值 */
  default?: string;
  /** 可选项列表 */
  options?: string[];
}

/**
 * UI 层数据
 * 包含 UI 格式特有的节点属性
 * 支持任意未知字段以容纳 ComfyUI 扩展属性
 */
export interface UIMetadata {
  /** 默认节点尺寸 [width, height] */
  size?: [number, number];
  /** 节点属性 */
  properties?: {
    cnr_id?: string;
    ver?: string;
    [key: string]: unknown;
  };
  /** 控件参数列表（如 control_after_generate） */
  controlWidgets?: ControlWidgetSpec[];
  /** 其他 UI 层未知字段 */
  [key: string]: unknown;
}

/**
 * 节点预设定义
 * 描述一个 ComfyUI 节点的完整规格
 */
export interface NodePreset {
  // === 元信息 ===
  /** 节点类型（class_type），如 "KSampler" */
  type: string;
  /** 节点显示名称（中文） */
  name: string;
  /** 一句话描述 */
  description: string;
  /** 节点分类 */
  category: NodeCategory;
  /** 节点稳定性 */
  stability?: NodeStability;
  /** 来源模块 */
  source?: string;
  /** 节点来源类型 */
  sourceType?: NodeSourceType;

  // === 输入定义 ===
  /** 输入端口列表 */
  inputs: InputPortSpec[];
  /** Widget 参数列表（仅包含非端口的纯控件参数） */
  widgets: WidgetSpec[];

  // === 输出定义 ===
  /** 输出端口列表 */
  outputs: OutputPortSpec[];

  // === UI 层数据 ===
  /** UI 格式特有的节点属性 */
  ui?: UIMetadata;

  /** @deprecated 使用 ui 替代 */
  uiMetadata?: UIMetadata;

  // === 元数据 ===
  /** 是否为 IO 节点（通常无输入或无输出） */
  isIO?: boolean;
  /** 标签/标记 */
  tags?: string[];
  /** 文档链接 */
  docUrl?: string;
}

// ---------------------------------------------------------------------------
// 类型守卫与辅助类型
// ---------------------------------------------------------------------------

/**
 * 从 NodePreset 提取输入端口类型映射
 */
export type ExtractInputTypes<T extends NodePreset> = {
  [K in T['inputs'][number] as K['name']]: K['type'];
};

/**
 * 从 NodePreset 提取输出端口类型映射
 */
export type ExtractOutputTypes<T extends NodePreset> = {
  [K in T['outputs'][number] as K['name']]: K['type'];
};

/**
 * 从 NodePreset 提取 Widget 参数类型映射
 */
export type ExtractWidgetTypes<T extends NodePreset> = {
  [K in T['widgets'][number] as K['name']]: K['type'] extends 'INT' | 'FLOAT'
    ? number
    : K['type'] extends 'BOOLEAN'
    ? boolean
    : string;
};
