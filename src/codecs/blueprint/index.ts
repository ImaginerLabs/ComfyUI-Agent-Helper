import { blueprintCodec } from './decoder.js';
import { getCodecRegistry } from '../registry.js';

// 注册 Blueprint 格式编解码器
getCodecRegistry().register(blueprintCodec);

export { blueprintCodec } from './decoder.js';
