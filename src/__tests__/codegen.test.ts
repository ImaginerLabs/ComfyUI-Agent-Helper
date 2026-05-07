import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  createWorkflow,
  importFromJSON,
  workflowToCode,
  compose,
  addStep,
  connectSteps,
} from '../index.js';

const fixturesDir = join(__dirname, 'fixtures', 'blueprints');
const blueprintFiles = readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));

function loadBlueprint(filename: string): unknown {
  const raw = readFileSync(join(fixturesDir, filename), 'utf-8');
  return JSON.parse(raw);
}

function runGeneratedCode(code: string): Record<string, unknown> {
  const wrappedCode = `
    const { createWorkflow, addStep, connectSteps, compose } = deps;
    ${code}
    return compose(wf.id);
  `;
  const fn = new Function('deps', wrappedCode);
  const deps = { createWorkflow, addStep, connectSteps, compose };
  return fn(deps) as Record<string, unknown>;
}

describe('workflowToCode', () => {
  // -----------------------------------------------------------------------
  // 结构测试
  // -----------------------------------------------------------------------
  describe('生成代码结构验证', () => {
    it('生成的代码包含 import 语句', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      const code = workflowToCode(wf);

      expect(code).toContain("import {");
      expect(code).toContain("from 'comfyui-agent-helper'");
      expect(code).toContain('createWorkflow');
      expect(code).toContain('addStep');
      expect(code).toContain('compose');
    });

    it('可以跳过 import 语句', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      const code = workflowToCode(wf, { includeImports: false });

      expect(code).not.toContain("import {");
      expect(code).toContain('const wf = createWorkflow');
    });

    it('可以自定义包名', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      const code = workflowToCode(wf, { packageName: 'my-custom-pkg' });

      expect(code).toContain("from 'my-custom-pkg'");
    });

    it('生成的代码包含 Step id 和 name', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      const code = workflowToCode(wf);

      expect(code).toContain('"Image_Blur"');
      expect(code).toContain('"Image Blur"');
    });

    it('生成的代码包含节点类型', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      const code = workflowToCode(wf);

      expect(code).toContain('"PrimitiveFloat"');
      expect(code).toContain('"CustomCombo"');
      expect(code).toContain('"GLSLShader"');
    });

    it('生成的代码包含 widget 值', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      const code = workflowToCode(wf);

      expect(code).toContain('"value": 20');
      expect(code).toContain('"choice"');
      expect(code).toContain('"fragment_shader"');
    });

    it('生成的代码包含内部连线', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      const code = workflowToCode(wf);

      expect(code).toContain('internalLinks');
      // tupleSN 格式: ["10", 0]
      expect(code).toContain('["10", 0]');
      expect(code).toContain('["1", "floats.u_float0"]');
    });

    it('生成的代码包含输入端口', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      const code = workflowToCode(wf);

      expect(code).toMatch(/\binputs:/);
      expect(code).toContain('"image"');
      // target 使用 tupleSS: ["1", "images.image0"]
      expect(code).toContain('["1", "images.image0"]');
    });

    it('生成的代码包含输出端口', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      const code = workflowToCode(wf);

      expect(code).toMatch(/\boutputs:/);
      expect(code).toContain('"blurred_image"');
      // source 使用 tupleSN: ["1", 0]
      expect(code).toContain('["1", 0]');
    });

    it('空 Workflow 生成最简代码', () => {
      const wf = createWorkflow();
      const code = workflowToCode(wf);

      expect(code).toContain('const wf = createWorkflow();');
      expect(code).toContain('const result = compose(wf.id);');
      expect(code).not.toContain('addStep');
      expect(code).not.toContain('connectSteps');
    });

    it('Workflow 带 name 时生成对应参数', () => {
      const wf = createWorkflow({ name: '我的工作流' });
      const code = workflowToCode(wf);

      expect(code).toContain('createWorkflow({ name: "我的工作流" })');
    });
  });

  // -----------------------------------------------------------------------
  // 往返测试：导入 → 生成代码 → 执行 → compose 一致
  // -----------------------------------------------------------------------
  describe('代码往返测试', () => {
    it('Image Blur 往返后 apiFormat 完全一致', () => {
      const json = loadBlueprint('Image Blur.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);
      const original = compose(wf.id);

      const code = workflowToCode(wf, { includeImports: false });
      const regenerated = runGeneratedCode(code);

      expect(regenerated.apiFormat).toEqual(original.apiFormat);
    });

    it('Glow 往返后 apiFormat 完全一致', () => {
      const json = loadBlueprint('Glow.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);
      const original = compose(wf.id);

      const code = workflowToCode(wf, { includeImports: false });
      const regenerated = runGeneratedCode(code);

      expect(regenerated.apiFormat).toEqual(original.apiFormat);
    });

    it('Color Curves 往返后 apiFormat 完全一致', () => {
      const json = loadBlueprint('Color Curves.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);
      const original = compose(wf.id);

      const code = workflowToCode(wf, { includeImports: false });
      const regenerated = runGeneratedCode(code);

      expect(regenerated.apiFormat).toEqual(original.apiFormat);
    });

    it('多蓝图导入到同一 Workflow 往返一致', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      importFromJSON(wf, loadBlueprint('Glow.json'));
      const original = compose(wf.id);

      const code = workflowToCode(wf, { includeImports: false });
      const regenerated = runGeneratedCode(code);

      expect(regenerated.apiFormat).toEqual(original.apiFormat);
    });

    it('带跨 Step 连接的往返一致', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      importFromJSON(wf, loadBlueprint('Glow.json'));

      connectSteps(
        wf,
        { stepId: 'Image_Blur', portId: 'blurred_image' },
        { stepId: 'Glow', portId: 'image' }
      );
      const original = compose(wf.id);

      const code = workflowToCode(wf, { includeImports: false });
      const regenerated = runGeneratedCode(code);

      expect(regenerated.apiFormat).toEqual(original.apiFormat);
    });

    it('所有 51 个蓝图往返后 apiFormat 一致', () => {
      for (const filename of blueprintFiles) {
        const json = loadBlueprint(filename);
        const wf = createWorkflow();
        importFromJSON(wf, json);
        const original = compose(wf.id);

        const code = workflowToCode(wf, { includeImports: false });
        const regenerated = runGeneratedCode(code);

        expect(regenerated.apiFormat).toEqual(original.apiFormat);
      }
    });
  });

  // -----------------------------------------------------------------------
  // 特殊值格式化测试
  // -----------------------------------------------------------------------
  describe('特殊值格式化', () => {
    it('多行字符串（GLSL shader）使用模板字面量', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      const code = workflowToCode(wf);

      expect(code).toContain('`#version 300 es');
      expect(code).toContain('precision highp float;');
    });

    it('布尔 widget 值正确格式化', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'test_bool',
        name: 'Test Bool',
        nodes: [{ id: '1', type: 'TestNode', widgets: { enabled: true, disabled: false } }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).toContain('"enabled": true');
      expect(code).toContain('"disabled": false');
    });

    it('整数和浮点数 widget 值正确格式化', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'test_nums',
        name: 'Test Numbers',
        nodes: [{ id: '1', type: 'TestNode', widgets: { seed: 42, cfg: 7.5, steps: 0, negative: -1 } }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).toContain('"seed": 42');
      expect(code).toContain('"cfg": 7.5');
      expect(code).toContain('"steps": 0');
      expect(code).toContain('"negative": -1');
    });

    it('空字符串 widget 值用单引号', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'test_empty',
        name: 'Test Empty',
        nodes: [{ id: '1', type: 'TestNode', widgets: { text: '' } }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).toContain("\"text\": ''");
    });

    it('null widget 值', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'test_null',
        name: 'Test Null',
        nodes: [{ id: '1', type: 'TestNode', widgets: { optional: null } }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).toContain('"optional": null');
    });

    it('数组 widget 值', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'test_arr',
        name: 'Test Array',
        nodes: [{ id: '1', type: 'TestNode', widgets: { sizes: [512, 768] } }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).toContain('"sizes": [512, 768]');
    });

    it('字符串中含单引号用双引号', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'test_quotes',
        name: 'Test Quotes',
        nodes: [{ id: '1', type: 'TestNode', widgets: { text: "it's a test" } }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).toContain("\"text\": \"it's a test\"");
    });

    it('字符串中含双引号用单引号', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'test_dquote',
        name: 'Test DQuote',
        nodes: [{ id: '1', type: 'TestNode', widgets: { text: 'say "hello"' } }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).toContain("\"text\": 'say \"hello\"'");
    });

    it('节点 title 和 position 可选字段正确生成', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'test_pos',
        name: 'Test Position',
        nodes: [{ id: '1', type: 'TestNode', title: '我的节点', position: { x: 100, y: 200 } }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).toMatch(/\btitle: "我的节点"/);
      expect(code).toContain('position: { x: 100, y: 200 }');
    });

    it('无 widget 节点不生成 widgets 字段', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'test_nowidget',
        name: 'Test No Widget',
        nodes: [{ id: '1', type: 'TestNode' }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).not.toContain('widgets');
    });

    it('Step 含 description 时生成对应字段', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'test_desc',
        name: 'Test Desc',
        description: '这是一个测试步骤',
        nodes: [{ id: '1', type: 'TestNode' }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).toMatch(/\bdescription: "这是一个测试步骤"/);
    });
  });

  // -----------------------------------------------------------------------
  // 边界情况
  // -----------------------------------------------------------------------
  describe('边界情况', () => {
    it('不存在的 Workflow 抛出错误', () => {
      expect(() => workflowToCode({ id: 'non-existent' })).toThrow(
        'Workflow not found'
      );
    });

    it('空 Workflow 生成合法可执行代码', () => {
      const wf = createWorkflow();
      const code = workflowToCode(wf, { includeImports: false });
      const result = runGeneratedCode(code);

      expect(result.apiFormat).toBeDefined();
      expect(Object.keys(result.apiFormat)).toHaveLength(0);
    });

    it('无输入输出端口的 Step 不生成 inputs/outputs 字段', () => {
      const wf = createWorkflow();
      addStep(wf, {
        id: 'minimal',
        name: 'Minimal',
        nodes: [{ id: '1', type: 'TestNode', widgets: { value: 42 } }],
        internalLinks: [],
      });
      const code = workflowToCode(wf);

      expect(code).not.toContain('inputs');
      expect(code).not.toContain('outputs');
    });

    it('空白名称蓝图用 subgraph.id 作为 Step ID', () => {
      const wf = createWorkflow();
      const json = {
        definitions: {
          subgraphs: [
            {
              id: 'abc-123-def',
              name: '',
              nodes: [{ id: 1, type: 'EmptyNode', inputs: [], outputs: [] }],
              links: [],
              inputs: [],
              outputs: [],
            },
          ],
        },
      };
      importFromJSON(wf, json);
      const code = workflowToCode(wf);

      expect(code).toContain('abc_123_def');
    });
  });

  // -----------------------------------------------------------------------
  // 编辑场景模拟
  // -----------------------------------------------------------------------
  describe('编辑场景模拟', () => {
    it('修改 widget 值后能正确 compose', () => {
      const json = loadBlueprint('Image Blur.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const code = workflowToCode(wf, { includeImports: false });

      // 模拟用户编辑：把 strength 从 20 改成 50
      const editedCode = code.replace('"value": 20', '"value": 50');
      const result = runGeneratedCode(editedCode);

      const api = result.apiFormat as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const floatNode = Object.values(api).find((n) => n.class_type === 'PrimitiveFloat');
      expect(floatNode).toBeDefined();
      expect(floatNode!.inputs.value).toBe(50);
    });

    it('添加新节点后代码可执行', () => {
      const json = loadBlueprint('Image Blur.json');
      const wf = createWorkflow();
      importFromJSON(wf, json);

      const code = workflowToCode(wf, { includeImports: false });

      const newNodeCode = `
    {
      id: "preview",
      type: "PreviewImage",
      title: "预览"
    }`;
      // 在 nodes 数组最后插入新节点
      const editedCode = code.replace(
        /\s+\],\n\s+internalLinks/s,
        `${newNodeCode},\n    ],\n  internalLinks`
      );

      expect(() => runGeneratedCode(editedCode)).not.toThrow();
    });

    it('添加跨 Step 连接后正确 compose', () => {
      const wf = createWorkflow();
      importFromJSON(wf, loadBlueprint('Image Blur.json'));
      importFromJSON(wf, loadBlueprint('Glow.json'));

      let code = workflowToCode(wf, { includeImports: false });

      const connectCode = `
connectSteps(wf,
  { stepId: "Image_Blur", portId: "blurred_image" },
  { stepId: "Glow", portId: "image" }
);`;
      code = code.replace(
        'const result = compose(wf.id);',
        `${connectCode}\nconst result = compose(wf.id);`
      );

      const result = runGeneratedCode(code);
      const api = result.apiFormat as Record<string, { class_type: string; inputs: Record<string, unknown> }>;

      // 验证连接生效：Glow 中某个节点引用了 Image_Blur 的输出
      let hasCrossRef = false;
      for (const node of Object.values(api)) {
        for (const val of Object.values(node.inputs)) {
          if (Array.isArray(val) && typeof val[0] === 'string' && val[0].includes('Image_Blur')) {
            hasCrossRef = true;
          }
        }
      }
      expect(hasCrossRef).toBe(true);
    });
  });
});
