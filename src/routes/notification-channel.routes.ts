import { Router } from 'express';
import {
  createChannel,
  listChannels,
  getChannel,
  updateChannel,
  deleteChannel,
  testChannel,
  testInlineChannel,
} from '@/controllers';
import {
  createChannelValidators,
  updateChannelValidators,
  channelIdValidators,
  testChannelValidators,
  testInlineChannelValidators,
} from '@/validators';
import { handleValidationErrors } from '@/middlewares';

const router: Router = Router();

router.get('/', listChannels);
router.post('/', createChannelValidators, handleValidationErrors, createChannel);
router.post('/test', testInlineChannelValidators, handleValidationErrors, testInlineChannel);
router.get('/:id', channelIdValidators, handleValidationErrors, getChannel);
router.put('/:id', updateChannelValidators, handleValidationErrors, updateChannel);
router.delete('/:id', channelIdValidators, handleValidationErrors, deleteChannel);
router.post('/:id/test', testChannelValidators, handleValidationErrors, testChannel);

export default router;
