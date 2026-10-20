// Called by: delivery/http controllers (status endpoint) and the WS status channel
export class GetStatusUseCase {
  constructor(private readonly deps: { getSnapshot: () => unknown }) {}

  /** Full clean snapshot (processes included) — same payload as the legacy controller. */
  execute<T = unknown>(): T {
    return this.deps.getSnapshot() as T;
  }
}
