/**
 * 深拷贝一个对象（仅支持 JSON 可序列化的类型）
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
