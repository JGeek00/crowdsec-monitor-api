export { parseRetentionPeriod, calculateRetentionCutoff } from '@/shared/utils/duration';

// TODO(arch): once duration.ts is decoupled from log.service (T10),
// move the body here so domain does not import from legacy utils.
