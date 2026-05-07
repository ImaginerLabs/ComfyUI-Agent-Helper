/**
 * 预设节点注册表
 * 提供预设节点的注册、查询和管理功能
 */

import type { NodePreset, NodeCategory } from './types.js';

// ---------------------------------------------------------------------------
// PresetRegistry 接口定义
// ---------------------------------------------------------------------------

/**
 * 预设节点注册表接口
 */
export interface PresetRegistry {
  /** 注册预设节点 */
  registerPreset(preset: NodePreset): void;
  /** 根据 nodeType 获取预设 */
  getPreset(nodeType: string): NodePreset | undefined;
  /** 获取所有预设 */
  getAllPresets(): NodePreset[];
  /** 根据分类获取预设 */
  getPresetsByCategory(category: NodeCategory): NodePreset[];
  /** 检查预设是否存在 */
  hasPreset(nodeType: string): boolean;
  /** 移除预设 */
  removePreset(nodeType: string): boolean;
  /** 清空所有预设 */
  clearPresets(): void;
}

// ---------------------------------------------------------------------------
// PresetRegistry 实现
// ---------------------------------------------------------------------------

/**
 * 预设节点注册表实现
 */
class PresetRegistryImpl implements PresetRegistry {
  private presets: Map<string, NodePreset> = new Map();

  registerPreset(preset: NodePreset): void {
    if (this.presets.has(preset.type)) {
      throw new Error(`Preset with type "${preset.type}" already exists`);
    }
    this.presets.set(preset.type, preset);
  }

  getPreset(nodeType: string): NodePreset | undefined {
    return this.presets.get(nodeType);
  }

  getAllPresets(): NodePreset[] {
    return Array.from(this.presets.values());
  }

  getPresetsByCategory(category: NodeCategory): NodePreset[] {
    return this.getAllPresets().filter((preset) => preset.category === category);
  }

  hasPreset(nodeType: string): boolean {
    return this.presets.has(nodeType);
  }

  removePreset(nodeType: string): boolean {
    return this.presets.delete(nodeType);
  }

  clearPresets(): void {
    this.presets.clear();
  }
}

// ---------------------------------------------------------------------------
// 全局单例与便捷函数
// ---------------------------------------------------------------------------

/** 全局注册表实例 */
let globalRegistry: PresetRegistry | null = null;

/**
 * 获取全局注册表实例
 * 懒加载初始化
 */
export function getRegistry(): PresetRegistry {
  if (!globalRegistry) {
    globalRegistry = new PresetRegistryImpl();
  }
  return globalRegistry;
}

/**
 * 创建新的注册表实例
 * 用于测试隔离等场景
 */
export function createRegistry(): PresetRegistry {
  return new PresetRegistryImpl();
}

// ---------------------------------------------------------------------------
// 便捷函数（直接操作全局注册表）
// ---------------------------------------------------------------------------

/**
 * 注册预设节点到全局注册表
 * @throws 如果已存在相同 type 的预设
 */
export function registerPreset(preset: NodePreset): void {
  getRegistry().registerPreset(preset);
}

/**
 * 从全局注册表获取预设
 */
export function getPreset(nodeType: string): NodePreset | undefined {
  return getRegistry().getPreset(nodeType);
}

/**
 * 检查全局注册表中是否存在指定预设
 */
export function hasPreset(nodeType: string): boolean {
  return getRegistry().hasPreset(nodeType);
}
