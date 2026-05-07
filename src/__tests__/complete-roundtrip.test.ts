import { describe, it, expect } from 'vitest';
import {
  createWorkflow,
  importFromJSON,
  compose,
} from '../index.js';
import text2imageJSON from './fixtures/workflows/text2image.json';

describe('Complete round-trip conversion', () => {
  it('should produce identical JSON after import and export', () => {
    const handle = createWorkflow();
    importFromJSON(handle, text2imageJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const exported = result.uiFormat!;

    // 验证工作流级别字段
    expect(exported.id).toBe(text2imageJSON.id);
    expect(exported.revision).toBe(text2imageJSON.revision);
    expect(exported.last_node_id).toBe(text2imageJSON.last_node_id);
    expect(exported.last_link_id).toBe(text2imageJSON.last_link_id);
    expect(exported.version).toBe(text2imageJSON.version);

    // 验证 extra 字段
    expect(exported.extra).toEqual(text2imageJSON.extra);

    // 验证 config 字段
    expect(exported.config).toEqual(text2imageJSON.config);

    // 验证 groups
    expect(exported.groups).toEqual(text2imageJSON.groups);

    // 验证节点数量
    expect(exported.nodes.length).toBe(text2imageJSON.nodes.length);

    // 验证每个节点
    for (const originalNode of text2imageJSON.nodes) {
      const exportedNode = exported.nodes.find(n => n.id === originalNode.id);
      expect(exportedNode).toBeDefined();

      // 验证节点类型
      expect(exportedNode?.type).toBe(originalNode.type);

      // 验证位置
      expect(exportedNode?.pos).toEqual(originalNode.pos);

      // 验证大小
      expect(exportedNode?.size).toEqual(originalNode.size);

      // 验证 flags
      expect(exportedNode?.flags).toEqual(originalNode.flags);

      // 验证 order
      expect(exportedNode?.order).toBe(originalNode.order);

      // 验证 mode
      expect(exportedNode?.mode).toBe(originalNode.mode);

      // 验证 properties
      expect(exportedNode?.properties).toEqual(originalNode.properties);

      // 验证 widgets_values
      expect(exportedNode?.widgets_values).toEqual(originalNode.widgets_values);

      // 验证 inputs 结构（不验证 link，因为连线 ID 可能变化）
      if (originalNode.inputs) {
        expect(exportedNode?.inputs?.length).toBe(originalNode.inputs.length);
        for (let i = 0; i < originalNode.inputs.length; i++) {
          expect(exportedNode?.inputs?.[i].name).toBe(originalNode.inputs[i].name);
          expect(exportedNode?.inputs?.[i].type).toBe(originalNode.inputs[i].type);
        }
      }

      // 验证 outputs 结构（不验证 links，因为连线 ID 可能变化）
      if (originalNode.outputs) {
        expect(exportedNode?.outputs?.length).toBe(originalNode.outputs.length);
        for (let i = 0; i < originalNode.outputs.length; i++) {
          expect(exportedNode?.outputs?.[i].name).toBe(originalNode.outputs[i].name);
          expect(exportedNode?.outputs?.[i].type).toBe(originalNode.outputs[i].type);
          expect(exportedNode?.outputs?.[i].slot_index).toBe(originalNode.outputs[i].slot_index);
        }
      }
    }

    // 验证连线数量
    expect(exported.links.length).toBe(text2imageJSON.links.length);

    // 验证每条连线的结构
    for (let i = 0; i < text2imageJSON.links.length; i++) {
      const originalLink = text2imageJSON.links[i];
      const exportedLink = exported.links[i];

      // 连线格式: [linkId, originId, originSlot, targetId, targetSlot, type]
      expect(exportedLink[1]).toBe(originalLink[1]); // originId
      expect(exportedLink[2]).toBe(originalLink[2]); // originSlot
      expect(exportedLink[3]).toBe(originalLink[3]); // targetId
      expect(exportedLink[4]).toBe(originalLink[4]); // targetSlot
      expect(exportedLink[5]).toBe(originalLink[5]); // type
    }
  });

  it('should preserve all node IDs as numbers', () => {
    const handle = createWorkflow();
    importFromJSON(handle, text2imageJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const exported = result.uiFormat!;

    // 所有节点 ID 应该是原始数字
    const originalIds = text2imageJSON.nodes.map(n => n.id).sort((a, b) => a - b);
    const exportedIds = exported.nodes.map(n => n.id).sort((a, b) => a - b);

    expect(exportedIds).toEqual(originalIds);
  });

  it('should preserve extra.ds field', () => {
    const handle = createWorkflow();
    importFromJSON(handle, text2imageJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const exported = result.uiFormat!;

    expect(exported.extra?.ds).toEqual(text2imageJSON.extra?.ds);
  });
});
