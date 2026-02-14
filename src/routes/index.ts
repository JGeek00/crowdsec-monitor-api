import { Router, Request, Response } from 'express';
import alertRoutes from './alert.routes';
import decisionRoutes from './decision.routes';
import statisticsRoutes from './statistics.routes';
import { crowdSecAPI } from '../services/crowdsec-api.service';
import { databaseService } from '../services/database.service';
import { optionalAuth } from '../middlewares';

const router = Router();

// Mount routes with optional authentication
router.use('/alerts', optionalAuth, alertRoutes);
router.use('/decisions', optionalAuth, decisionRoutes);
router.use('/statistics', optionalAuth, statisticsRoutes);

// API Health check endpoint (public)
router.get('/api-health', (req: Request, res: Response) => {
  res.json({
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// CrowdSec LAPI status endpoint (requires authentication if API_PASSWORD is set)
router.get('/lapi-status', optionalAuth, async (req: Request, res: Response) => {
  try {
    const isConnected = await crowdSecAPI.checkStatus();
    const lastSync = databaseService.getLastSuccessfulSync();
    
    if (isConnected) {
      res.json({
        status: 'connected',
        message: 'CrowdSec LAPI is reachable and authenticated',
        lastSuccessfulSync: lastSync ? lastSync.toISOString() : null,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'disconnected',
        message: 'Unable to connect to CrowdSec LAPI',
        lastSuccessfulSync: lastSync ? lastSync.toISOString() : null,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    const lastSync = databaseService.getLastSuccessfulSync();
    const response: any = {
      status: 'error',
      message: 'Error testing CrowdSec LAPI connection',
      lastSuccessfulSync: lastSync ? lastSync.toISOString() : null,
      timestamp: new Date().toISOString(),
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    res.status(503).json(response);
  }
});

export default router;
