import { Router } from 'express';
import {
  createChannel,
  listChannels,
  listProviders,
  getChannel,
  updateChannel,
  deleteChannel,
  testChannel,
  testInlineChannel,
} from '@/delivery/http/controllers';
import {
  createChannelValidators,
  updateChannelValidators,
  channelIdValidators,
  testChannelValidators,
  testInlineChannelValidators,
} from '@/delivery/http/schemas';
import { handleValidationErrors } from '@/delivery/http/middlewares';

const router: Router = Router();

router.get('/', listChannels);
router.post('/', createChannelValidators, handleValidationErrors, createChannel);
router.get('/providers', listProviders);
router.post('/test', testInlineChannelValidators, handleValidationErrors, testInlineChannel);
router.get('/:id', channelIdValidators, handleValidationErrors, getChannel);
router.put('/:id', updateChannelValidators, handleValidationErrors, updateChannel);
router.delete('/:id', channelIdValidators, handleValidationErrors, deleteChannel);
router.post('/:id/test', testChannelValidators, handleValidationErrors, testChannel);

export default router;
