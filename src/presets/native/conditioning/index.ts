/**
 * Conditioning 类节点预设汇总导出
 */

import { clipPresets } from './clip.js';
import { conditioningMixPresets } from './mix.js';
import { conditioningAreaPresets } from './area.js';
import { controlnetPresets } from './controlnet.js';
import { specialConditioningPresets } from './special.js';

/**
 * 所有 Conditioning 类节点预设
 */
export const conditioningPresets = [
  ...clipPresets,
  ...conditioningMixPresets,
  ...conditioningAreaPresets,
  ...controlnetPresets,
  ...specialConditioningPresets,
];

// 重新导出各子分类
export { clipPresets } from './clip.js';
export { conditioningMixPresets } from './mix.js';
export { conditioningAreaPresets } from './area.js';
export { controlnetPresets } from './controlnet.js';
export { specialConditioningPresets } from './special.js';
