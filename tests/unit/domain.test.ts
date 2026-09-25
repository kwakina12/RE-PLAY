import { describe, expect, it } from 'vitest';
import { recordInputSchema } from '@/features/records/schema';
import { normalizeAmount, transitionVerdict } from '@/features/records/normalize';
import { databaseName } from '@/lib/env';
import { result } from '@/lib/errors';
import { draftValuesSchema } from '@/features/drafts/schema';
const base = { title: ' 점심 ', category: 'food', amount: null, verdict: 'repeat', reasonCode: 'joy', nextRule: '' };
describe('confirmed input', () => {
  it('trims text and normalizes optional rules', () => {
    expect(recordInputSchema.parse(base)).toMatchObject({ title: '점심', nextRule: null });
    expect(recordInputSchema.parse({ ...base, nextRule: ' 다음 ' }).nextRule).toBe('다음');
    const { nextRule: _, ...withoutRule } = base; void _;
    expect(recordInputSchema.parse(withoutRule).nextRule).toBeNull();
  });
  it.each([['', false], ['  ', false], ['가'.repeat(40), true], ['가'.repeat(41), false], ['😀'.repeat(20), true], ['😀'.repeat(21), false]])('title JS length %s', (title, success) => expect(recordInputSchema.safeParse({ ...base, title }).success).toBe(success));
  it.each([100, 101])('rule length %i', n => expect(recordInputSchema.safeParse({ ...base, nextRule: 'a'.repeat(n) }).success).toBe(n === 100));
  it.each([null, 0, 999999999])('allows amount %s', amount => expect(recordInputSchema.safeParse({ ...base, amount }).success).toBe(true));
  it.each([-1, 0.1, NaN, Infinity, 1000000000, '0', undefined])('rejects amount %s', amount => expect(recordInputSchema.safeParse({ ...base, amount }).success).toBe(false));
  it.each([
    ['repeat', 'joy', null, true], ['repeat', 'unused', null, false], ['change', 'unused', null, true], ['change', 'joy', null, false], ['change', null, null, false], ['repeat', null, null, false], ['unsure', null, null, true], ['unsure', 'joy', null, false], ['unsure', null, '', false], ['unsure', null, 'rule', false], ['other', null, null, false],
  ])('verdict/reason/rule %s/%s/%s', (verdict, reasonCode, nextRule, expected) => expect(recordInputSchema.safeParse({ ...base, verdict, reasonCode, nextRule }).success).toBe(expected));
  it('rejects unknown input fields and enums', () => {
    expect(recordInputSchema.safeParse({ ...base, revision: 8 }).success).toBe(false);
    expect(recordInputSchema.safeParse({ ...base, category: 'unknown' }).success).toBe(false);
  });
});
describe('amount parsing', () => {
  it.each([['', null], ['  ', null], ['0', 0], ['12000', 12000], ['12,000', 12000], ['999,999,999', 999999999], [' 1,000 ', 1000]])('parses %s', (text, value) => expect(normalizeAmount(text)).toBe(value));
  it.each(['-1', '1.0', 'NaN', 'Infinity', '1e3', '12,00', '1,00,000', '01,000', ',100', '1,000,', 'abc', '12원', '+1', '1 000', '1000000000'])('rejects %s', text => expect(() => normalizeAmount(text)).toThrow());
});
it('verdict transition returns proposal without mutating original', () => {
  const original = { verdict: 'repeat' as const, reasonCode: 'joy' as const, nextRule: '계속' };
  expect(transitionVerdict(original, 'change')).toEqual({ values: { verdict: 'change', reasonCode: null, nextRule: '계속' }, requiresRuleDeletionConfirmation: false });
  expect(transitionVerdict(original, 'unsure')).toEqual({ values: { verdict: 'unsure', reasonCode: null, nextRule: null }, requiresRuleDeletionConfirmation: true });
  expect(transitionVerdict(original, 'repeat').values).toEqual(original);
  expect(original.nextRule).toBe('계속');
  expect(transitionVerdict({ ...original, nextRule: ' ' }, 'unsure').requiresRuleDeletionConfirmation).toBe(false);
});
it('draft validation allows incomplete strings but rejects types, enum and unknown fields', () => {
  const values = { title: '', category: null, amountText: '12,', verdict: null, reasonCode: null, nextRule: 'a'.repeat(101) };
  expect(draftValuesSchema.safeParse(values).success).toBe(true);
  for (const patch of [{ amountText: 12 }, { category: 'bad' }, { reasonCode: 'bad' }, { extra: true }]) expect(draftValuesSchema.safeParse({ ...values, ...patch }).success).toBe(false);
});
it('maps environment explicitly', () => {
  expect(['development', 'preview', 'production'].map(databaseName)).toEqual(['dasissum-dev', 'dasissum-preview', 'dasissum']);
  expect(() => databaseName(undefined)).toThrow();
  expect(() => databaseName('typo')).toThrow();
});
it.each([['QuotaExceededError', 'QUOTA_EXCEEDED'], ['SecurityError', 'STORAGE_UNAVAILABLE'], ['OpenFailedError', 'STORAGE_UNAVAILABLE'], ['MissingAPIError', 'STORAGE_UNAVAILABLE'], ['VersionError', 'STORAGE_UNAVAILABLE'], ['AbortError', 'UNKNOWN'], ['Error', 'UNKNOWN']])('maps errors without leaking content %s', async (name, code) => {
  const error = Object.assign(new Error('private title'), { name });
  const actual = await result(async () => { throw error; });
  expect(actual).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(actual)).not.toContain('private title');
});
it('maps nested quota error', async () => expect(await result(async () => { throw { name: 'OpenFailedError', inner: { name: 'QuotaExceededError' } }; })).toMatchObject({ ok: false, error: { code: 'QUOTA_EXCEEDED' } }));
it('nextRule uses UTF-16 JS length as well', () => {
  expect(recordInputSchema.safeParse({ ...base, nextRule: '😀'.repeat(50) }).success).toBe(true);
  expect(recordInputSchema.safeParse({ ...base, nextRule: '😀'.repeat(51) }).success).toBe(false);
});
it('design-only fixtures satisfy confirmed schemas', async () => {
  const { designRecords } = await import('../fixtures/design-records');
  for (const record of designRecords) expect(recordInputSchema.safeParse(record).success).toBe(true);
});
