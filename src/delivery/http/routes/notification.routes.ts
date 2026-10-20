import { Router } from 'express';
import {
  createNotification,
  listNotifications,
  getNotification,
  updateNotification,
  deleteNotification,
  toggleNotification,
  getNotificationHistory,
  getNotificationHistoryAlerts,
} from '@/delivery/http/controllers';
import {
  createNotificationValidators,
  updateNotificationValidators,
  notificationIdValidators,
  notificationHistoryIdValidators,
  toggleNotificationValidators,
} from '@/delivery/http/schemas';
import { handleValidationErrors } from '@/delivery/http/middlewares';

const router: Router = Router();

router.get('/history', getNotificationHistory);
router.get(
  '/history/:id/alerts',
  notificationHistoryIdValidators,
  handleValidationErrors,
  getNotificationHistoryAlerts,
);
router.get('/', listNotifications);
router.post('/', createNotificationValidators, handleValidationErrors, createNotification);
router.get('/:id', notificationIdValidators, handleValidationErrors, getNotification);
router.put('/:id', updateNotificationValidators, handleValidationErrors, updateNotification);
router.delete('/:id', notificationIdValidators, handleValidationErrors, deleteNotification);
router.post('/:id/enabled', toggleNotificationValidators, handleValidationErrors, toggleNotification);

export default router;
