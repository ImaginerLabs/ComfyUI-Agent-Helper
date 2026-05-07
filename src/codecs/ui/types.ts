import type { StepNode, UIInput, UIOutput, UIGroup } from '../../types.js';

/**
 * UI v1.0 格式的 Link（对象形式）
 */
export interface UILinkV1 {
  id: number;
  origin_id: number | string;
  origin_slot: number | string;
  target_id: number | string;
  target_slot: number | string;
  type: string | string[] | number;
}

/**
 * UI v0.4 格式的 Link（数组形式）
 * [linkId, originId, originSlot, targetId, targetSlot, type]
 */
export type UILinkV0 = [
  number, // id
  number | string, // origin_id
  number | string, // origin_slot
  number | string, // target_id
  number | string, // target_slot
  string | string[] | number, // type
];

/**
 * 统一的内部 Link 表示
 */
export interface NormalizedLink {
  id: number;
  origin_id: number | string;
  origin_slot: number | string;
  target_id: number | string;
  target_slot: number | string;
  type: string;
}

/**
 * UI 格式 JSON 结构
 */
export interface UIFormatJSON {
  id?: string;
  revision?: number;
  last_node_id?: number;
  last_link_id?: number;
  state?: {
    lastNodeId?: number;
    lastLinkId?: number;
    lastRerouteId?: number;
    lastGroupid?: number;
  };
  nodes: UINodeJSON[];
  links: UILinkV1[] | UILinkV0[];
  groups?: UIGroup[];
  config?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  version?: number;
  [key: string]: unknown;
}

/**
 * UI 格式节点结构
 */
export interface UINodeJSON {
  id: number | string;
  type: string;
  pos: [number, number] | { 0: number; 1: number };
  size?: [number, number] | { 0: number; 1: number };
  flags?: Record<string, unknown>;
  order?: number;
  mode?: number;
  inputs?: UIInput[];
  outputs?: UIOutput[];
  properties?: Record<string, unknown>;
  widgets_values?: unknown[] | Record<string, unknown>;
  title?: string;
  color?: string;
  bgcolor?: string;
  [key: string]: unknown;
}

/**
 * 检测 UI 格式版本
 */
export function detectUIVersion(data: unknown): 'v1.0' | 'v0.4' | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.nodes) || !('links' in obj)) return null;

  // 检查 version 字段
  if (typeof obj.version === 'number') {
    if (obj.version >= 1) return 'v1.0';
    return 'v0.4';
  }

  // 检查 state 字段（v1.0 特有）
  if ('state' in obj) return 'v1.0';

  // 检查 links 格式
  const links = obj.links;
  if (!Array.isArray(links) || links.length === 0) {
    return 'v0.4'; // 默认
  }

  const firstLink = links[0];
  if (typeof firstLink === 'object' && firstLink !== null && !Array.isArray(firstLink)) {
    return 'v1.0';
  }
  if (Array.isArray(firstLink)) {
    return 'v0.4';
  }

  return null;
}

/**
 * 标准化 Link 格式（v1.0 或 v0.4 → NormalizedLink）
 */
export function normalizeLinks(links: unknown): NormalizedLink[] {
  if (!Array.isArray(links)) return [];

  return links.map((link) => {
    if (Array.isArray(link)) {
      // v0.4 数组格式
      return {
        id: link[0],
        origin_id: link[1],
        origin_slot: link[2],
        target_id: link[3],
        target_slot: link[4],
        type: String(link[5]),
      };
    } else if (typeof link === 'object' && link !== null) {
      // v1.0 对象格式
      const obj = link as UILinkV1;
      return {
        id: obj.id,
        origin_id: obj.origin_id,
        origin_slot: obj.origin_slot,
        target_id: obj.target_id,
        target_slot: obj.target_slot,
        type: String(obj.type),
      };
    }
    throw new Error('Invalid link format');
  });
}

/**
 * 将 Link 转换为目标版本格式
 */
export function denormalizeLinks(
  links: NormalizedLink[],
  targetVersion: 'v1.0' | 'v0.4'
): unknown[] {
  if (targetVersion === 'v1.0') {
    return links.map((link) => ({
      id: link.id,
      origin_id: link.origin_id,
      origin_slot: link.origin_slot,
      target_id: link.target_id,
      target_slot: link.target_slot,
      type: link.type,
    }));
  } else {
    return links.map((link) => [
      link.id,
      link.origin_id,
      link.origin_slot,
      link.target_id,
      link.target_slot,
      link.type,
    ]);
  }
}

/**
 * 标准化节点位置
 */
export function normalizePos(pos: unknown): [number, number] {
  if (Array.isArray(pos) && pos.length >= 2) {
    return [pos[0], pos[1]];
  }
  if (typeof pos === 'object' && pos !== null) {
    const obj = pos as { 0?: number; 1?: number };
    if (typeof obj[0] === 'number' && typeof obj[1] === 'number') {
      return [obj[0], obj[1]];
    }
  }
  return [0, 0];
}

/**
 * 标准化节点大小
 */
export function normalizeSize(size: unknown): [number, number] | undefined {
  if (!size) return undefined;
  if (Array.isArray(size) && size.length >= 2) {
    return [size[0], size[1]];
  }
  if (typeof size === 'object' && size !== null) {
    const obj = size as { 0?: number; 1?: number };
    if (typeof obj[0] === 'number' && typeof obj[1] === 'number') {
      return [obj[0], obj[1]];
    }
  }
  return undefined;
}

/**
 * 转换 UI 节点到 StepNode
 */
export function convertUINodeToStepNode(uiNode: UINodeJSON): StepNode {
  return {
    ...uiNode, // 直接复制所有原始字段
    id: String(uiNode.id),
    type: uiNode.type,
    _originalId: typeof uiNode.id === 'number' ? uiNode.id : parseInt(String(uiNode.id), 10),
    pos: normalizePos(uiNode.pos),
    size: normalizeSize(uiNode.size),
  };
}