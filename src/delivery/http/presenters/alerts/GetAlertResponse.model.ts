import type { AlertDelivery } from './AlertDelivery.model';
import type { Decision } from '@/domain/entities';

export interface GetAlertResponse extends AlertDelivery {
  decisions?: Decision[];
}
