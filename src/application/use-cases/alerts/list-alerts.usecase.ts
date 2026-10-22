import type { AlertRepository } from '@/application/ports/alert-repository.port';
import { parseTimestampRange } from '@/shared/utils/timestamp-range';

// Called by: delivery/http controllers (alerts list endpoint) and the MCP `list_alerts` tool
export class ListAlertsUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(query: Parameters<AlertRepository['findWithFilters']>[0]) {
    const range = parseTimestampRange(query);
    return this.deps.alertRepository.findWithFilters({
      ...query,
      start_timestamp: range.start_timestamp as Date | undefined,
      end_timestamp: range.end_timestamp as Date | undefined,
    });
  }
}
