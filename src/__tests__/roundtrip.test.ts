import { describe, it, expect } from 'vitest';
import {
  createWorkflow,
  importFromJSON,
  compose,
} from '../index.js';
import text2imageJSON from './fixtures/workflows/text2image.json';

describe('Round-trip with real text2image.json', () => {
  it('should preserve all widgets_values through import and compose', () => {
    const handle = createWorkflow();
    importFromJSON(handle, text2imageJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    // 验证 KSampler 的 widgets_values 完整保留
    const ksamplerNode = ui.nodes.find((n) => n.type === 'KSampler');
    expect(ksamplerNode).toBeDefined();

    // 原始数据: [819095824154876, 'randomize', 30, 7, 'euler', 'normal', 1]
    expect(ksamplerNode?.widgets_values).toEqual([819095824154876, 'randomize', 30, 7, 'euler', 'normal', 1]);
  });

  it('should preserve CheckpointLoaderSimple widgets_values', () => {
    const handle = createWorkflow();
    importFromJSON(handle, text2imageJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    const checkpointNode = ui.nodes.find((n) => n.type === 'CheckpointLoaderSimple');
    expect(checkpointNode).toBeDefined();
    expect(checkpointNode?.widgets_values).toEqual(['waiIllustriousSDXL_v150.safetensors']);
  });

  it('should preserve EmptyLatentImage widgets_values', () => {
    const handle = createWorkflow();
    importFromJSON(handle, text2imageJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    const latentNode = ui.nodes.find((n) => n.type === 'EmptyLatentImage');
    expect(latentNode).toBeDefined();
    expect(latentNode?.widgets_values).toEqual([896, 1152, 1]);
  });

  it('should preserve CLIPTextEncode widgets_values', () => {
    const handle = createWorkflow();
    importFromJSON(handle, text2imageJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    const clipNodes = ui.nodes.filter((n) => n.type === 'CLIPTextEncode');
    expect(clipNodes.length).toBe(2);

    // 验证两个 CLIPTextEncode 节点都有 widgets_values
    for (const node of clipNodes) {
      expect(node.widgets_values).toBeDefined();
      expect(node.widgets_values!.length).toBe(1);
      expect(typeof node.widgets_values![0]).toBe('string');
    }
  });

  it('should preserve SaveImage widgets_values', () => {
    const handle = createWorkflow();
    importFromJSON(handle, text2imageJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    const saveNode = ui.nodes.find((n) => n.type === 'SaveImage');
    expect(saveNode).toBeDefined();
    expect(saveNode?.widgets_values).toEqual(['ComfyUI']);
  });

  it('should preserve all node types', () => {
    const handle = createWorkflow();
    importFromJSON(handle, text2imageJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    const nodeTypes = ui.nodes.map((n) => n.type).sort();
    expect(nodeTypes).toContain('CheckpointLoaderSimple');
    expect(nodeTypes).toContain('KSampler');
    expect(nodeTypes).toContain('EmptyLatentImage');
    expect(nodeTypes).toContain('CLIPTextEncode');
    expect(nodeTypes).toContain('VAEDecode');
    expect(nodeTypes).toContain('SaveImage');
  });

  it('should preserve links count', () => {
    const handle = createWorkflow();
    importFromJSON(handle, text2imageJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    // 原始 JSON 有 9 条连线
    expect(ui.links.length).toBe(9);
  });
});
