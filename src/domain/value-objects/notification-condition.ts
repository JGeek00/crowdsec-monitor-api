import type { Alert_SourceInfo, ConditionNode, NotificationField, NotificationOperator } from '@/models';

export interface AlertLike {
  scenario: string;
  source: Alert_SourceInfo;
  origin?: string;
  alertType?: string;
}

function readField(alert: AlertLike, field: NotificationField): string {
  switch (field) {
    case 'scenario':
      return alert.scenario ?? '';
    case 'country':
      return alert.source?.cn ?? '';
    case 'target':
      return alert.source?.value || alert.source?.ip || '';
    case 'origin':
      return alert.origin ?? '';
    case 'type':
      return alert.alertType ?? '';
    case 'scope':
      return alert.source?.scope ?? '';
    case 'ipOwner':
      return alert.source?.as_name ?? '';
    default:
      return '';
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

export function matchOperator(fieldValue: string, operator: NotificationOperator, value: string | string[]): boolean {
  const actual = normalize(fieldValue);
  const candidates = toArray(value).map(normalize);
  switch (operator) {
    case 'equals':
      return candidates.some((c) => actual === c);
    case 'not_equals':
      return candidates.every((c) => actual !== c);
    case 'in':
      return candidates.includes(actual);
    case 'not_in':
      return !candidates.includes(actual);
    case 'contains':
      return candidates.some((c) => c !== '' && actual.includes(c));
    default:
      return false;
  }
}

/** An empty `and` matches every alert (vacuous truth); an empty `or` matches none. */
export function evaluateCondition(alert: AlertLike, node: ConditionNode): boolean {
  switch (node.type) {
    case 'leaf':
      return matchOperator(readField(alert, node.field), node.operator, node.value);
    case 'and':
      return node.children.every((child: ConditionNode) => evaluateCondition(alert, child));
    case 'or':
      return node.children.some((child: ConditionNode) => evaluateCondition(alert, child));
    case 'not':
      return !evaluateCondition(alert, node.child);
    default:
      return false;
  }
}

export function isValidCondition(node: unknown): boolean {
  if (typeof node !== 'object' || node === null) return false;
  const n = node as Record<string, unknown>;
  if (n['type'] === 'leaf') {
    const fields = ['scenario', 'country', 'target', 'origin', 'type', 'scope', 'ipOwner'];
    const operators = ['equals', 'not_equals', 'in', 'not_in', 'contains'];
    if (typeof fields.includes !== 'function') return false;
    if (!fields.includes(n['field'] as string)) return false;
    if (!operators.includes(n['operator'] as string)) return false;
    const v = n['value'];
    if (typeof v === 'string') return v.length > 0 && v.length <= 500;
    if (Array.isArray(v)) {
      return v.length > 0 && v.length <= 50 && v.every((e) => typeof e === 'string' && e.length > 0);
    }
    return false;
  }
  if (n['type'] === 'and' || n['type'] === 'or') {
    // Empty children allowed: empty `and` matches every alert ("no condition"),
    // empty `or` matches none.
    return Array.isArray(n['children']) && n['children'].length <= 20;
  }
  if (n['type'] === 'not') {
    return typeof n['child'] === 'object' && n['child'] !== null;
  }
  return false;
}
