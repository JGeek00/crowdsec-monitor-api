import { Router } from 'express';
import {
  createNotification,
  listNotifications,
  getNotification,
  updateNotification,
  deleteNotification,
  toggleNotification,
  getNotificationHistory,
} from '@/controllers';
import {
  createNotificationValidators,
  updateNotificationValidators,
  notificationIdValidators,
  toggleNotificationValidators,
} from '@/validators';
import { handleValidationErrors } from '@/middlewares';

const router: Router = Router();

router.get('/history', getNotificationHistory);
router.get('/', listNotifications);
router.post('/', createNotificationValidators, handleValidationErrors, createNotification);
router.get('/:id', notificationIdValidators, handleValidationErrors, getNotification);
router.put('/:id', updateNotificationValidators, handleValidationErrors, updateNotification);
router.delete('/:id', notificationIdValidators, handleValidationErrors, deleteNotification);
router.post('/:id/enabled', toggleNotificationValidators, handleValidationErrors, toggleNotification);

export default router;
