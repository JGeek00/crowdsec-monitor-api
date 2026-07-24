import { describe, it, expect } from 'vitest';
import { errorResponse } from '@/utils/error-response';

describe('errorResponse', () => {
  it('returns an object with error and message properties', () => {
    const result = errorResponse('NOT_FOUND', 'Resource not found');
    expect(result).toEqual({ error: 'NOT_FOUND', message: 'Resource not found' });
  });

  it('accepts empty strings', () => {
    const result = errorResponse('', '');
    expect(result).toEqual({ error: '', message: '' });
  });

  it('returns the correct shape with special characters', () => {
    const result = errorResponse('ERR_001', 'Something went wrong: timeout');
    expect(result.error).toBe('ERR_001');
    expect(result.message).toBe('Something went wrong: timeout');
  });
});
