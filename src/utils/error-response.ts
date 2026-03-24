import { ErrorResponse } from "@/types/error-response.types";

export function errorResponse(error: string, message: string): ErrorResponse {
  return { error, message };
}
