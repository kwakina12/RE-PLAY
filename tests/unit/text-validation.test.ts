import { describe, expect, it } from 'vitest';
import { recordInputSchema } from '@/features/records/schema';
import { validateTextLength } from '@/features/records/text-validation';

const input = {
  title: '소비', category: 'food', amount: null,
  verdict: 'repeat', reasonCode: 'joy', nextRule: null,
};

// Explicit expected numbers keep the tests independent of implementation limits.
const cases = [
  { field: 'title', label: 'BMP before maximum', value: '가'.repeat(39), length: 39, valid: true },
  { field: 'title', label: 'BMP at maximum', value: '가'.repeat(40), length: 40, valid: true },
  { field: 'title', label: 'BMP above maximum', value: '가'.repeat(41), length: 41, valid: false },
  { field: 'title', label: 'emoji before maximum', value: '😀'.repeat(19) + '가', length: 39, valid: true },
  { field: 'title', label: 'emoji at maximum', value: '😀'.repeat(20), length: 40, valid: true },
  { field: 'title', label: 'emoji above maximum', value: '😀'.repeat(20) + '가', length: 41, valid: false },
  { field: 'nextRule', label: 'BMP before maximum', value: '가'.repeat(99), length: 99, valid: true },
  { field: 'nextRule', label: 'BMP at maximum', value: '가'.repeat(100), length: 100, valid: true },
  { field: 'nextRule', label: 'BMP above maximum', value: '가'.repeat(101), length: 101, valid: false },
  { field: 'nextRule', label: 'emoji before maximum', value: '😀'.repeat(49) + '가', length: 99, valid: true },
  { field: 'nextRule', label: 'emoji at maximum', value: '😀'.repeat(50), length: 100, valid: true },
  { field: 'nextRule', label: 'emoji above maximum', value: '😀'.repeat(50) + '가', length: 101, valid: false },
] as const;

describe('shared text length and confirmed schema', () => {
  it.each(cases)('$field: $label ($length UTF-16 units)', ({ field, value, length, valid }) => {
    expect(validateTextLength(field, value)).toMatchObject({ length, valid, tooLong: !valid });
    expect(recordInputSchema.safeParse({ ...input, [field]: value }).success).toBe(valid);
    // Surrounding whitespace is excluded by both UI-facing helper and schema.
    const padded = ` \t${value}\n `;
    expect(validateTextLength(field, padded)).toMatchObject({ length, valid });
    const parsed = recordInputSchema.safeParse({ ...input, [field]: padded });
    expect(parsed.success).toBe(valid);
    if (parsed.success) expect(parsed.data[field]).toBe(value);
  });

  it.each(['', ' \t\n '])('requires a title but permits an empty optional rule: %j', value => {
    expect(validateTextLength('title', value)).toMatchObject({ length: 0, valid: false, tooShort: true });
    expect(validateTextLength('nextRule', value)).toMatchObject({ length: 0, valid: true });
    expect(recordInputSchema.safeParse({ ...input, title: value }).success).toBe(false);
    expect(recordInputSchema.parse({ ...input, nextRule: value }).nextRule).toBeNull();
  });

  it.each([['😀', 2], ['👨‍👩‍👧‍👦', 11], ['e\u0301', 2]])('counts %s as %i UTF-16 units, not visible characters', (value, length) => {
    expect(validateTextLength('title', value).length).toBe(length);
    expect(validateTextLength('nextRule', value).length).toBe(length);
  });
});
