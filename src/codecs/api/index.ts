import { apiCodec } from './decoder.js';
import { getCodecRegistry } from '../registry.js';

// 注册 API 格式编解码器
getCodecRegistry().register(apiCodec);

export { apiCodec } from './decoder.js';
