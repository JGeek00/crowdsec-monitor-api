const proxyCache = new WeakMap<object, object>();

export function makeReactive<T extends object>(obj: T, onChange: () => void): T {
  // Return cached proxy if one already exists for this object
  // This ensures every underlying object has exactly one stable proxy,
  // preventing reference aliasing during nested access and JSON serialization.
  if (proxyCache.has(obj)) {
    return proxyCache.get(obj) as T;
  }

  const proxy = new Proxy(obj, {
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

  proxyCache.set(obj, proxy);
  return proxy;
}
