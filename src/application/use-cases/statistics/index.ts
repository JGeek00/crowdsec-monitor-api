import type { AlertRepository } from '@/application/ports/alert-repository.port';

// Called by: delivery/http controllers (statistics endpoints)
export class GetGeneralStatisticsUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(since: string | undefined, amount: number | undefined): Promise<unknown> {
    return this.deps.alertRepository.getGeneralStats(since, amount);
  }
}

export class GetTopCountriesUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(): Promise<unknown> {
    return this.deps.alertRepository.getTopCountries();
  }
}

export class GetCountryHistoryUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(countryCode: string): Promise<unknown> {
    return this.deps.alertRepository.getCountryHistory(countryCode);
  }
}

export class GetTopIpOwnersUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(): Promise<unknown> {
    return this.deps.alertRepository.getTopIpOwners();
  }
}

export class GetIpOwnerHistoryUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(ipOwner: string): Promise<unknown> {
    return this.deps.alertRepository.getIpOwnerHistory(ipOwner);
  }
}

export class GetTopScenariosUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(): Promise<unknown> {
    return this.deps.alertRepository.getTopScenarios();
  }
}

export class GetScenarioHistoryUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(scenario: string): Promise<unknown> {
    return this.deps.alertRepository.getScenarioHistory(scenario);
  }
}

export class GetTopTargetsUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(): Promise<unknown> {
    return this.deps.alertRepository.getTopTargets();
  }
}

export class GetTargetHistoryUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(target: string): Promise<unknown> {
    return this.deps.alertRepository.getTargetHistory(target);
  }
}
