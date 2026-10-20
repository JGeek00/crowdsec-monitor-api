import { SequelizeAlertRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-alert.repository';
import { SequelizeDecisionRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-decision.repository';
import { SequelizeBlocklistRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-blocklist.repository';
import { SequelizeNotificationRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-notification.repository';
import { httpLapiClient } from '@/infrastructure/crowdsec/http-lapi-client';
import { crowdSecAPI } from '@/infrastructure/crowdsec/lapi/crowdsec-api';
import { statusService } from '@/infrastructure/status/monitor-status-store';
import { statusBlocklistService } from '@/infrastructure/status/memory-process-tracker';
import { blocklistOpsService } from '@/infrastructure/sync/blocklist-ops';
import { alertsSyncService } from '@/infrastructure/sync/alerts-sync';
import { csBlocklistSyncService } from '@/infrastructure/sync/cs-blocklists-sync';
import { notificationEngineService } from '@/infrastructure/notifications/engine';
import { notificationHistoryService } from '@/infrastructure/notifications/history';
import { versionCheckerService } from '@/infrastructure/system/version-checker';
import { log } from '@/infrastructure/system/logger';
import { ListAlertsUseCase } from '@/application/use-cases/alerts/list-alerts.usecase';
import { GetAlertUseCase } from '@/application/use-cases/alerts/get-alert.usecase';
import { DeleteAlertUseCase } from '@/application/use-cases/alerts/delete-alert.usecase';
import { GetAlertsStatsUseCase } from '@/application/use-cases/alerts/get-alerts-stats.usecase';
import { SyncAlertsUseCase } from '@/application/use-cases/alerts/sync-alerts.usecase';
import { ListDecisionsUseCase } from '@/application/use-cases/decisions/list-decisions.usecase';
import { ListDecisionsByIpUseCase } from '@/application/use-cases/decisions/list-decisions-by-ip.usecase';
import { GetDecisionUseCase } from '@/application/use-cases/decisions/get-decision.usecase';
import { GetDecisionByIpUseCase } from '@/application/use-cases/decisions/get-decision-by-ip.usecase';
import { CreateDecisionUseCase } from '@/application/use-cases/decisions/create-decision.usecase';
import { DeleteDecisionUseCase } from '@/application/use-cases/decisions/delete-decision.usecase';
import { GetDecisionsStatsUseCase } from '@/application/use-cases/decisions/get-decisions-stats.usecase';
import { CreateBlocklistUseCase } from '@/application/use-cases/blocklists/create-blocklist.usecase';
import { ToggleBlocklistUseCase } from '@/application/use-cases/blocklists/toggle-blocklist.usecase';
import { DeleteBlocklistUseCase } from '@/application/use-cases/blocklists/delete-blocklist.usecase';
import {
  RefreshSingleBlocklistUseCase,
  RefreshAllBlocklistsUseCase,
} from '@/application/use-cases/blocklists/refresh-blocklist.usecase';
import { ListBlocklistsUseCase } from '@/application/use-cases/blocklists/list-blocklists.usecase';
import { GetBlocklistUseCase } from '@/application/use-cases/blocklists/get-blocklist.usecase';
import { GetBlocklistIpsUseCase } from '@/application/use-cases/blocklists/get-blocklist-ips.usecase';
import { SyncCsBlocklistsUseCase } from '@/application/use-cases/blocklists/sync-cs-blocklists.usecase';
import {
  CheckIpUseCase,
  CheckDomainUseCase,
  CheckIpsInListUseCase,
  CheckAllowlistUseCase,
} from '@/application/use-cases/blocklists/check-blocklist.usecase';
import { ListAllowlistsUseCase, GetAllowlistUseCase } from '@/application/use-cases/blocklists/allowlists.usecase';
import {
  GetGeneralStatisticsUseCase,
  GetTopCountriesUseCase,
  GetCountryHistoryUseCase,
  GetTopIpOwnersUseCase,
  GetIpOwnerHistoryUseCase,
  GetTopScenariosUseCase,
  GetScenarioHistoryUseCase,
  GetTopTargetsUseCase,
  GetTargetHistoryUseCase,
} from '@/application/use-cases/statistics';
import {
  ListNotificationsUseCase,
  GetNotificationUseCase,
  CreateNotificationUseCase,
  UpdateNotificationUseCase,
  ToggleNotificationUseCase,
  DeleteNotificationUseCase,
  GetNotificationHistoryUseCase,
} from '@/application/use-cases/notifications';
import { CheckVersionUseCase } from '@/application/use-cases/status/version-check.usecase';
import { GetStatusUseCase } from '@/application/use-cases/status';

/**
 * Manual composition root (D12): explicit factories, no framework.
 * Built eagerly on first import; order: infrastructure adapters →
 * repositories → use cases (ports injected).
 */
const buildContainer = () => {
  // Repositories (infrastructure/persistence)
  const alertRepository = new SequelizeAlertRepository();
  const decisionRepository = new SequelizeDecisionRepository();
  const blocklistRepository = new SequelizeBlocklistRepository();
  const notificationRepository = new SequelizeNotificationRepository();

  // CrowdSec clients (infrastructure/crowdsec)
  const lapiClient = httpLapiClient;

  // Status/process stores + sync engines (infrastructure) behind ports
  const tracker = statusBlocklistService;
  const ops = blocklistOpsService;
  const syncAlerts = new SyncAlertsUseCase({ alertsSync: alertsSyncService });

  // Use cases (application)
  const listAlerts = new ListAlertsUseCase({ alertRepository });
  const getAlert = new GetAlertUseCase({ alertRepository });
  const deleteAlert = new DeleteAlertUseCase({ alertRepository, lapiClient, syncAlerts });
  const getAlertsStats = new GetAlertsStatsUseCase({ alertRepository });

  const listDecisions = new ListDecisionsUseCase({ decisionRepository });
  const listDecisionsByIp = new ListDecisionsByIpUseCase({ decisionRepository });
  const getDecision = new GetDecisionUseCase({ decisionRepository });
  const getDecisionByIp = new GetDecisionByIpUseCase({ decisionRepository });
  const createDecision = new CreateDecisionUseCase({ lapiClient, syncAlerts });
  const deleteDecision = new DeleteDecisionUseCase({ decisionRepository, lapiClient, syncAlerts });
  const getDecisionsStats = new GetDecisionsStatsUseCase({ decisionRepository });

  const statistics = {
    getGeneralStatistics: new GetGeneralStatisticsUseCase({ alertRepository }),
    getTopCountries: new GetTopCountriesUseCase({ alertRepository }),
    getCountryHistory: new GetCountryHistoryUseCase({ alertRepository }),
    getTopIpOwners: new GetTopIpOwnersUseCase({ alertRepository }),
    getIpOwnerHistory: new GetIpOwnerHistoryUseCase({ alertRepository }),
    getTopScenarios: new GetTopScenariosUseCase({ alertRepository }),
    getScenarioHistory: new GetScenarioHistoryUseCase({ alertRepository }),
    getTopTargets: new GetTopTargetsUseCase({ alertRepository }),
    getTargetHistory: new GetTargetHistoryUseCase({ alertRepository }),
  };

  const notifications = {
    listNotifications: new ListNotificationsUseCase({ notificationRepository }),
    getNotification: new GetNotificationUseCase({ notificationRepository }),
    createNotification: new CreateNotificationUseCase({ notificationRepository, engine: notificationEngineService }),
    updateNotification: new UpdateNotificationUseCase({ notificationRepository, engine: notificationEngineService }),
    toggleNotification: new ToggleNotificationUseCase({ notificationRepository, engine: notificationEngineService }),
    deleteNotification: new DeleteNotificationUseCase({ notificationRepository, engine: notificationEngineService }),
    getNotificationHistory: new GetNotificationHistoryUseCase({ history: notificationHistoryService }),
  };

  const status = {
    getStatus: new GetStatusUseCase({ getSnapshot: () => statusService.getCleanSnapshot() }),
    checkVersion: new CheckVersionUseCase({ versionChecker: versionCheckerService, statusStore: statusService }),
  };

  return {
    repositories: { alertRepository, decisionRepository, blocklistRepository, notificationRepository },
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
        createBlocklist: new CreateBlocklistUseCase({
          blocklistRepository,
          bouncer: crowdSecAPI,
          tracker,
          ops,
          logger: log,
        }),
        toggleBlocklist: new ToggleBlocklistUseCase({
          blocklistRepository,
          bouncer: crowdSecAPI,
          tracker,
          ops,
          logger: log,
        }),
        deleteBlocklist: new DeleteBlocklistUseCase({ blocklistRepository, tracker, ops, logger: log }),
        refreshSingleBlocklist: new RefreshSingleBlocklistUseCase({ blocklistRepository, tracker, ops, logger: log }),
        refreshAllBlocklists: new RefreshAllBlocklistsUseCase({ tracker, ops, logger: log }),
        listBlocklists: new ListBlocklistsUseCase({ blocklistRepository }),
        getBlocklist: new GetBlocklistUseCase({ blocklistRepository }),
        getBlocklistIps: new GetBlocklistIpsUseCase({ blocklistRepository }),
        syncCsBlocklists: new SyncCsBlocklistsUseCase({ csBlocklistSync: csBlocklistSyncService }),
        checkIp: new CheckIpUseCase({ lapiClient }),
        checkDomain: new CheckDomainUseCase({ lapiClient }),
        checkIpsInList: new CheckIpsInListUseCase({ lapiClient }),
        checkAllowlist: new CheckAllowlistUseCase({ lapiClient }),
        listAllowlists: new ListAllowlistsUseCase({ lapiClient }),
        getAllowlist: new GetAllowlistUseCase({ lapiClient }),
      },
      statistics,
      notifications,
      status,
    },
  };
};

export const container = buildContainer();
