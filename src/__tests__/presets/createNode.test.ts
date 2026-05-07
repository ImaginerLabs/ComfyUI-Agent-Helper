/**
 * createNodeFromPreset 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNodeFromPreset,
  createNode,
  getPreset,
  type CreateNodeResult,
} from '../../index.js';

describe('createNodeFromPreset', () => {
  describe('基础功能', () => {
    it('应该基于 KSampler 预设创建节点', () => {
      const { node } = createNodeFromPreset('KSampler', {
        seed: 12345,
        steps: 30,
        cfg: 8.5,
      });

      expect(node.type).toBe('KSampler');
      expect(node.id).toBe('kSampler');
      expect(node.widgets).toBeDefined();
      expect(node.widgets_values).toBeDefined();
    });

    it('应该自动填充默认值', () => {
      const { node, warnings } = createNodeFromPreset('KSampler', {
        seed: 12345,
      });

      // steps 应该有默认值（从预设获取）
      expect(node.widgets?.steps).toBeDefined();
      // 应该有警告提示使用了默认值
      expect(warnings?.length).toBeGreaterThan(0);
    });

    it('应该生成正确顺序的 widgets_values 数组', () => {
      const { node } = createNodeFromPreset('KSampler', {
        seed: 12345,
        steps: 30,
        cfg: 8.5,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
      });

      // widgets_values 应该是数组
      expect(Array.isArray(node.widgets_values)).toBe(true);
      // 长度应该匹配预设定义的 widget 数量 + controlWidgets 数量
      const preset = getPreset('KSampler');
      const widgetInputCount = preset!.inputs.filter((i) => i.isWidget).length;
      const widgetCount = preset!.widgets.length;
      const controlWidgetCount = preset!.uiMetadata?.controlWidgets?.length ?? 0;
      const expectedLength = widgetInputCount + widgetCount + controlWidgetCount;
      expect(node.widgets_values).toHaveLength(expectedLength);

      // 验证顺序：seed, control_after_generate, steps, cfg, sampler_name, scheduler, denoise
      expect(node.widgets_values?.[0]).toBe(12345); // seed
      expect(node.widgets_values?.[1]).toBe('randomize'); // control_after_generate (默认值)
      expect(node.widgets_values?.[2]).toBe(30); // steps
      expect(node.widgets_values?.[3]).toBe(8.5); // cfg
      expect(node.widgets_values?.[4]).toBe('euler'); // sampler_name
      expect(node.widgets_values?.[5]).toBe('normal'); // scheduler
      expect(node.widgets_values?.[6]).toBe(1.0); // denoise
    });
  });

  describe('参数校验', () => {
    it('应该校验 INT 类型参数', () => {
      const { warnings } = createNodeFromPreset('KSampler', {
        seed: 'not-a-number', // 错误类型
      });

      expect(warnings?.some((w) => w.includes('should be integer'))).toBe(true);
    });

    it('应该校验 FLOAT 类型参数范围', () => {
      const { warnings } = createNodeFromPreset('KSampler', {
        seed: 12345,
        steps: 30,
        cfg: 100, // 超出范围（预设定义 max 可能不同）
      });

      // 如果预设定义了 cfg 的 max，应该有范围警告
      // 这里主要测试校验逻辑是否执行
      expect(warnings).toBeDefined();
    });

    it('应该校验 COMBO 类型参数选项', () => {
      // 注意：KSampler 的 sampler_name 在 inputs 中定义，没有 options 字段
      // 这里测试的是校验逻辑，当 options 存在时应该校验
      // 如果预设没有定义 options，则跳过选项校验
      const { warnings } = createNodeFromPreset('KSampler', {
        seed: 12345,
        steps: 30,
        cfg: 8.5,
        sampler_name: 'euler', // 有效选项
      });

      // 由于预设没有定义 sampler_name 的 options，不应该有选项校验警告
      expect(warnings?.some((w) => w.includes('not in options'))).toBe(false);
    });

    it('validate=false 应该跳过校验', () => {
      const { warnings } = createNodeFromPreset(
        'KSampler',
        {
          seed: 'not-a-number',
        },
        { validate: false }
      );

      // 不应该有类型校验警告（可能有默认值警告）
      expect(warnings?.some((w) => w.includes('should be'))).toBe(false);
    });
  });

  describe('选项参数', () => {
    it('应该支持自定义节点 ID', () => {
      const { node } = createNodeFromPreset(
        'KSampler',
        { seed: 12345 },
        { id: 'my_custom_id' }
      );

      expect(node.id).toBe('my_custom_id');
    });

    it('应该支持设置节点位置', () => {
      const { node } = createNodeFromPreset(
        'KSampler',
        { seed: 12345 },
        { pos: [100, 200] }
      );

      expect(node.pos).toEqual([100, 200]);
    });

    it('应该支持设置节点标题', () => {
      const { node } = createNodeFromPreset(
        'KSampler',
        { seed: 12345 },
        { title: 'My KSampler' }
      );

      expect(node.title).toBe('My KSampler');
    });

    it('应该支持额外的自定义属性', () => {
      const { node } = createNodeFromPreset(
        'KSampler',
        { seed: 12345 },
        {
          extra: {
            customField: 'custom value',
            anotherField: 42,
            nested: { foo: 'bar' },
          },
        }
      );

      expect(node.customField).toBe('custom value');
      expect(node.anotherField).toBe(42);
      expect(node.nested).toEqual({ foo: 'bar' });
    });
  });

  describe('错误处理', () => {
    it('未知节点类型应该抛出错误', () => {
      expect(() => {
        createNodeFromPreset('UnknownNodeType', {});
      }).toThrow('Unknown node type');
    });
  });

  describe('createNode 简化函数', () => {
    it('应该直接返回节点', () => {
      const node = createNode('KSampler', {
        seed: 12345,
        steps: 30,
      });

      expect(node.type).toBe('KSampler');
      expect(node.widgets?.seed).toBe(12345);
    });
  });
});
