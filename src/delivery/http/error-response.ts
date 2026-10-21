import { ErrorResponse } from '@/shared/models';

export function errorResponse(error: string, message: string): ErrorResponse {
  return { error, message };
}
