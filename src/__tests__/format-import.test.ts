import { describe, it, expect } from 'vitest';
import {
  createUnifiedWorkflow,
  importWorkflow,
  exportWorkflow,
  detectFormat,
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

describe('detectFormat', () => {
  it('should detect UI format', () => {
    const format = detectFormat(uiFormatJSON);
    expect(format).not.toBeNull();
    expect(format?.family).toBe('ui');
  });

  it('should detect Blueprint format', () => {
    const format = detectFormat(blueprintJSON);
    expect(format).not.toBeNull();
    expect(format?.family).toBe('blueprint');
  });

  it('should return null for invalid format', () => {
    expect(detectFormat(null)).toBeNull();
    expect(detectFormat({})).toBeNull();
    expect(detectFormat({ random: 'data' })).toBeNull();
  });
});

describe('importWorkflow', () => {
  describe('UI format import', () => {
    it('should import UI format as single step', () => {
      const result = importWorkflow(uiFormatJSON);

      expect(result.detectedFormat.family).toBe('ui');
      expect(result.workflow.steps.size).toBe(1);
    });

    it('should extract nodes from UI format', () => {
      const result = importWorkflow(uiFormatJSON);
      const step = Array.from(result.workflow.steps.values())[0];

      expect(step.nodes.length).toBe(3);
      expect(step.nodes.map((n) => n.type)).toContain('CheckpointLoaderSimple');
      expect(step.nodes.map((n) => n.type)).toContain('KSampler');
      expect(step.nodes.map((n) => n.type)).toContain('EmptyLatentImage');
    });

    it('should use custom step ID and name', () => {
      const result = importWorkflow(uiFormatJSON, {
        stepId: 'custom_step',
        stepName: 'Custom Step Name',
      });

      expect(result.workflow.steps.has('custom_step')).toBe(true);
      expect(result.workflow.steps.get('custom_step')?.name).toBe('Custom Step Name');
    });

    it('should parse links correctly', () => {
      const result = importWorkflow(uiFormatJSON);
      const step = Array.from(result.workflow.steps.values())[0];

      expect(step.internalLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Blueprint format import', () => {
    it('should import Blueprint format', () => {
      const result = importWorkflow(blueprintJSON);

      expect(result.detectedFormat.family).toBe('blueprint');
      expect(result.workflow.steps.size).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should throw for unknown format', () => {
      expect(() => importWorkflow({ invalid: 'data' })).toThrow('Unable to detect workflow format');
    });
  });
});

describe('exportWorkflow', () => {
  it('should export to UI v0.4 format', () => {
    const workflow = createUnifiedWorkflow();
    workflow.steps.set('step1', {
      id: 'step1',
      name: 'Test Step',
      nodes: [{ id: 'n1', type: 'KSampler', widgets: { seed: 123 } }],
      internalLinks: [],
    });

    const result = exportWorkflow(workflow, { format: 'ui-v0.4' });
    const data = result.data as { nodes: unknown[]; links: unknown[] };

    expect(data.nodes).toBeDefined();
    expect(data.links).toBeDefined();
  });

  it('should export to UI v1.0 format', () => {
    const workflow = createUnifiedWorkflow();
    workflow.steps.set('step1', {
      id: 'step1',
      name: 'Test Step',
      nodes: [{ id: 'n1', type: 'KSampler', widgets: { seed: 123 } }],
      internalLinks: [],
    });

    const result = exportWorkflow(workflow, { format: 'ui-v1.0' });
    const data = result.data as { nodes: unknown[]; links: unknown[] };

    expect(data.nodes).toBeDefined();
    expect(data.links).toBeDefined();
  });
});

describe('Round-trip: import -> export', () => {
  it('should preserve node types through import and export', () => {
    const result = importWorkflow(uiFormatJSON);
    const exportResult = exportWorkflow(result.workflow, { format: 'ui-v0.4' });
    const ui = exportResult.data as { nodes: Array<{ type: string }> };

    const nodeTypes = ui.nodes.map((n) => n.type);
    expect(nodeTypes).toContain('CheckpointLoaderSimple');
    expect(nodeTypes).toContain('KSampler');
    expect(nodeTypes).toContain('EmptyLatentImage');
  });

  it('should preserve widgets_values through import and export', () => {
    const result = importWorkflow(uiFormatJSON);
    const exportResult = exportWorkflow(result.workflow, { format: 'ui-v0.4' });
    const ui = exportResult.data as { nodes: Array<{ type: string; widgets_values?: unknown[] }> };

    const ksamplerNode = ui.nodes.find((n) => n.type === 'KSampler');
    expect(ksamplerNode).toBeDefined();
    expect(ksamplerNode?.widgets_values).toEqual([123456789, 'randomize', 20, 7, 'euler', 'normal', 1]);
  });

  it('should preserve CheckpointLoaderSimple widgets_values', () => {
    const result = importWorkflow(uiFormatJSON);
    const exportResult = exportWorkflow(result.workflow, { format: 'ui-v0.4' });
    const ui = exportResult.data as { nodes: Array<{ type: string; widgets_values?: unknown[] }> };

    const checkpointNode = ui.nodes.find((n) => n.type === 'CheckpointLoaderSimple');
    expect(checkpointNode).toBeDefined();
    expect(checkpointNode?.widgets_values).toEqual(['model.safetensors']);
  });

  it('should preserve EmptyLatentImage widgets_values', () => {
    const result = importWorkflow(uiFormatJSON);
    const exportResult = exportWorkflow(result.workflow, { format: 'ui-v0.4' });
    const ui = exportResult.data as { nodes: Array<{ type: string; widgets_values?: unknown[] }> };

    const latentNode = ui.nodes.find((n) => n.type === 'EmptyLatentImage');
    expect(latentNode).toBeDefined();
    expect(latentNode?.widgets_values).toEqual([512, 512, 1]);
  });
});
