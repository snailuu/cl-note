/* eslint-disable @typescript-eslint/no-explicit-any */
export function getValueByKey(obj: any, key?: string, prefix = '') {
  if (!key) return obj;
  const keys = key.split('.');
  let result = obj;
  for (let i = 0; i < keys.length; i++) {
    result = result[prefix + keys[i]];
  }
  return result;
}

export function createObjFromKey(value: any, key?: string) {
  if (!key) return value;
  const keys = key.split('.');
  const result: Record<string, any> = {};
  let cur = result;
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i]] = {};
  }
  cur[keys[keys.length - 1]] = value;
  return result;
}

export function setValueByKey(target: any, value: unknown, key?: string) {
  if (!key) return Object.assign({}, target, value);
  const keys = key.split('.');
  let cur = target;
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i]] ??= {};
  }
  cur[keys[keys.length - 1]] = value;
  return target;
}