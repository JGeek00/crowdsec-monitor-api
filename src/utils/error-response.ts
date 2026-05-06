import { ErrorResponse } from "@/models";

export function errorResponse(error: string, message: string): ErrorResponse {
  return { error, message };
}
