import { Router, Request, Response } from 'express';
import alertRoutes from './alert.routes';
import decisionRoutes from './decision.routes';
import { crowdSecAPI } from '../services/crowdsec-api.service';
import { databaseService } from '../services/database.service';

const router = Router();

// Mount routes
router.use('/alerts', alertRoutes);
router.use('/decisions', decisionRoutes);

// API Health check endpoint
router.get('/api-health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// CrowdSec LAPI status endpoint
router.get('/lapi-status', async (req: Request, res: Response) => {
  try {
    const isConnected = await crowdSecAPI.checkStatus();
    const lastSync = databaseService.getLastSuccessfulSync();
    
    if (isConnected) {
      res.json({
        success: true,
        status: 'connected',
        message: 'CrowdSec LAPI is reachable and authenticated',
        lastSuccessfulSync: lastSync ? lastSync.toISOString() : null,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'disconnected',
        message: 'Unable to connect to CrowdSec LAPI',
        lastSuccessfulSync: lastSync ? lastSync.toISOString() : null,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    const lastSync = databaseService.getLastSuccessfulSync();
    res.status(503).json({
      success: false,
      status: 'error',
      message: 'Error testing CrowdSec LAPI connection',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastSuccessfulSync: lastSync ? lastSync.toISOString() : null,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
