import { describe, it, expect } from 'vitest';
import { NotFoundError, ValidationError } from '@/domain/errors';
import { textResult, toolErrorResult, runTool } from '@/delivery/mcp/tool';

describe('mcp textResult', () => {
  it('JSON-encodes the payload as text content', () => {
    const result = textResult({ total: 3 });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual({ total: 3 });
    expect(result.isError).toBeUndefined();
  });
});

describe('mcp toolErrorResult', () => {
  it('maps NotFoundError to an isError result', () => {
    const result = toolErrorResult(new NotFoundError('Alert not found'));
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Not found', message: 'Alert not found' });
  });

  it('maps ValidationError to an isError result', () => {
    const result = toolErrorResult(new ValidationError('Invalid parameter: start_timestamp (x) must follow the format yyyy-MM-dd:hh:mm:ss in UTC'));
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toEqual({
      error: 'Validation error',
      message: 'Invalid parameter: start_timestamp (x) must follow the format yyyy-MM-dd:hh:mm:ss in UTC',
    });
  });

  it('rethrows unexpected errors so the SDK turns them into JSON-RPC internal errors', () => {
    const boom = new Error('boom');
    expect(() => toolErrorResult(boom)).toThrow(boom);
  });
});

describe('mcp runTool', () => {
  it('wraps use-case results as text', async () => {
    await expect(runTool(async () => [1, 2])).resolves.toEqual({
      content: [{ type: 'text', text: '[1,2]' }],
    });
  });

  it('maps domain NotFoundError to an isError result', async () => {
    const result = await runTool(async () => {
      throw new NotFoundError('gone');
    });
    expect(result.isError).toBe(true);
  });
});
