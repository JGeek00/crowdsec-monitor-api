import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';

const RFC3339_UTC_PATTERN = String.raw`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$`;
const TIMESTAMP_PROPERTY = /timestamp|(_at|_date|Datetime|expiration|lastSuccessfulSync|last_refresh)$/i;

interface PropertyHit {
  schemaName: string;
  property: string;
  schema: OpenAPIV3.SchemaObject;
}

function collectStringProperties(
  schema: OpenAPIV3.SchemaObject,
  schemaName: string,
  hits: PropertyHit[],
  visited: Set<OpenAPIV3.SchemaObject>,
): void {
  if (visited.has(schema)) return;
  visited.add(schema);

  const properties = schema.properties as Record<string, OpenAPIV3.SchemaObject> | undefined;
  if (properties) {
    for (const [name, prop] of Object.entries(properties)) {
      if (typeof prop.type === 'string' && TIMESTAMP_PROPERTY.test(name)) {
        hits.push({ schemaName, property: name, schema: prop });
      }
      collectStringProperties(prop, `${schemaName}.${name}`, hits, visited);
    }
  }
  const items = schema.items as OpenAPIV3.SchemaObject | undefined;
  if (items) collectStringProperties(items, `${schemaName}[]`, hits, visited);
}

describe('openapi contract — canonical timestamp format', () => {
  let rawSpec: string;
  let hits: PropertyHit[];

  beforeAll(async () => {
    const specPath = resolve(__dirname, '../../docs/openapi.yaml');
    rawSpec = readFileSync(specPath, 'utf-8');
    const spec = (await SwaggerParser.dereference(specPath)) as OpenAPIV3.Document;
    hits = [];
    for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
      collectStringProperties(schema as OpenAPIV3.SchemaObject, name, hits, new Set());
    }
  });

  it('documents every timestamp-like string property as an RFC 3339 date-time', () => {
    expect(hits.length).toBeGreaterThan(0);
    const offenders = hits
      .filter((hit) => hit.schema.format !== 'date-time')
      .map((hit) => `${hit.schemaName}.${hit.property}`);
    expect(offenders).toEqual([]);
  });

  it('declares the RFC 3339 UTC pattern on every timestamp-like string property', () => {
    const offenders = hits
      .filter((hit) => hit.schema.pattern !== RFC3339_UTC_PATTERN)
      .map((hit) => `${hit.schemaName}.${hit.property}`);
    expect(offenders).toEqual([]);
  });

  it('documents events[].timestamp as nullable', () => {
    const eventTimestamp = hits.find((hit) => hit.schemaName === 'Alert.events[]' && hit.property === 'timestamp');
    expect(eventTimestamp).toBeDefined();
    expect(eventTimestamp?.schema.nullable).toBe(true);
  });
});
