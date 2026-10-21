// Implemented by: infrastructure/system/system-clock.ts
// Called by: application/use-cases/*, application/jobs/*
export interface Clock {
  now(): Date;
}
