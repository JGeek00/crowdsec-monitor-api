import type { AlertRepository } from '@/application/ports/alert-repository.port';

export interface AlertStatsResult {
  total: number;
  simulated: number;
  real: number;
  appsecTotal: number;
  topScenarios: { scenario: string; count: number }[];
  topAppsecRules: { rule: string; count: number }[];
  topAppsecHosts: { host: string; count: number }[];
  topCountries: { country: string; count: number }[];
  topOrganizations: { organization: string; count: number }[];
}

// Called by: delivery/http controllers (alerts stats endpoint)
export class GetAlertsStatsUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  async execute(): Promise<AlertStatsResult> {
    const { total, simulated, appsecTotal, topScenarios, topAppsecRules, topAppsecHosts, sources } =
      await this.deps.alertRepository.getStats();

    // Group by country / organization (same JS grouping as legacy controller).
    const countryMap = new Map<string, number>();
    const organizationMap = new Map<string, number>();

    sources.forEach(({ cn, as_name }) => {
      if (cn) countryMap.set(cn, (countryMap.get(cn) || 0) + 1);
      if (as_name) organizationMap.set(as_name, (organizationMap.get(as_name) || 0) + 1);
    });

    const topCountries = Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topOrganizations = Array.from(organizationMap.entries())
      .map(([organization, count]) => ({ organization, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total,
      simulated,
      real: total - simulated,
      appsecTotal,
      topScenarios,
      topAppsecRules,
      topAppsecHosts,
      topCountries,
      topOrganizations,
    };
  }
}
