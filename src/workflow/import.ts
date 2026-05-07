import type { WorkflowHandle, ImportOptions, ImportResult } from '../types.js';
import { getWorkflow } from './workflow.js';
import { detectFormat } from './format-detector.js';
import { importFromBlueprint } from './import/blueprint.js';
import { importFromUIFormat } from './import/ui-format.js';
import { importFromAPIFormat } from './import/api-format.js';

/**
 * 从 JSON 导入工作流（支持多格式）
 * @param handle Workflow 句柄
 * @param json JSON 数据（支持 API 格式、UI 格式、Blueprint 格式）
 * @param options 导入选项
 * @returns 导入结果
 */
export function importFromJSON(
  handle: WorkflowHandle,
  json: unknown,
  options?: ImportOptions
): ImportResult {
  const wf = getWorkflow(handle);
  if (!wf) {
    throw new Error(`Workflow not found: ${handle.id}`);
  }

  // 确定格式：优先使用用户指定的格式，否则自动检测
  const format = options?.format ?? detectFormat(json);

  switch (format) {
    case 'blueprint':
      return importFromBlueprint(handle, wf, json);
    case 'ui':
      return importFromUIFormat(handle, wf, json, options);
    case 'api':
      return importFromAPIFormat(handle, wf, json, options);
    default:
      // 向后兼容：空 JSON 或无法识别的格式静默返回空结果
      return { importedStepIds: [], detectedFormat: 'unknown' };
  }
}

// 重新导出格式检测函数
export { detectFormat } from './format-detector.js';
export type { FormatType } from '../types.js';