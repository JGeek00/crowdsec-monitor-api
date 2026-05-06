export interface ErrorResponse {
  error: string;
  message: string;
}

export type ResponseWithError<T> = T | ErrorResponse;