import { AlertDelivery, Decision } from '@/models';

export interface GetAlertResponse extends AlertDelivery {
  decisions?: Decision[];
}
