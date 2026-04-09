export function makeReactive<T extends object>(obj: T, onChange: () => void): T {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (value !== null && typeof value === 'object') {
        return makeReactive(value as object, onChange);
      }
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(receiver);
      }
      return value;
    },
    set(target, prop, value, receiver) {
      const result = Reflect.set(target, prop, value, receiver);
      onChange();
      return result;
    },
  }) as T;
}
