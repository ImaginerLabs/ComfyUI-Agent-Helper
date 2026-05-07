import { describe, it, expect } from 'vitest';
import {
  createWorkflow,
  importFromJSON,
  detectFormat,
  compose,
  addStep,
} from '../index.js';

// text2image.json 的简化版本（UI 格式）
const uiFormatJSON = {
  last_node_id: 9,
  last_link_id: 9,
  nodes: [
    {
      id: 4,
      type: 'CheckpointLoaderSimple',
      pos: [30, 470],
      size: [320, 100],
      flags: {},
      order: 0,
      mode: 0,
      inputs: [],
      outputs: [
        { name: 'MODEL', type: 'MODEL', slot_index: 0, links: [1] },
        { name: 'CLIP', type: 'CLIP', slot_index: 1, links: [3, 5] },
        { name: 'VAE', type: 'VAE', slot_index: 2, links: [8] },
      ],
      properties: { 'Node name for S&R': 'CheckpointLoaderSimple' },
      widgets_values: ['model.safetensors'],
    },
    {
      id: 3,
      type: 'KSampler',
      pos: [1050, 360],
      size: [320, 480],
      flags: {},
      order: 4,
      mode: 0,
      inputs: [
        { name: 'model', type: 'MODEL', link: 1 },
        { name: 'positive', type: 'CONDITIONING', link: 4 },
        { name: 'negative', type: 'CONDITIONING', link: 6 },
        { name: 'latent_image', type: 'LATENT', link: 2 },
      ],
      outputs: [{ name: 'LATENT', type: 'LATENT', slot_index: 0, links: [7] }],
      properties: { 'Node name for S&R': 'KSampler' },
      widgets_values: [123456789, 'randomize', 20, 7, 'euler', 'normal', 1],
    },
    {
      id: 5,
      type: 'EmptyLatentImage',
      pos: [680, 690],
      size: [320, 110],
      flags: {},
      order: 1,
      mode: 0,
      inputs: [],
      outputs: [{ name: 'LATENT', type: 'LATENT', slot_index: 0, links: [2] }],
      properties: { 'Node name for S&R': 'EmptyLatentImage' },
      widgets_values: [512, 512, 1],
    },
  ],
  links: [
    [1, 4, 0, 3, 0, 'MODEL'],
    [2, 5, 0, 3, 3, 'LATENT'],
  ],
  groups: [],
  config: {},
  extra: {},
  version: 0.4,
};

// Blueprint 格式（带 definitions.subgraphs）
const blueprintJSON = {
  definitions: {
    subgraphs: [
      {
        id: 'test-subgraph-1',
        name: 'Test Step',
        nodes: [
          {
            id: 1,
            type: 'KSampler',
            inputs: [
              { name: 'model', type: 'MODEL', link: null },
              { name: 'positive', type: 'CONDITIONING', link: null },
            ],
            outputs: [{ name: 'LATENT', type: 'LATENT' }],
            widgets_values: [123456, 'randomize', 20, 7, 'euler', 'normal', 1],
          },
        ],
        links: [],
        inputs: [],
        outputs: [{ id: 'out1', name: 'LATENT', type: 'LATENT', label: 'Output', linkIds: [] }],
      },
    ],
  },
};

// API 格式
const apiFormatJSON = {
  '1': {
    class_type: 'CheckpointLoaderSimple',
    inputs: {
      ckpt_name: 'model.safetensors',
    },
  },
  '2': {
    class_type: 'KSampler',
    inputs: {
      model: ['1', 0],
      seed: 123456789,
      steps: 20,
      cfg: 7,
      sampler_name: 'euler',
      scheduler: 'normal',
      denoise: 1,
    },
  },
};

describe('detectFormat', () => {
  it('should detect UI format', () => {
    expect(detectFormat(uiFormatJSON)).toBe('ui');
  });

  it('should detect Blueprint format', () => {
    expect(detectFormat(blueprintJSON)).toBe('blueprint');
  });

  it('should detect API format', () => {
    expect(detectFormat(apiFormatJSON)).toBe('api');
  });

  it('should return unknown for invalid format', () => {
    expect(detectFormat(null)).toBe('unknown');
    expect(detectFormat({})).toBe('unknown');
    expect(detectFormat({ random: 'data' })).toBe('unknown');
  });
});

describe('importFromJSON', () => {
  describe('UI format import', () => {
    it('should import UI format as single step', () => {
      const handle = createWorkflow();
      const result = importFromJSON(handle, uiFormatJSON);

      expect(result.detectedFormat).toBe('ui');
      expect(result.importedStepIds).toHaveLength(1);
      expect(result.importedStepIds[0]).toBe('imported_workflow');
    });

    it('should extract nodes from UI format', () => {
      const handle = createWorkflow();
      const result = importFromJSON(handle, uiFormatJSON);

      // 验证导入了节点
      expect(result.importedStepIds.length).toBeGreaterThan(0);
    });

    it('should use custom step ID and name', () => {
      const handle = createWorkflow();
      const result = importFromJSON(handle, uiFormatJSON, {
        stepId: 'custom_step',
        stepName: 'Custom Step Name',
      });

      expect(result.importedStepIds).toContain('custom_step');
    });

    it('should parse links correctly', () => {
      const handle = createWorkflow();
      const result = importFromJSON(handle, uiFormatJSON);

      // 验证导入了步骤
      expect(result.importedStepIds.length).toBeGreaterThan(0);
    });
  });

  describe('Blueprint format import', () => {
    it('should import Blueprint format', () => {
      const handle = createWorkflow();
      const result = importFromJSON(handle, blueprintJSON);

      expect(result.detectedFormat).toBe('blueprint');
      expect(result.importedStepIds).toContain('Test_Step');
    });
  });

  describe('API format import', () => {
    it('should import API format as single step', () => {
      const handle = createWorkflow();
      const result = importFromJSON(handle, apiFormatJSON);

      expect(result.detectedFormat).toBe('api');
      expect(result.importedStepIds).toHaveLength(1);
    });

    it('should parse connections from API format', () => {
      const handle = createWorkflow();
      const result = importFromJSON(handle, apiFormatJSON);

      expect(result.importedStepIds.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should return empty result for unknown format', () => {
      const handle = createWorkflow();
      const result = importFromJSON(handle, { invalid: 'data' });
      expect(result.detectedFormat).toBe('unknown');
      expect(result.importedStepIds).toHaveLength(0);
    });

    it('should throw for invalid workflow handle', () => {
      expect(() => importFromJSON({ id: 'non-existent' }, uiFormatJSON)).toThrow();
    });
  });
});

describe('compose with UI format output', () => {
  it('should output only API format by default', () => {
    const handle = createWorkflow();
    addStep(handle, {
      id: 'step1',
      name: 'Test Step',
      nodes: [{ id: 'n1', type: 'KSampler', widgets: { seed: 123 } }],
      internalLinks: [],
    });

    const result = compose(handle.id);
    expect(result.apiFormat).toBeDefined();
    expect(result.uiFormat).toBeUndefined();
  });

  it('should output UI format when outputFormat is "ui"', () => {
    const handle = createWorkflow();
    addStep(handle, {
      id: 'step1',
      name: 'Test Step',
      nodes: [{ id: 'n1', type: 'KSampler', widgets: { seed: 123 } }],
      internalLinks: [],
    });

    const result = compose(handle.id, { outputFormat: 'ui' });
    expect(result.uiFormat).toBeDefined();
    expect(result.uiFormat?.nodes).toBeDefined();
    expect(result.uiFormat?.links).toBeDefined();
  });

  it('should output both formats when outputFormat is "both"', () => {
    const handle = createWorkflow();
    addStep(handle, {
      id: 'step1',
      name: 'Test Step',
      nodes: [{ id: 'n1', type: 'KSampler', widgets: { seed: 123 } }],
      internalLinks: [],
    });

    const result = compose(handle.id, { outputFormat: 'both' });
    expect(result.apiFormat).toBeDefined();
    expect(result.uiFormat).toBeDefined();
  });

  it('should generate valid UI format structure', () => {
    const handle = createWorkflow();
    addStep(handle, {
      id: 'step1',
      name: 'Test Step',
      nodes: [
        { id: 'n1', type: 'CheckpointLoaderSimple', widgets: { ckpt_name: 'model.safetensors' } },
        { id: 'n2', type: 'KSampler', widgets: { seed: 123, steps: 20 } },
      ],
      internalLinks: [{ from: ['n1', 0], to: ['n2', 'model'] }],
    });

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    expect(ui.version).toBe(0.4);
    expect(ui.nodes.length).toBe(2);
    expect(ui.links.length).toBe(1);
    expect(ui.last_node_id).toBeGreaterThan(0);
    expect(ui.last_link_id).toBeGreaterThan(0);
  });
});

describe('Round-trip: import -> compose', () => {
  it('should preserve node types through import and compose', () => {
    const handle = createWorkflow();
    importFromJSON(handle, uiFormatJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    // 验证节点类型被保留
    const nodeTypes = ui.nodes.map((n) => n.type);
    expect(nodeTypes).toContain('CheckpointLoaderSimple');
    expect(nodeTypes).toContain('KSampler');
    expect(nodeTypes).toContain('EmptyLatentImage');
  });

  it('should preserve widgets_values through import and compose', () => {
    const handle = createWorkflow();
    importFromJSON(handle, uiFormatJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    // 验证 KSampler 的 widgets_values 被完整保留
    const ksamplerNode = ui.nodes.find((n) => n.type === 'KSampler');
    expect(ksamplerNode).toBeDefined();
    expect(ksamplerNode?.widgets_values).toEqual([123456789, 'randomize', 20, 7, 'euler', 'normal', 1]);
  });

  it('should preserve CheckpointLoaderSimple widgets_values', () => {
    const handle = createWorkflow();
    importFromJSON(handle, uiFormatJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    // 验证 CheckpointLoaderSimple 的 widgets_values
    const checkpointNode = ui.nodes.find((n) => n.type === 'CheckpointLoaderSimple');
    expect(checkpointNode).toBeDefined();
    expect(checkpointNode?.widgets_values).toEqual(['model.safetensors']);
  });

  it('should preserve EmptyLatentImage widgets_values', () => {
    const handle = createWorkflow();
    importFromJSON(handle, uiFormatJSON);

    const result = compose(handle.id, { outputFormat: 'ui' });
    const ui = result.uiFormat!;

    // 验证 EmptyLatentImage 的 widgets_values
    const latentNode = ui.nodes.find((n) => n.type === 'EmptyLatentImage');
    expect(latentNode).toBeDefined();
    expect(latentNode?.widgets_values).toEqual([512, 512, 1]);
  });
});
