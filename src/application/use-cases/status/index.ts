import type { StatusSnapshot } from '@/shared/models';

// Called by: delivery/http controllers (status endpoint) and the WS status channel
export class GetStatusUseCase {
  constructor(private readonly deps: { getSnapshot: () => StatusSnapshot }) {}

  /** Full clean snapshot (processes included) — same payload as the legacy controller. */
  execute(): StatusSnapshot {
    return this.deps.getSnapshot();
  }
}
