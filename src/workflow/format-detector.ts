import type { FormatType } from '../types.js';

/**
 * 检测 JSON 的格式类型
 * @param json 待检测的 JSON 对象
 * @returns 格式类型：'api' | 'ui' | 'blueprint' | 'unknown'
 */
export function detectFormat(json: unknown): FormatType {
  if (typeof json !== 'object' || json === null) {
    return 'unknown';
  }

  const obj = json as Record<string, unknown>;

  // 优先检测 Blueprint 格式（有 definitions.subgraphs）
  if (obj.definitions && typeof obj.definitions === 'object') {
    const defs = obj.definitions as Record<string, unknown>;
    if (Array.isArray(defs.subgraphs) && defs.subgraphs.length > 0) {
      return 'blueprint';
    }
  }

  // 检测 UI 格式（有 nodes 数组和 links 键）
  if (Array.isArray(obj.nodes) && obj.nodes.length > 0 && 'links' in obj) {
    return 'ui';
  }

  // 检测 API 格式（对象值为 {class_type, inputs} 结构）
  const keys = Object.keys(obj);
  if (
    keys.length > 0 &&
    keys.every((key) => {
      const val = obj[key];
      return (
        typeof val === 'object' &&
        val !== null &&
        'class_type' in val &&
        'inputs' in val
      );
    })
  ) {
    return 'api';
  }

  return 'unknown';
}