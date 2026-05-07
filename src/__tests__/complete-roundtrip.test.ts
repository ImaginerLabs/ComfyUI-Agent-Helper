import { describe, it, expect } from 'vitest';
import { importWorkflow, exportWorkflow } from '../index.js';
import text2imageJSON from './fixtures/workflows/text2image.json';

describe('Complete round-trip conversion', () => {
  it('should produce identical JSON after import and export', () => {
    const result = importWorkflow(text2imageJSON);
    const exported = exportWorkflow(result.workflow, { format: 'ui-v0.4' });
    const ui = exported.data as typeof text2imageJSON;

    // 验证整个 JSON 对象完全一致
    expect(ui).toEqual(text2imageJSON);
  });

});
