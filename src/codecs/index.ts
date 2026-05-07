import type {
  UnifiedWorkflow,
  FormatInfo,
  DecodeOptions,
  EncodeOptions,
  DecodeResult,
  EncodeResult,
} from './types.js';
import { getCodecRegistry } from './registry.js';
import { generateWorkflowId } from '../utils/id-generator.js';

// 导入并注册所有编解码器
import './ui/index.js';
import './api/index.js';
import './blueprint/index.js';

/** 格式检测置信度阈值 */
const DETECTION_THRESHOLD = 0.5;

/**
 * 统一导入函数
 * 自动检测格式并解码为内部表示
 */
export function importWorkflow(
  data: unknown,
  options?: DecodeOptions
): DecodeResult {
  const registry = getCodecRegistry();

  let detectedFormat: FormatInfo | null = null;
  let bestConfidence = 0;

  for (const codec of registry.getAll()) {
    const confidence = codec.detect(data);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      detectedFormat = codec.format;
    }
  }

  if (!detectedFormat || bestConfidence < DETECTION_THRESHOLD) {
    throw new Error('Unable to detect workflow format');
  }

  const codec = registry.get(detectedFormat.id);
  if (!codec) {
    throw new Error(`No codec found for format: ${detectedFormat.id}`);
  }

  return codec.decode(data, options);
}

/**
 * 统一导出函数
 * 将内部表示编码为指定格式
 */
export function exportWorkflow(
  workflow: UnifiedWorkflow,
  options: EncodeOptions
): EncodeResult {
  const registry = getCodecRegistry();
  const codec = registry.get(options.format);

  if (!codec) {
    throw new Error(`No codec found for format: ${options.format}`);
  }

  return codec.encode(workflow, options);
}

/**
 * 检测格式
 * 返回格式信息，不进行完整解码
 */
export function detectFormat(data: unknown): FormatInfo | null {
  const registry = getCodecRegistry();
  let bestFormat: FormatInfo | null = null;
  let bestConfidence = 0;

  for (const codec of registry.getAll()) {
    const confidence = codec.detect(data);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestFormat = codec.format;
    }
  }

  return bestFormat && bestConfidence >= DETECTION_THRESHOLD ? bestFormat : null;
}

/**
 * 获取支持的格式列表
 */
export function getSupportedFormats(): FormatInfo[] {
  return getCodecRegistry().getAll().map((c) => c.format);
}

/**
 * 创建新的工作流
 */
export function createUnifiedWorkflow(id?: string): UnifiedWorkflow {
  return {
    id: id ?? generateWorkflowId(),
    steps: new Map(),
    crossLinks: [],
  };
}

// 重新导出类型
export type {
  UnifiedWorkflow,
  FormatId,
  FormatInfo,
  DecodeOptions,
  EncodeOptions,
  DecodeResult,
  EncodeResult,
} from './types.js';
