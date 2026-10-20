export { parseRetentionPeriod, calculateRetentionCutoff } from '@/utils/duration';

// TODO(arch): una vez que duration.ts se desacople de log.service (T10),
// mover el cuerpo aquí para que domain no importe de legacy utils.
