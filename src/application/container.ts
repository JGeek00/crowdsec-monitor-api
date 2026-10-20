import { SequelizeAlertRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-alert.repository';
import { SequelizeDecisionRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-decision.repository';
import { httpLapiClient } from '@/infrastructure/crowdsec/http-lapi-client';
import { ListAlertsUseCase } from './use-cases/alerts/list-alerts.usecase';
import { GetAlertUseCase } from './use-cases/alerts/get-alert.usecase';
import { DeleteAlertUseCase } from './use-cases/alerts/delete-alert.usecase';
import { GetAlertsStatsUseCase } from './use-cases/alerts/get-alerts-stats.usecase';
import { syncAlertsUseCase, SyncAlertsUseCase } from './use-cases/alerts/sync-alerts.usecase';
import { ListDecisionsUseCase } from './use-cases/decisions/list-decisions.usecase';
import { ListDecisionsByIpUseCase } from './use-cases/decisions/list-decisions-by-ip.usecase';
import { GetDecisionUseCase } from './use-cases/decisions/get-decision.usecase';
import { GetDecisionByIpUseCase } from './use-cases/decisions/get-decision-by-ip.usecase';
import { CreateDecisionUseCase } from './use-cases/decisions/create-decision.usecase';
import { DeleteDecisionUseCase } from './use-cases/decisions/delete-decision.usecase';
import { GetDecisionsStatsUseCase } from './use-cases/decisions/get-decisions-stats.usecase';

/**
 * Manual DI container (D12): explicit factories, no framework.
 * Built lazily on first import; order: repositories → clients → use cases.
 */
const buildContainer = () => {
  // Repositories (infrastructure/persistence)
  const alertRepository = new SequelizeAlertRepository();
  const decisionRepository = new SequelizeDecisionRepository();

  // CrowdSec clients (infrastructure/crowdsec)
  const lapiClient = httpLapiClient;

  // Use cases (application)
  const listAlerts = new ListAlertsUseCase({ alertRepository });
  const getAlert = new GetAlertUseCase({ alertRepository });
  const deleteAlert = new DeleteAlertUseCase({ alertRepository, lapiClient, syncAlerts: syncAlertsUseCase });
  const getAlertsStats = new GetAlertsStatsUseCase({ alertRepository });
  const syncAlerts: SyncAlertsUseCase = syncAlertsUseCase;

  const listDecisions = new ListDecisionsUseCase({ decisionRepository });
  const listDecisionsByIp = new ListDecisionsByIpUseCase({ decisionRepository });
  const getDecision = new GetDecisionUseCase({ decisionRepository });
  const getDecisionByIp = new GetDecisionByIpUseCase({ decisionRepository });
  const createDecision = new CreateDecisionUseCase({ lapiClient, syncAlerts: syncAlertsUseCase });
  const deleteDecision = new DeleteDecisionUseCase({ decisionRepository, lapiClient, syncAlerts: syncAlertsUseCase });
  const getDecisionsStats = new GetDecisionsStatsUseCase({ decisionRepository });

  return {
    repositories: { alertRepository, decisionRepository },
    useCases: {
      alerts: { listAlerts, getAlert, deleteAlert, getAlertsStats, syncAlerts },
      decisions: {
        listDecisions,
        listDecisionsByIp,
        getDecision,
        getDecisionByIp,
        createDecision,
        deleteDecision,
        getDecisionsStats,
      },
    },
  };
};

export const container = buildContainer();
