export const TEXT_LIMITS = {
  title: { min: 1, max: 40 },
  nextRule: { min: 0, max: 100 },
} as const;

/** Shared by the schema and future UI counters: trimmed UTF-16 code units. */
export function validateTextLength(field: keyof typeof TEXT_LIMITS, value: string) {
  const { min, max } = TEXT_LIMITS[field];
  const length = value.trim().length;
  const tooShort = length < min;
  const tooLong = length > max;
  return { length, min, max, tooShort, tooLong, valid: !tooShort && !tooLong };
}
