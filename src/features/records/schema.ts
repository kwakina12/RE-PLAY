import { z } from 'zod';
import { CATEGORIES, VERDICTS, REPEAT_REASONS, CHANGE_REASONS } from './constants';
import { validateTextLength } from './text-validation';
export const categorySchema = z.enum(Object.keys(CATEGORIES) as [keyof typeof CATEGORIES, ...(keyof typeof CATEGORIES)[]]);
export const verdictSchema = z.enum(Object.keys(VERDICTS) as [keyof typeof VERDICTS, ...(keyof typeof VERDICTS)[]]);
export const repeatReasonSchema = z.enum(Object.keys(REPEAT_REASONS) as [keyof typeof REPEAT_REASONS, ...(keyof typeof REPEAT_REASONS)[]]);
export const changeReasonSchema = z.enum(Object.keys(CHANGE_REASONS) as [keyof typeof CHANGE_REASONS, ...(keyof typeof CHANGE_REASONS)[]]);
export const idSchema = z.uuid();
export const revisionSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const nextRule = z.string().trim()
  .refine(value => validateTextLength('nextRule', value).valid, '다음 소비 기준은 100자 이내로 입력해 주세요.')
  .nullable().optional().transform(value => value || null);
const common = {
  title: z.string().trim()
    .refine(value => !validateTextLength('title', value).tooShort, '소비 이름을 입력해 주세요.')
    .refine(value => !validateTextLength('title', value).tooLong, '소비 이름은 40자 이내로 입력해 주세요.'),
  category: categorySchema,
  amount: z.number().int().min(0).max(999999999).nullable(),
};
export const recordInputSchema = z.discriminatedUnion('verdict', [
  z.strictObject({ ...common, verdict: z.literal('repeat'), reasonCode: repeatReasonSchema, nextRule }),
  z.strictObject({ ...common, verdict: z.literal('change'), reasonCode: changeReasonSchema, nextRule }),
  z.strictObject({ ...common, verdict: z.literal('unsure'), reasonCode: z.null(), nextRule: z.null().optional().transform(() => null) }),
]);
export const filtersSchema = z.strictObject({ verdict: verdictSchema.optional(), category: categorySchema.optional() });
export const createRecordSchema = z.strictObject({ draftId: idSchema, recordId: idSchema, input: recordInputSchema });
export const updateRecordSchema = z.strictObject({ id: idSchema, draftId: idSchema, input: recordInputSchema, expectedRevision: revisionSchema });
