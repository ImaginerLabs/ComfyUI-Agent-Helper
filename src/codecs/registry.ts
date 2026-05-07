import type { WorkflowCodec, FormatId } from './types.js';

/**
 * 编解码器注册表
 */
class CodecRegistry {
  private codecs: Map<FormatId, WorkflowCodec> = new Map();

  /**
   * 注册编解码器
   */
  register(codec: WorkflowCodec): void {
    this.codecs.set(codec.format.id, codec);
  }

  /**
   * 获取指定格式的编解码器
   */
  get(formatId: FormatId): WorkflowCodec | undefined {
    return this.codecs.get(formatId);
  }

  /**
   * 获取所有编解码器
   */
  getAll(): WorkflowCodec[] {
    return Array.from(this.codecs.values());
  }

  /**
   * 获取所有支持的格式
   */
  getSupportedFormats(): Array<{ id: FormatId; displayName: string }> {
    return this.getAll().map((c) => ({
      id: c.format.id,
      displayName: c.format.displayName,
    }));
  }
}

// 全局单例
let registry: CodecRegistry | null = null;

/**
 * 获取编解码器注册表（单例）
 */
export function getCodecRegistry(): CodecRegistry {
  if (!registry) {
    registry = new CodecRegistry();
  }
  return registry;
}

/**
 * 重置注册表（用于测试）
 */
export function resetCodecRegistry(): void {
  registry = null;
}
