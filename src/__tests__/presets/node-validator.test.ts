import { describe, it, expect } from 'vitest';
import {
  validateWidgetValue,
  validateNode,
  validateInputType,
  isCompatibleType,
} from '../../validate/node-validator.js';
import type { WidgetSpec, NodePreset } from '../../presets/types.js';
import type { StepNode } from '../../types.js';

describe('NodeValidator', () => {
  describe('validateWidgetValue', () => {
    describe('INT 类型', () => {
      const intSpec: WidgetSpec = {
        name: 'steps',
        type: 'INT',
        label: '步数',
        min: 1,
        max: 100,
      };

      it('有效值通过校验', () => {
        const result = validateWidgetValue('steps', 20, intSpec);
        expect(result.valid).toBe(true);
        expect(result.message).toBeUndefined();
      });

      it('边界值通过校验', () => {
        expect(validateWidgetValue('steps', 1, intSpec).valid).toBe(true);
        expect(validateWidgetValue('steps', 100, intSpec).valid).toBe(true);
      });

      it('超出最小值', () => {
        const result = validateWidgetValue('steps', 0, intSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('小于最小值');
      });

      it('超出最大值', () => {
        const result = validateWidgetValue('steps', 101, intSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('大于最大值');
      });

      it('非数字值', () => {
        const result = validateWidgetValue('steps', '20', intSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('期望 INT 类型');
      });

      it('浮点数（非整数）', () => {
        const result = validateWidgetValue('steps', 20.5, intSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('期望整数');
      });

      it('无范围限制的 INT', () => {
        const noLimitSpec: WidgetSpec = {
          name: 'batch_size',
          type: 'INT',
          label: '批次大小',
        };

        expect(validateWidgetValue('batch_size', 999, noLimitSpec).valid).toBe(true);
        expect(validateWidgetValue('batch_size', -100, noLimitSpec).valid).toBe(true);
      });
    });

    describe('FLOAT 类型', () => {
      const floatSpec: WidgetSpec = {
        name: 'cfg',
        type: 'FLOAT',
        label: 'CFG',
        min: 0,
        max: 20,
        step: 0.5,
      };

      it('有效值通过校验', () => {
        const result = validateWidgetValue('cfg', 7.5, floatSpec);
        expect(result.valid).toBe(true);
      });

      it('整数作为 FLOAT 通过校验', () => {
        const result = validateWidgetValue('cfg', 7, floatSpec);
        expect(result.valid).toBe(true);
      });

      it('超出最小值', () => {
        const result = validateWidgetValue('cfg', -0.1, floatSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('小于最小值');
      });

      it('超出最大值', () => {
        const result = validateWidgetValue('cfg', 21, floatSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('大于最大值');
      });

      it('非数字值', () => {
        const result = validateWidgetValue('cfg', '7.5', floatSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('期望 FLOAT 类型');
      });

      it('null 值', () => {
        const result = validateWidgetValue('cfg', null, floatSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('期望 FLOAT 类型');
      });
    });

    describe('STRING 类型', () => {
      const stringSpec: WidgetSpec = {
        name: 'text',
        type: 'STRING',
        label: '提示词',
      };

      it('有效字符串通过校验', () => {
        const result = validateWidgetValue('text', 'a beautiful landscape', stringSpec);
        expect(result.valid).toBe(true);
      });

      it('空字符串通过校验', () => {
        const result = validateWidgetValue('text', '', stringSpec);
        expect(result.valid).toBe(true);
      });

      it('非字符串值', () => {
        const result = validateWidgetValue('text', 123, stringSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('期望 STRING 类型');
      });

      it('null 值', () => {
        const result = validateWidgetValue('text', null, stringSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('期望 STRING 类型');
      });
    });

    describe('BOOLEAN 类型', () => {
      const boolSpec: WidgetSpec = {
        name: 'enabled',
        type: 'BOOLEAN',
        label: '启用',
        default: true,
      };

      it('true 通过校验', () => {
        const result = validateWidgetValue('enabled', true, boolSpec);
        expect(result.valid).toBe(true);
      });

      it('false 通过校验', () => {
        const result = validateWidgetValue('enabled', false, boolSpec);
        expect(result.valid).toBe(true);
      });

      it('非布尔值', () => {
        const result = validateWidgetValue('enabled', 'true', boolSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('期望 BOOLEAN 类型');
      });

      it('数字 0 不被接受', () => {
        const result = validateWidgetValue('enabled', 0, boolSpec);
        expect(result.valid).toBe(false);
      });

      it('数字 1 不被接受', () => {
        const result = validateWidgetValue('enabled', 1, boolSpec);
        expect(result.valid).toBe(false);
      });
    });

    describe('COMBO 类型', () => {
      const comboSpec: WidgetSpec = {
        name: 'sampler_name',
        type: 'COMBO',
        label: '采样器',
        options: ['euler', 'euler_ancestral', 'dpmpp_2m', 'ddim'],
      };

      it('有效选项通过校验', () => {
        for (const option of ['euler', 'euler_ancestral', 'dpmpp_2m', 'ddim']) {
          const result = validateWidgetValue('sampler_name', option, comboSpec);
          expect(result.valid).toBe(true);
        }
      });

      it('无效选项被拒绝', () => {
        const result = validateWidgetValue('sampler_name', 'invalid_sampler', comboSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('不在可选项列表中');
      });

      it('非字符串值被拒绝', () => {
        const result = validateWidgetValue('sampler_name', 123, comboSpec);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('期望 COMBO 类型');
      });

      it('动态 options 函数', () => {
        const dynamicSpec: WidgetSpec = {
          name: 'dynamic_combo',
          type: 'COMBO',
          label: '动态选项',
          options: () => ['option_a', 'option_b', 'option_c'],
        };

        expect(validateWidgetValue('dynamic_combo', 'option_a', dynamicSpec).valid).toBe(true);
        expect(validateWidgetValue('dynamic_combo', 'option_b', dynamicSpec).valid).toBe(true);
        expect(validateWidgetValue('dynamic_combo', 'invalid', dynamicSpec).valid).toBe(false);
      });

      it('空 options 列表（任何字符串都通过）', () => {
        // 空数组情况下，includes 返回 false，所以任何值都会被拒绝
        // 但如果 options 为 undefined，则跳过校验
        const noOptionsSpec: WidgetSpec = {
          name: 'no_options_combo',
          type: 'COMBO',
          label: '无选项',
        };

        // undefined options 时跳过选项校验
        expect(validateWidgetValue('no_options_combo', 'anything', noOptionsSpec).valid).toBe(true);
      });
    });
  });

  describe('validateNode', () => {
    const createPreset = (widgets: WidgetSpec[] = []): NodePreset => ({
      type: 'TestNode',
      name: 'Test Node',
      description: 'Test node for validation',
      category: 'sampling',
      inputs: [],
      widgets,
      outputs: [],
    });

    it('未知 widget 参数', () => {
      const preset = createPreset([
        { name: 'seed', type: 'INT', label: '种子' },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        widgets: {
          seed: 42,
          unknown_param: 'value',
        },
      };

      const issues = validateNode(node, preset, 'warn');
      expect(issues.some((i) => i.message.includes('未知 Widget 参数'))).toBe(true);
      expect(issues.some((i) => i.message.includes('unknown_param'))).toBe(true);
    });

    it('必填参数缺失', () => {
      const preset = createPreset([
        { name: 'seed', type: 'INT', label: '种子', required: true },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        widgets: {}, // 缺少必填的 seed
      };

      const issues = validateNode(node, preset, 'warn');
      expect(issues.some((i) => i.message.includes('必填 Widget 参数'))).toBe(true);
      expect(issues.some((i) => i.message.includes('seed'))).toBe(true);
    });

    it('必填参数为 null', () => {
      const preset = createPreset([
        { name: 'seed', type: 'INT', label: '种子', required: true },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        widgets: { seed: null },
      };

      const issues = validateNode(node, preset, 'warn');
      expect(issues.some((i) => i.message.includes('必填 Widget 参数'))).toBe(true);
    });

    it('类型不匹配', () => {
      const preset = createPreset([
        { name: 'steps', type: 'INT', label: '步数', min: 1, max: 100 },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        widgets: { steps: 'not_a_number' },
      };

      const issues = validateNode(node, preset, 'warn');
      expect(issues.some((i) => i.message.includes('期望 INT 类型'))).toBe(true);
    });

    it('值超出范围', () => {
      const preset = createPreset([
        { name: 'steps', type: 'INT', label: '步数', min: 1, max: 100 },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        widgets: { steps: 200 },
      };

      const issues = validateNode(node, preset, 'warn');
      expect(issues.some((i) => i.message.includes('大于最大值'))).toBe(true);
    });

    it('多个问题同时报告', () => {
      const preset = createPreset([
        { name: 'seed', type: 'INT', label: '种子', required: true },
        { name: 'steps', type: 'INT', label: '步数', min: 1 },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        widgets: {
          steps: 0, // 小于最小值
          unknown: 'value', // 未知参数
          // seed 缺失
        },
      };

      const issues = validateNode(node, preset, 'warn');
      expect(issues.length).toBeGreaterThanOrEqual(3);
    });

    it('strict 模式产生 error 级别问题', () => {
      const preset = createPreset([
        { name: 'seed', type: 'INT', label: '种子', required: true },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        widgets: {},
      };

      const issues = validateNode(node, preset, 'strict');
      expect(issues.every((i) => i.severity === 'error')).toBe(true);
    });

    it('warn 模式产生 warning 级别问题', () => {
      const preset = createPreset([
        { name: 'seed', type: 'INT', label: '种子', required: true },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        widgets: {},
      };

      const issues = validateNode(node, preset, 'warn');
      expect(issues.every((i) => i.severity === 'warning')).toBe(true);
    });

    it('none 模式不产生问题', () => {
      const preset = createPreset([
        { name: 'seed', type: 'INT', label: '种子', required: true },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        widgets: {},
      };

      const issues = validateNode(node, preset, 'none');
      expect(issues).toHaveLength(0);
    });

    it('无 widgets 的节点', () => {
      const preset = createPreset([
        { name: 'seed', type: 'INT', label: '种子' },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        // 无 widgets
      };

      const issues = validateNode(node, preset, 'warn');
      // 无 widgets 时，非必填参数不会有问题
      expect(issues).toHaveLength(0);
    });

    it('有效节点通过校验', () => {
      const preset = createPreset([
        { name: 'seed', type: 'INT', label: '种子' },
        { name: 'steps', type: 'INT', label: '步数', min: 1, max: 100 },
      ]);

      const node: StepNode = {
        id: 'node1',
        type: 'TestNode',
        widgets: { seed: 42, steps: 20 },
      };

      const issues = validateNode(node, preset, 'warn');
      expect(issues).toHaveLength(0);
    });
  });

  describe('validateInputType', () => {
    it('类型匹配通过校验', () => {
      const result = validateInputType('model', 'MODEL', 'MODEL', 'warn');
      expect(result).toBeNull();
    });

    it('类型不匹配返回问题', () => {
      const result = validateInputType('model', 'MODEL', 'LATENT', 'warn');
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('warning');
      expect(result!.message).toContain('类型不匹配');
    });

    it('strict 模式返回 error 级别', () => {
      const result = validateInputType('model', 'MODEL', 'LATENT', 'strict');
      expect(result!.severity).toBe('error');
    });

    it('none 模式返回 null', () => {
      const result = validateInputType('model', 'MODEL', 'LATENT', 'none');
      expect(result).toBeNull();
    });
  });

  describe('isCompatibleType', () => {
    it('相同类型兼容', () => {
      expect(isCompatibleType('MODEL', 'MODEL')).toBe(true);
      expect(isCompatibleType('LATENT', 'LATENT')).toBe(true);
    });

    it('不同标准类型不兼容', () => {
      expect(isCompatibleType('MODEL', 'LATENT')).toBe(false);
      expect(isCompatibleType('IMAGE', 'MASK')).toBe(false);
    });

    it('自定义类型与标准类型兼容（目标为自定义）', () => {
      expect(isCompatibleType('MODEL', 'CustomType')).toBe(true);
    });

    it('自定义类型与标准类型兼容（源为自定义）', () => {
      expect(isCompatibleType('CustomType', 'MODEL')).toBe(true);
    });

    it('两个自定义类型兼容', () => {
      expect(isCompatibleType('CustomA', 'CustomB')).toBe(true);
    });

    it('所有标准类型', () => {
      const standardTypes = [
        'MODEL',
        'CLIP',
        'VAE',
        'LATENT',
        'CONDITIONING',
        'IMAGE',
        'MASK',
        'CONTROL_NET',
        'CLIP_VISION',
        'CLIP_VISION_OUTPUT',
        'STYLE_MODEL',
        'GLIGEN',
      ];

      // 同类型兼容
      for (const type of standardTypes) {
        expect(isCompatibleType(type, type)).toBe(true);
      }

      // 不同类型不兼容
      for (let i = 0; i < standardTypes.length; i++) {
        for (let j = i + 1; j < standardTypes.length; j++) {
          expect(isCompatibleType(standardTypes[i], standardTypes[j])).toBe(false);
        }
      }
    });
  });
});
