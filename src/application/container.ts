import { SequelizeAlertRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-alert.repository';
import { SequelizeDecisionRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-decision.repository';
import { SequelizeBlocklistRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-blocklist.repository';
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
import { CreateBlocklistUseCase } from './use-cases/blocklists/create-blocklist.usecase';
import { ToggleBlocklistUseCase } from './use-cases/blocklists/toggle-blocklist.usecase';
import { DeleteBlocklistUseCase } from './use-cases/blocklists/delete-blocklist.usecase';
import {
  RefreshSingleBlocklistUseCase,
  RefreshAllBlocklistsUseCase,
} from './use-cases/blocklists/refresh-blocklist.usecase';
import { ListBlocklistsUseCase } from './use-cases/blocklists/list-blocklists.usecase';
import { GetBlocklistUseCase } from './use-cases/blocklists/get-blocklist.usecase';
import { GetBlocklistIpsUseCase } from './use-cases/blocklists/get-blocklist-ips.usecase';
import {
  CheckIpUseCase,
  CheckDomainUseCase,
  CheckIpsInListUseCase,
  CheckAllowlistUseCase,
} from './use-cases/blocklists/check-blocklist.usecase';
import { ListAllowlistsUseCase, GetAllowlistUseCase } from './use-cases/blocklists/allowlists.usecase';

/**
 * Manual DI container (D12): explicit factories, no framework.
 * Built lazily on first import; order: repositories → clients → use cases.
 */
const buildContainer = () => {
  // Repositories (infrastructure/persistence)
  const alertRepository = new SequelizeAlertRepository();
  const decisionRepository = new SequelizeDecisionRepository();
  const blocklistRepository = new SequelizeBlocklistRepository();

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
    repositories: { alertRepository, decisionRepository, blocklistRepository },
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
      blocklists: {
        createBlocklist: new CreateBlocklistUseCase({ blocklistRepository }),
        toggleBlocklist: new ToggleBlocklistUseCase({ blocklistRepository }),
        deleteBlocklist: new DeleteBlocklistUseCase({ blocklistRepository }),
        refreshSingleBlocklist: new RefreshSingleBlocklistUseCase({ blocklistRepository }),
        refreshAllBlocklists: new RefreshAllBlocklistsUseCase({ blocklistRepository }),
        listBlocklists: new ListBlocklistsUseCase({ blocklistRepository }),
        getBlocklist: new GetBlocklistUseCase({ blocklistRepository }),
        getBlocklistIps: new GetBlocklistIpsUseCase({ blocklistRepository }),
        checkIp: new CheckIpUseCase({ lapiClient }),
        checkDomain: new CheckDomainUseCase({ lapiClient }),
        checkIpsInList: new CheckIpsInListUseCase({ lapiClient }),
        checkAllowlist: new CheckAllowlistUseCase({ lapiClient }),
        listAllowlists: new ListAllowlistsUseCase({ lapiClient }),
        getAllowlist: new GetAllowlistUseCase({ lapiClient }),
      },
    },
  };
};

export const container = buildContainer();
