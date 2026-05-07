import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRegistry,
  registerPreset,
  getPreset,
  hasPreset,
  getRegistry,
} from '../../presets/registry.js';
import type { NodePreset } from '../../presets/types.js';

// 测试用的预设节点
const createTestPreset = (type: string, category: NodePreset['category'] = 'loaders'): NodePreset => ({
  type,
  name: `Test ${type}`,
  description: `Test preset for ${type}`,
  category,
  inputs: [],
  widgets: [],
  outputs: [],
});

describe('PresetRegistry', () => {
  describe('createRegistry', () => {
    it('创建独立的注册表实例', () => {
      const registry1 = createRegistry();
      const registry2 = createRegistry();

      expect(registry1).not.toBe(registry2);

      const preset = createTestPreset('TestNode1');
      registry1.registerPreset(preset);

      expect(registry1.hasPreset('TestNode1')).toBe(true);
      expect(registry2.hasPreset('TestNode1')).toBe(false);
    });

    it('新注册表为空', () => {
      const registry = createRegistry();
      expect(registry.getAllPresets()).toHaveLength(0);
    });
  });

  describe('registerPreset', () => {
    let registry: ReturnType<typeof createRegistry>;

    beforeEach(() => {
      registry = createRegistry();
    });

    it('注册单个预设节点', () => {
      const preset = createTestPreset('KSampler');
      registry.registerPreset(preset);

      expect(registry.hasPreset('KSampler')).toBe(true);
      expect(registry.getPreset('KSampler')).toEqual(preset);
    });

    it('注册多个预设节点', () => {
      const preset1 = createTestPreset('KSampler', 'sampling');
      const preset2 = createTestPreset('CheckpointLoaderSimple', 'loaders');

      registry.registerPreset(preset1);
      registry.registerPreset(preset2);

      expect(registry.getAllPresets()).toHaveLength(2);
    });

    it('重复注册相同 type 抛出错误', () => {
      const preset = createTestPreset('DuplicateNode');
      registry.registerPreset(preset);

      expect(() => registry.registerPreset(preset)).toThrow(
        'Preset with type "DuplicateNode" already exists'
      );
    });

    it('注册不同 type 的预设可以共存', () => {
      const preset1 = { ...createTestPreset('NodeA'), name: 'Node A' };
      const preset2 = { ...createTestPreset('NodeB'), name: 'Node B' };

      registry.registerPreset(preset1);
      registry.registerPreset(preset2);

      expect(registry.getAllPresets()).toHaveLength(2);
    });
  });

  describe('getPreset', () => {
    let registry: ReturnType<typeof createRegistry>;

    beforeEach(() => {
      registry = createRegistry();
    });

    it('获取已注册的预设', () => {
      const preset = createTestPreset('TestNode');
      registry.registerPreset(preset);

      const result = registry.getPreset('TestNode');
      expect(result).toEqual(preset);
    });

    it('获取不存在的预设返回 undefined', () => {
      expect(registry.getPreset('NonExistent')).toBeUndefined();
    });

    it('大小写敏感', () => {
      const preset = createTestPreset('KSampler');
      registry.registerPreset(preset);

      expect(registry.getPreset('KSampler')).toBeDefined();
      expect(registry.getPreset('ksampler')).toBeUndefined();
    });
  });

  describe('hasPreset', () => {
    let registry: ReturnType<typeof createRegistry>;

    beforeEach(() => {
      registry = createRegistry();
    });

    it('存在时返回 true', () => {
      const preset = createTestPreset('TestNode');
      registry.registerPreset(preset);

      expect(registry.hasPreset('TestNode')).toBe(true);
    });

    it('不存在时返回 false', () => {
      expect(registry.hasPreset('NonExistent')).toBe(false);
    });
  });

  describe('getPresetsByCategory', () => {
    let registry: ReturnType<typeof createRegistry>;

    beforeEach(() => {
      registry = createRegistry();
    });

    it('按分类获取预设', () => {
      const loaders = createTestPreset('CheckpointLoader', 'loaders');
      const sampling = createTestPreset('KSampler', 'sampling');
      const conditioning = createTestPreset('CLIPTextEncode', 'conditioning');

      registry.registerPreset(loaders);
      registry.registerPreset(sampling);
      registry.registerPreset(conditioning);

      expect(registry.getPresetsByCategory('loaders')).toHaveLength(1);
      expect(registry.getPresetsByCategory('loaders')[0].type).toBe('CheckpointLoader');

      expect(registry.getPresetsByCategory('sampling')).toHaveLength(1);
      expect(registry.getPresetsByCategory('conditioning')).toHaveLength(1);
    });

    it('空分类返回空数组', () => {
      expect(registry.getPresetsByCategory('loaders')).toHaveLength(0);
    });

    it('获取同一分类的多个预设', () => {
      registry.registerPreset(createTestPreset('Loader1', 'loaders'));
      registry.registerPreset(createTestPreset('Loader2', 'loaders'));
      registry.registerPreset(createTestPreset('Sampler', 'sampling'));

      const loaders = registry.getPresetsByCategory('loaders');
      expect(loaders).toHaveLength(2);
    });
  });

  describe('removePreset', () => {
    let registry: ReturnType<typeof createRegistry>;

    beforeEach(() => {
      registry = createRegistry();
    });

    it('移除存在的预设返回 true', () => {
      const preset = createTestPreset('TestNode');
      registry.registerPreset(preset);

      expect(registry.removePreset('TestNode')).toBe(true);
      expect(registry.hasPreset('TestNode')).toBe(false);
    });

    it('移除不存在的预设返回 false', () => {
      expect(registry.removePreset('NonExistent')).toBe(false);
    });
  });

  describe('clearPresets', () => {
    let registry: ReturnType<typeof createRegistry>;

    beforeEach(() => {
      registry = createRegistry();
    });

    it('清空所有预设', () => {
      registry.registerPreset(createTestPreset('Node1'));
      registry.registerPreset(createTestPreset('Node2'));
      registry.registerPreset(createTestPreset('Node3'));

      expect(registry.getAllPresets()).toHaveLength(3);

      registry.clearPresets();

      expect(registry.getAllPresets()).toHaveLength(0);
    });

    it('清空后可以重新注册', () => {
      registry.registerPreset(createTestPreset('Node1'));
      registry.clearPresets();

      // 不应抛出错误
      registry.registerPreset(createTestPreset('Node1'));
      expect(registry.hasPreset('Node1')).toBe(true);
    });
  });

  describe('全局注册表便捷函数', () => {
    // 使用独立的测试来避免污染其他测试的全局状态
    // 注意：全局注册表是单例，需要小心处理

    it('registerPreset 和 getPreset 操作全局注册表', () => {
      // 获取全局注册表并清空（测试隔离）
      const globalReg = getRegistry();
      const testType = `GlobalTest_${Date.now()}`;

      const preset = createTestPreset(testType);
      registerPreset(preset);

      expect(hasPreset(testType)).toBe(true);
      expect(getPreset(testType)).toEqual(preset);

      // 清理
      globalReg.removePreset(testType);
    });

    it('hasPreset 检查全局注册表', () => {
      const globalReg = getRegistry();
      const testType = `GlobalTest2_${Date.now()}`;

      expect(hasPreset(testType)).toBe(false);

      const preset = createTestPreset(testType);
      registerPreset(preset);

      expect(hasPreset(testType)).toBe(true);

      // 清理
      globalReg.removePreset(testType);
    });
  });
});
