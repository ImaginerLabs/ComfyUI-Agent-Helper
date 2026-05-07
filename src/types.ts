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
 * 除了 id 和 type 是必需的，其他字段直接从原始 JSON 保留
 */
export interface StepNode {
  /** 在 Step 内部的唯一 ID（命名空间隔离） */
  id: string;
  /** ComfyUI 节点类型，如 "KSampler", "CheckpointLoaderSimple" */
  type: string;
  /** 原始节点 ID（数字，用于往返转换） */
  _originalId?: number;
  /** 节点位置 */
  pos?: [number, number];
  /** 节点大小 */
  size?: [number, number];
  /** 节点标志 */
  flags?: Record<string, unknown>;
  /** 执行顺序 */
  order?: number;
  /** 节点模式 */
  mode?: number;
  /** 输入端口 */
  inputs?: UIInput[];
  /** 输出端口 */
  outputs?: UIOutput[];
  /** 属性 */
  properties?: Record<string, unknown>;
  /** widget 值（从 blueprint 导入时使用） */
  widgets?: Record<string, unknown>;
  /** widget 值数组 */
  widgets_values?: unknown[];
  /** 节点标题 */
  title?: string;
  /** 其他未知字段 */
  [key: string]: unknown;
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
  id?: string;
  revision?: number;
  last_node_id: number;
  last_link_id: number;
  nodes: UINode[];
  links: (number | string)[][];
  groups: UIGroup[];
  config: Record<string, unknown>;
  extra: Record<string, unknown>;
  version: number;
  /** 其他未知字段 */
  [key: string]: unknown;
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

// ---------------------------------------------------------------------------
// 格式检测与导入
// ---------------------------------------------------------------------------

/**
 * ComfyUI 工作流格式类型
 */
export type FormatType = 'api' | 'ui' | 'blueprint' | 'unknown';

/**
 * 导入选项
 */
export interface ImportOptions {
  /** 导入格式，不指定则自动检测 */
  format?: FormatType;
  /** 导入为单个 Step（适用于 UI/API 格式），默认 true */
  asSingleStep?: boolean;
  /** 单 Step 模式下的 Step ID */
  stepId?: string;
  /** 单 Step 模式下的 Step 名称 */
  stepName?: string;
}

/**
 * 导入结果
 */
export interface ImportResult {
  /** 导入的 Step ID 列表 */
  importedStepIds: string[];
  /** 格式检测结果 */
  detectedFormat: FormatType;
  /** 导入过程中的警告 */
  warnings?: string[];
}
