import { resolve } from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv, { type ValidateFunction } from 'ajv';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';

let spec: OpenAPIV3.Document | null = null;
const validatorCache = new Map<string, ValidateFunction>();
const ajv = new Ajv({ strict: false });

async function loadSpec(): Promise<OpenAPIV3.Document> {
  if (!spec) {
    const specPath = resolve(__dirname, '../../openapi.yaml');
    spec = (await SwaggerParser.dereference(specPath)) as OpenAPIV3.Document;
  }
  return spec;
}

/**
 * Build the cache key from operationId + status string.
 */
function cacheKey(operationId: string, status: number): string {
  return `${operationId}:${status}`;
}

/**
 * Find the response schema for a given operationId and HTTP status code.
 * Walks the spec paths to find the operation with matching operationId,
 * then extracts the response schema for the given status.
 */
function findResponseSchema(
  specDoc: OpenAPIV3.Document,
  operationId: string,
  status: number,
): OpenAPIV3.SchemaObject | undefined {
  const paths = specDoc.paths || {};
  for (const path of Object.keys(paths)) {
    const pathItem = paths[path] as OpenAPIV3.PathItemObject;
    const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
    for (const method of methods) {
      const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
      if (operation?.operationId === operationId) {
        const responses = operation.responses || {};
        const statusKey = String(status);
        const responseRef = responses[statusKey] as OpenAPIV3.ResponseObject | undefined;
        if (!responseRef) return undefined;

        const content = responseRef.content;
        if (content?.['application/json']?.schema) {
          return content['application/json'].schema as OpenAPIV3.SchemaObject;
        }
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Validate a response body against the OpenAPI spec for a given operationId + status.
 * Throws an AssertionError-like message if the body doesn't match.
 * Schemas are compiled once and cached.
 */
export async function validateResponse(operationId: string, status: number, body: unknown): Promise<void> {
  const key = cacheKey(operationId, status);
  let validate = validatorCache.get(key);

  if (!validate) {
    const specDoc = await loadSpec();
    const schema = findResponseSchema(specDoc, operationId, status);

    if (!schema) {
      throw new Error(`No schema found for operationId "${operationId}" with status ${status} in openapi.yaml`);
    }

    // Wrap the schema as a response wrapper if the spec uses { data: ... } pattern
    validate = ajv.compile(schema);
    validatorCache.set(key, validate);
  }

  const valid = validate(body);
  if (!valid) {
    const errors =
      validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join('; ') || 'unknown validation error';
    throw new Error(`Response body for "${operationId}" (${status}) does not match openapi.yaml schema: ${errors}`);
  }
}
