import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';

const CANONICAL_PATTERN = String.raw`^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{4} [+-]\d{4}$`;

describe('openapi contract — alert events timestamp', () => {
  let spec: OpenAPIV3.Document;

  beforeAll(async () => {
    spec = (await SwaggerParser.dereference(resolve(__dirname, '../../docs/openapi.yaml'))) as OpenAPIV3.Document;
  });

  it('types the Alert events items with a canonical nullable timestamp', () => {
    const alert = spec.components?.schemas?.Alert as OpenAPIV3.SchemaObject | undefined;
    expect(alert).toBeDefined();
    const events = alert?.properties?.events as OpenAPIV3.SchemaObject | undefined;
    expect(events?.type).toBe('array');
    const items = events?.items as OpenAPIV3.SchemaObject | undefined;
    expect(items?.type).toBe('object');
    const timestamp = items?.properties?.timestamp as OpenAPIV3.SchemaObject | undefined;
    expect(timestamp?.type).toBe('string');
    expect(timestamp?.pattern).toBe(CANONICAL_PATTERN);
    expect(timestamp?.nullable).toBe(true);
  });
});
