import { z } from 'zod';
export type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'STORAGE_UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'UNKNOWN';
export type Result<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string; fields?: Record<string, string> } };
export class DomainError extends Error { constructor(public code: ErrorCode, message: string) { super(message); } }
export function required<T>(value: T | undefined): T { if (value === undefined) throw new DomainError('NOT_FOUND', '기록 또는 초안을 찾을 수 없어요.'); return value; }
export function conflict(condition: boolean) { if (!condition) throw new DomainError('CONFLICT', '다른 화면에서 수정됐어요. 최신 내용을 불러와 주세요.'); }
export function validAssociation(condition: boolean) { if (!condition) throw new DomainError('VALIDATION_ERROR', '초안의 종류 또는 연결된 기록이 올바르지 않아요.'); }
function errorNames(error: unknown, seen = new Set<unknown>()): string[] {
  if (!error || typeof error !== 'object' || seen.has(error)) return [];
  seen.add(error);
  const value = error as { name?: string; inner?: unknown; cause?: unknown };
  return [value.name ?? '', ...errorNames(value.inner, seen), ...errorNames(value.cause, seen)];
}
export async function result<T>(action: () => Promise<T>): Promise<Result<T>> {
  try { return { ok: true, data: await action() }; } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: { code: 'VALIDATION_ERROR', message: '입력값을 확인해 주세요.', fields: Object.fromEntries(error.issues.map(issue => [issue.path.join('.') || '_root', issue.message])) } };
    if (error instanceof DomainError) return { ok: false, error: { code: error.code, message: error.message } };
    const names = errorNames(error);
    if (names.includes('QuotaExceededError')) return { ok: false, error: { code: 'QUOTA_EXCEEDED', message: '저장 공간이 부족해요.' } };
    if (names.some(name => ['SecurityError', 'InvalidStateError', 'DatabaseClosedError', 'MissingAPIError', 'OpenFailedError', 'VersionError'].includes(name))) return { ok: false, error: { code: 'STORAGE_UNAVAILABLE', message: '브라우저 저장소를 사용할 수 없어요.' } };
    return { ok: false, error: { code: 'UNKNOWN', message: '처리하지 못했어요. 다시 시도해 주세요.' } };
  }
}
