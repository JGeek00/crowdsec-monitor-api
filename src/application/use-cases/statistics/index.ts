import type { AlertRepository } from '@/application/ports/alert-repository.port';

type Repo = AlertRepository;

// Called by: delivery/http controllers (statistics endpoints)
export class GetGeneralStatisticsUseCase {
  constructor(private readonly deps: { alertRepository: Repo }) {}

  execute(since: string | undefined, amount: number | undefined): ReturnType<Repo['getGeneralStats']> {
    return this.deps.alertRepository.getGeneralStats(since, amount);
  }
}

export class GetTopCountriesUseCase {
  constructor(private readonly deps: { alertRepository: Repo }) {}

  execute(): ReturnType<Repo['getTopCountries']> {
    return this.deps.alertRepository.getTopCountries();
  }
}

export class GetCountryHistoryUseCase {
  constructor(private readonly deps: { alertRepository: Repo }) {}

  execute(countryCode: string): ReturnType<Repo['getCountryHistory']> {
    return this.deps.alertRepository.getCountryHistory(countryCode);
  }
}

export class GetTopIpOwnersUseCase {
  constructor(private readonly deps: { alertRepository: Repo }) {}

  execute(): ReturnType<Repo['getTopIpOwners']> {
    return this.deps.alertRepository.getTopIpOwners();
  }
}

export class GetIpOwnerHistoryUseCase {
  constructor(private readonly deps: { alertRepository: Repo }) {}

  execute(ipOwner: string): ReturnType<Repo['getIpOwnerHistory']> {
    return this.deps.alertRepository.getIpOwnerHistory(ipOwner);
  }
}

export class GetTopScenariosUseCase {
  constructor(private readonly deps: { alertRepository: Repo }) {}

  execute(): ReturnType<Repo['getTopScenarios']> {
    return this.deps.alertRepository.getTopScenarios();
  }
}

export class GetScenarioHistoryUseCase {
  constructor(private readonly deps: { alertRepository: Repo }) {}

  execute(scenario: string): ReturnType<Repo['getScenarioHistory']> {
    return this.deps.alertRepository.getScenarioHistory(scenario);
  }
}

export class GetTopTargetsUseCase {
  constructor(private readonly deps: { alertRepository: Repo }) {}

  execute(): ReturnType<Repo['getTopTargets']> {
    return this.deps.alertRepository.getTopTargets();
  }
}

export class GetTargetHistoryUseCase {
  constructor(private readonly deps: { alertRepository: Repo }) {}

  execute(target: string): ReturnType<Repo['getTargetHistory']> {
    return this.deps.alertRepository.getTargetHistory(target);
  }
}
