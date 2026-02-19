import { Request, Response } from 'express';
import { crowdSecAPI } from '../../services/crowdsec-api.service';
import { databaseService } from '../../services/database.service';
import { versionCheckerService } from '../../services/version-checker.service';
import packageJson from '../../../package.json';

export const getStatus = async (req: Request, res: Response) => {
  const lapiStatus = await (async() => {
    try {
      const isConnected = await crowdSecAPI.checkStatus();
      const lastSync = databaseService.getLastSuccessfulSync();
      return {
        lapiConnected: isConnected,
        lastSuccessfulSync: lastSync ? lastSync.toISOString() : null,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        lapiConnected: false,
        lastSuccessfulSync: null,
        timestamp: new Date().toISOString(),
      }
    }
  })();

  try {
    res.json({
      csLapi: lapiStatus,
      csMonitorApi: {
        version: packageJson.version,
        newVersionAvailable: versionCheckerService.getLatestVersion(),
      }
    });
  } catch (error) {
    res.status(500).send();
  }
};
