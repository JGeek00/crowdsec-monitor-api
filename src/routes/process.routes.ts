import { Router } from 'express';
import { getProcesses } from '@/controllers';

const router: Router = Router();

/**
 * GET /api/v1/processes
 * Returns all active processes plus completed ones within the last hour.
 * WebSocket: ws://<host>/api/v1/processes/ws
 */
router.get('/', getProcesses);

export default router;
