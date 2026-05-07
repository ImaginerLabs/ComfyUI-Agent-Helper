/**
 * 潜空间操作节点预设汇总导出
 */

import { latentBasicPresets } from './basic.js';
import { latentBatchPresets } from './batch.js';
import { latentInpaintPresets } from './inpaint.js';
import { latentTransformPresets } from './transform.js';

/**
 * 所有潜空间操作节点预设
 */
export const latentPresets = [
  ...latentBasicPresets,
  ...latentBatchPresets,
  ...latentInpaintPresets,
  ...latentTransformPresets,
];

// 重新导出各子分类
export { latentBasicPresets } from './basic.js';
export { latentBatchPresets } from './batch.js';
export { latentInpaintPresets } from './inpaint.js';
export { latentTransformPresets } from './transform.js';
