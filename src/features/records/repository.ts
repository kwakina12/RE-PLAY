import type { AppDatabase } from '@/lib/db';
import { conflict, required, validAssociation } from '@/lib/errors';
import { newestFirst } from '@/lib/order';
import type { Filters, RecordInput, SpendingRecord } from './types';
export function recordRepository(db: AppDatabase) {
  return {
    async create(args: { draftId: string; recordId: string; input: RecordInput }, now: string) {
      return db.transaction('rw', db.records, db.drafts, async () => {
        const existing = await db.records.get(args.recordId);
        if (existing) return { record: existing, created: false };
        const draft = required(await db.drafts.get(args.draftId));
        validAssociation(draft.mode === 'create' && draft.recordId === args.recordId);
        const record: SpendingRecord = { ...args.input, id: args.recordId, createdAt: now, updatedAt: now, revision: 1 };
        await db.records.add(record);
        await db.drafts.delete(draft.id);
        return { record, created: true };
      });
    },
    async update(args: { id: string; draftId: string; input: RecordInput; expectedRevision: number }, now: string) {
      return db.transaction('rw', db.records, db.drafts, async () => {
        const current = required(await db.records.get(args.id));
        const draft = required(await db.drafts.get(args.draftId));
        validAssociation(draft.mode === 'edit' && draft.recordId === args.id);
        conflict(current.revision === args.expectedRevision && draft.baseRevision === args.expectedRevision);
        const record: SpendingRecord = { ...args.input, id: current.id, createdAt: current.createdAt, updatedAt: now, revision: current.revision + 1 };
        await db.records.update(record.id, record);
        await db.drafts.delete(draft.id);
        return record;
      });
    },
    async list(filters: Filters) {
      const rows = (await db.records.toArray()).filter(row => (!filters.verdict || row.verdict === filters.verdict) && (!filters.category || row.category === filters.category));
      return newestFirst(rows, row => row.createdAt);
    },
    async get(id: string) { return required(await db.records.get(id)); },
    async delete(id: string) { await db.transaction('rw', db.records, db.drafts, async () => { await db.records.delete(id); await db.drafts.where('recordId').equals(id).delete(); }); },
  };
}
