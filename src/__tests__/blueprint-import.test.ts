import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  createWorkflow,
  importFromJSON,
  compose,
  getWorkflowSummary,
  validateWorkflow,
} from '../index.js';

const fixturesDir = join(__dirname, 'fixtures', 'blueprints');
const blueprintFiles = readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));

function loadBlueprint(filename: string): unknown {
  const raw = readFileSync(join(fixturesDir, filename), 'utf-8');
  return JSON.parse(raw);
}

describe('Blueprint 导入往返测试', () => {
  // 测试所有 blueprint 都能成功导入和 compose
  describe.each(blueprintFiles)('%s', (filename) => {
    it('导入并 compose 不抛出异常', () => {
      const json = loadBlueprint(filename);
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const summary = getWorkflowSummary(wf);
      expect(summary).not.toBeNull();
      expect(summary!.steps.length).toBeGreaterThanOrEqual(1);

      const result = compose(wf.id);
      expect(result.apiFormat).toBeDefined();
      expect(Object.keys(result.apiFormat).length).toBeGreaterThan(0);
    });

    it('导入后校验通过（无错误级别问题）', () => {
      const json = loadBlueprint(filename);
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const validation = validateWorkflow(wf.id);
      const errors = validation.issues.filter((i) => i.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('详细结构验证', () => {
    it('widget 值在 compose 后保留', () => {
      // Image Blur: PrimitiveFloat 节点有 widget value=20
      const json = loadBlueprint('Image Blur.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const result = compose(wf.id);
      const api = result.apiFormat;

      // 找到 PrimitiveFloat 节点（strength slider，widgets_values=[20]）
      const strengthNode = Object.entries(api).find(
        ([, n]) => n.class_type === 'PrimitiveFloat' && n.inputs.value === 20
      );
      expect(strengthNode).toBeDefined();
    });

    it('internalLink 变成数组引用', () => {
      // Image Blur: PrimitiveFloat → GLSLShader 的连接
      const json = loadBlueprint('Image Blur.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const result = compose(wf.id);
      const api = result.apiFormat;

      // GLSLShader 的 floats.u_float0 输入应该是数组引用 [sourceId, slot]
      const shaderNode = Object.entries(api).find(
        ([, n]) => n.class_type === 'GLSLShader'
      );
      expect(shaderNode).toBeDefined();
      const shaderInputs = shaderNode![1].inputs;

      // floats.u_float0 被 link 连接，应该是数组引用
      const linkedInput = shaderInputs['floats.u_float0'];
      expect(Array.isArray(linkedInput)).toBe(true);
      expect(linkedInput[1]).toBe(0); // slot index
    });

    it('节点 class_type 与原始一致', () => {
      const json = loadBlueprint('Glow.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const result = compose(wf.id);
      const api = result.apiFormat;

      const types = Object.values(api).map((n) => n.class_type);
      expect(types).toContain('GLSLShader');
      expect(types).toContain('PrimitiveFloat');
      expect(types).toContain('ColorToRGBInt');
      expect(types).toContain('CustomCombo');
    });

    it('命名空间隔离：不同蓝图导入到同一 Workflow', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      importFromJSON(wf, loadBlueprint('Glow.json'));

      const result = compose(wf.id);
      const api = result.apiFormat;

      // 两个 Step 的节点 ID 应该有各自的命名空间前缀
      const keys = Object.keys(api);
      const blurKeys = keys.filter((k) => k.includes('Image_Blur'));
      const glowKeys = keys.filter((k) => k.includes('Glow'));
      expect(blurKeys.length).toBeGreaterThan(0);
      expect(glowKeys.length).toBeGreaterThan(0);
      // 每个命名空间下应该有至少一个节点
      expect(blurKeys.some((k) => k.endsWith(':1'))).toBe(true);
    });

    it('导入空 JSON 不抛异常，且 Workflow 为空', () => {
      const wf = createWorkflow();
      importFromJSON(wf, {});
      const summary = getWorkflowSummary(wf);
      expect(summary!.steps).toHaveLength(0);
    });

    it('导入没有 subgraphs 的 JSON', () => {
      const wf = createWorkflow();
      importFromJSON(wf, { definitions: {} });
      const summary = getWorkflowSummary(wf);
      expect(summary!.steps).toHaveLength(0);
    });

    it('无内部连接的蓝图（纯 widget 节点）', () => {
      // Image Captioning (gemini) 只有 1 个节点，0 条内部链接
      const json = loadBlueprint('Image Captioning (gemini).json');
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const result = compose(wf.id);
      const nodes = Object.values(result.apiFormat);
      expect(nodes.length).toBeGreaterThanOrEqual(1);
      // 所有 inputs 应该是标量值，没有数组引用
      for (const node of nodes) {
        for (const val of Object.values(node.inputs)) {
          expect(Array.isArray(val)).toBe(false);
        }
      }
    });

    it('subgraph outputs 映射为 StepOutputPort', () => {
      // Image Blur 有 1 个输出 (IMAGE0)
      const json = loadBlueprint('Image Blur.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const summary = getWorkflowSummary(wf);
      expect(summary!.steps[0].outputPorts).toBe(1);
    });

    it('subgraph inputs 映射为 StepInputPort', () => {
      // Image Blur 有 1 个输入 (images.image0)
      const json = loadBlueprint('Image Blur.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const summary = getWorkflowSummary(wf);
      expect(summary!.steps[0].inputPorts).toBe(1);
    });

    it('多输出节点的 slot 索引正确', () => {
      // CustomCombo 有 2 个输出: STRING (slot 0) 和 INDEX (slot 1)
      const json = loadBlueprint('Image Blur.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const result = compose(wf.id);
      const api = result.apiFormat;

      // 找到 CustomCombo 的输出被引用为 [id, 1] 的地方（INDEX 输出 slot）
      let hasSlot1Ref = false;
      for (const node of Object.values(api)) {
        for (const val of Object.values(node.inputs)) {
          if (Array.isArray(val) && val[1] === 1) {
            hasSlot1Ref = true;
          }
        }
      }
      expect(hasSlot1Ref).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('导入到不存在的 Workflow 应抛出错误', () => {
      const json = loadBlueprint('Image Blur.json');
      expect(() => importFromJSON({ id: 'non-existent' }, json)).toThrow(
        'Workflow not found'
      );
    });

    it('同一个蓝图重复导入会覆盖之前的 Step', () => {
      const json = loadBlueprint('Image Blur.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);
      importFromJSON(wf, json);

      // 不应有重复的 Step
      const summary = getWorkflowSummary(wf);
      expect(summary!.steps.length).toBe(1);
    });

    it('所有 51 个蓝图都能成功 compose', () => {
      for (const filename of blueprintFiles) {
        const json = loadBlueprint(filename);
        const wf = createWorkflow();
        importFromJSON(wf, json);
        const result = compose(wf.id);
        expect(Object.keys(result.apiFormat).length).toBeGreaterThan(0);
      }
    });
  });
});
