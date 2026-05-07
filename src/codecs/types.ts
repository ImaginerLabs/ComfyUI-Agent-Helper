import type {
  StepDefinition,
  CrossStepLink,
  UIGroup,
} from '../types.js';
import type { ValidationMode } from '../presets/types.js';
import type { ValidationIssue } from '../validate/types.js';

/**
 * 格式标识符
 */
export type FormatId =
  | 'api-v1'
  | 'ui-v1.0' // 最新，links 是对象数组
  | 'ui-v0.4' // 旧版，links 是数字数组
  | 'blueprint-v1';

/**
 * 格式族（用于模糊匹配）
 */
export type FormatFamily = 'api' | 'ui' | 'blueprint';

/**
 * 格式信息
 */
export interface FormatInfo {
  /** 格式 ID */
  id: FormatId;
  /** 格式族 */
  family: FormatFamily;
  /** 版本号 */
  version: string;
  /** 人类可读名称 */
  displayName: string;
  /** 是否支持完整往返 */
  roundtripCapable: boolean;
}

/**
 * 统一的内部工作流表示
 * 能容纳所有格式的信息
 */
export interface UnifiedWorkflow {
  /** 工作流 ID */
  id: string;
  /** 工作流名称 */
  name?: string;

  // === 核心数据 ===
  /** Step 定义 */
  steps: Map<string, StepDefinition>;
  /** 跨 Step 连接 */
  crossLinks: CrossStepLink[];

  // === UI 元数据 ===
  ui?: {
    last_node_id: number;
    last_link_id: number;
    groups: UIGroup[];
    config: Record<string, unknown>;
    extra: Record<string, unknown>;
    version: number;
    viewport?: { scale: number; offset: [number, number] };
  };

  // === Blueprint 元数据 ===
  blueprint?: {
    revision: number;
    category?: string;
  };

  // === 来源信息（用于往返） ===
  source?: {
    format: FormatId;
    /** 原始 JSON 的未知字段 */
    raw?: Record<string, unknown>;
  };
}

/**
 * 解码选项
 */
export interface DecodeOptions {
  /** 导入为单个 Step */
  asSingleStep?: boolean;
  /** Step ID */
  stepId?: string;
  /** Step 名称 */
  stepName?: string;
}

/**
 * 解码结果
 */
export interface DecodeResult {
  workflow: UnifiedWorkflow;
  detectedFormat: FormatInfo;
  warnings?: string[];
}

/**
 * 编码选项
 */
export interface EncodeOptions {
  /** 目标格式 */
  format: FormatId;
  /** 校验模式 */
  validateLinks?: ValidationMode;
  /** 是否包含元数据 */
  includeMetadata?: boolean;
}

/**
 * 编码结果
 */
export interface EncodeResult {
  data: unknown;
  format: FormatInfo;
  warnings?: ValidationIssue[];
}

/**
 * 编解码器接口
 */
export interface WorkflowCodec {
  /** 格式信息 */
  readonly format: FormatInfo;

  /**
   * 检测是否匹配此格式
   * @param data 待检测数据
   * @returns 置信度 0-1，0 表示不匹配，1 表示完全匹配
   */
  detect(data: unknown): number;

  /**
   * 解码：外部格式 → 内部表示
   */
  decode(data: unknown, options?: DecodeOptions): DecodeResult;

  /**
   * 编码：内部表示 → 外部格式
   */
  encode(workflow: UnifiedWorkflow, options?: EncodeOptions): EncodeResult;
}
