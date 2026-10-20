import type { StatusStore } from '@/application/ports/status-store.port';
import { statusService } from '@/services/status.service';

// Called by: delivery/http controllers (status endpoint) and the WS status channel
export class GetStatusUseCase {
  constructor(private readonly deps: { statusStore?: StatusStore } = {}) {}

  /** Full clean snapshot (processes included) — same payload as the legacy controller. */
  execute() {
    return statusService.getCleanSnapshot();
  }
}

export const getStatusUseCase = new GetStatusUseCase();
