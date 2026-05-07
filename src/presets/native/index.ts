/**
 * 原生节点预设汇总导出
 * 包含所有 ComfyUI 内置节点的预设定义
 */

import { samplingPresets } from './sampling.js';
import { loadersPresets } from './loaders.js';
import { conditioningPresets } from './conditioning/index.js';
import { imagePresets } from './image.js';
import { latentPresets } from './latent/index.js';
import { basicsPresets } from './basics.js';
import { maskPresets } from './mask.js';
import { advancedPresets } from './advanced.js';

/**
 * 所有原生节点预设
 */
export const nativePresets = [
  ...samplingPresets,
  ...loadersPresets,
  ...conditioningPresets,
  ...imagePresets,
  ...latentPresets,
  ...basicsPresets,
  ...maskPresets,
  ...advancedPresets,
];

/**
 * 自动注册所有原生节点预设到全局注册表
 */
export async function registerNativePresets(): Promise<void> {
  const { getRegistry } = await import('../registry.js');
  const registry = getRegistry();
  for (const preset of nativePresets) {
    registry.registerPreset(preset);
  }
}

// 重新导出各分类预设
export { samplingPresets } from './sampling.js';
export { loadersPresets } from './loaders.js';
export { conditioningPresets } from './conditioning/index.js';
export { imagePresets } from './image.js';
export { latentPresets } from './latent/index.js';
export { basicsPresets } from './basics.js';
export { maskPresets } from './mask.js';
export { advancedPresets } from './advanced.js';

// 重新导出 latent 子分类
export {
  latentBasicPresets,
  latentBatchPresets,
  latentInpaintPresets,
  latentTransformPresets,
} from './latent/index.js';

// 重新导出 conditioning 子分类
export {
  clipPresets,
  conditioningMixPresets,
  conditioningAreaPresets,
  controlnetPresets,
  specialConditioningPresets,
} from './conditioning/index.js';
