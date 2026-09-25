import type { RecordInput, Verdict } from './types';
import { DomainError } from '@/lib/errors';
export function normalizeAmount(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^(?:\d+|[1-9]\d{0,2}(?:,\d{3})+)$/.test(text)) throw new DomainError('VALIDATION_ERROR', '금액은 0–999,999,999 범위의 정수로 입력해 주세요.');
  const amount = Number(text.replaceAll(',', ''));
  if (!Number.isSafeInteger(amount) || amount > 999999999) throw new DomainError('VALIDATION_ERROR', '금액은 0–999,999,999 범위의 정수로 입력해 주세요.');
  return amount;
}
export function transitionVerdict(values: { verdict: Verdict | null; reasonCode: RecordInput['reasonCode']; nextRule: string | null }, verdict: Verdict) {
  const changed = values.verdict !== verdict;
  return { values: { verdict, reasonCode: changed || verdict === 'unsure' ? null : values.reasonCode, nextRule: verdict === 'unsure' ? null : values.nextRule }, requiresRuleDeletionConfirmation: changed && verdict === 'unsure' && Boolean(values.nextRule?.trim()) };
}
