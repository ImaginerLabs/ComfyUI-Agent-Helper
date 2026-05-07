import { uiCodec, uiV1Codec } from './decoder.js';
import { getCodecRegistry } from '../registry.js';

// 注册 UI 格式编解码器
getCodecRegistry().register(uiCodec);
getCodecRegistry().register(uiV1Codec);

export { uiCodec, uiV1Codec } from './decoder.js';
export { detectUIVersion, normalizeLinks, denormalizeLinks } from './types.js';
