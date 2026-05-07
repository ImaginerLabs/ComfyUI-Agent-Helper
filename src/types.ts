/**
 * ComfyUI 数据类型系统
 * 覆盖所有原生节点文档中出现的数据类型
 */
export type ComfyDataType =
  | 'MODEL'
  | 'CLIP'
  | 'VAE'
  | 'LATENT'
  | 'CONDITIONING'
  | 'IMAGE'
  | 'MASK'
  | 'CONTROL_NET'
  | 'CLIP_VISION'
  | 'CLIP_VISION_OUTPUT'
  | 'STYLE_MODEL'
  | 'GLIGEN'
  | string; // 允许扩展类型

/**
 * Step 定义 —— Agent 的独立设计单元
 */
export interface StepDefinition {
  /** Step 的唯一标识（在 Workflow 内唯一） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述这个 Step 是做什么的 */
  description?: string;
  /** Step 内部的节点列表 */
  nodes: StepNode[];
  /** 内部连线 */
  internalLinks: InternalLink[];
  /** 暴露给其他 Step 的输入端口 */
  inputs?: StepInputPort[];
  /** 暴露给其他 Step 的输出端口 */
  outputs?: StepOutputPort[];
  /** UI 位置（画布分组位置），不填则自动计算 */
  position?: { x: number; y: number };
}

/**
 * Step 内部的节点
 */
export interface StepNode {
  /** 在 Step 内部的唯一 ID（命名空间隔离） */
  id: string;
  /** ComfyUI 节点类型，如 "KSampler", "CheckpointLoaderSimple" */
  type: string;
  /** 一句话描述，帮助 Agent 理解节点用途 */
  description?: string;
  /** 节点分类标签，如 "loaders", "sampling", "conditioning" */
  category?: string;
  /**
   * 标量参数（静态输入值）。
   * 支持类型：INT(number)、FLOAT(number)、STRING(string)、BOOLEAN(boolean)、COMBO(string)
   * COMBO 类型值从预定义选项中选择，如 sampler_name: "euler"
   */
  widgets?: Record<string, unknown>;
  /** 节点标题 */
  title?: string;
  /** 节点在 Step 内部画布的相对位置 */
  position?: { x: number; y: number };
}

/**
 * Step 内部两个节点之间的连线
 */
export interface InternalLink {
  /** 来源：[nodeId, outputSlotIndex] */
  from: [string, number];
  /** 目标：[nodeId, inputName] */
  to: [string, string];
}

/**
 * Step 暴露给外部的输入端口
 */
export interface StepInputPort {
  /** 端口 ID，在 Step 内唯一 */
  id: string;
  /** 显示标签 */
  label: string;
  /** 数据类型 */
  type?: ComfyDataType;
  /** 映射到内部哪个节点的哪个输入 */
  target: [nodeId: string, inputName: string];
}

/**
 * Step 暴露给外部的输出端口
 */
export interface StepOutputPort {
  /** 端口 ID，在 Step 内唯一 */
  id: string;
  /** 显示标签 */
  label: string;
  /** 数据类型 */
  type?: ComfyDataType;
  /** 映射到内部哪个节点的哪个输出（slot 索引） */
  source: [nodeId: string, outputSlotIndex: number];
}

/**
 * 跨 Step 连接
 */
export interface CrossStepLink {
  /** 来源端口 */
  from: { stepId: string; portId: string };
  /** 目标端口 */
  to: { stepId: string; portId: string };
}

// ---------------------------------------------------------------------------
// Compose 输出类型
// ---------------------------------------------------------------------------

/**
 * ComfyUI API 格式的节点
 * 例：{ "1": { class_type: "KSampler", inputs: { ... } } }
 */
export interface ComfyAPINode {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

/**
 * ComfyUI UI 格式的节点
 */
export interface UINode {
  id: number;
  type: string;
  pos: [number, number];
  size?: [number, number];
  inputs?: UIInput[];
  outputs?: UIOutput[];
  widgets_values?: unknown[];
  title?: string;
}

export interface UIInput {
  name: string;
  type: string;
  link?: number;
}

export interface UIOutput {
  name: string;
  type: string;
  links?: number[];
  slot_index?: number;
}

export interface UILink {
  id: number;
  origin_id: number;
  origin_slot: number;
  target_id: number;
  target_slot: number;
  type: string;
}

export interface UIGroup {
  id: number;
  title: string;
  bounding: [number, number, number, number];
  color?: string;
  nodes?: number[];
}

export interface ComfyUIFormat {
  last_node_id: number;
  last_link_id: number;
  nodes: UINode[];
  links: (number | string)[];
  groups: UIGroup[];
  config: Record<string, unknown>;
  extra: Record<string, unknown>;
  version: number;
}

/**
 * compose() 的最终产出
 */
export interface ComfyUIWorkflow {
  apiFormat: Record<string, ComfyAPINode>;
  uiFormat?: ComfyUIFormat;
}

// ---------------------------------------------------------------------------
// Compose 选项
// ---------------------------------------------------------------------------

export interface ComposeOptions {
  /** 布局模式 */
  layout?: 'auto' | 'manual';
  /** 每个 Step 的默认宽度（像素） */
  stepWidth?: number;
  /** Step 之间的水平间距 */
  stepGapX?: number;
  /** Step 之间的垂直间距 */
  stepGapY?: number;
}

// ---------------------------------------------------------------------------
// Workflow 句柄
// ---------------------------------------------------------------------------

export interface WorkflowHandle {
  id: string;
}

export interface WorkflowOptions {
  name?: string;
}
