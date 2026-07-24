import { describe, it, expect, vi } from 'vitest';
import { makeReactive } from '@/utils/make-reactive';

describe('makeReactive', () => {
  it('calls onChange when a property is set', () => {
    const onChange = vi.fn();
    const obj = makeReactive({ a: 1 }, onChange);

    obj.a = 2;
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('returns the set value', () => {
    const onChange = vi.fn();
    const obj = makeReactive({ a: 1 }, onChange);

    obj.a = 2;
    expect(obj.a).toBe(2);
  });

  it('does not call onChange on property get', () => {
    const onChange = vi.fn();
    const obj = makeReactive({ a: 1 }, onChange);

    const val = obj.a;
    expect(val).toBe(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('makes nested objects reactive', () => {
    const onChange = vi.fn();
    const obj = makeReactive({ nested: { x: 1 } }, onChange);

    obj.nested.x = 2;
    expect(onChange).toHaveBeenCalled();
  });

  it('preserves function methods', () => {
    const fn = vi.fn();
    const onChange = vi.fn();
    const obj = makeReactive({ greet: fn }, onChange);

    obj.greet('hello');
    expect(fn).toHaveBeenCalledWith('hello');
  });

  it('returns original object shape', () => {
    const onChange = vi.fn();
    const original = { a: 1, b: 'two' };
    const obj = makeReactive(original, onChange);

    expect(obj.a).toBe(1);
    expect(obj.b).toBe('two');
  });
});
