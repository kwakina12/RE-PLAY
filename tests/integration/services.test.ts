import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type AppDatabase } from '@/lib/db';
import { createServices } from '@/lib/services';
import type { Result } from '@/lib/errors';
import type { RecordInput } from '@/features/records/types';
let db: AppDatabase;
let api: ReturnType<typeof createServices>;
let now: string;
const input: RecordInput = { title: '점심', category: 'food', amount: null, verdict: 'repeat', reasonCode: 'joy', nextRule: null };
function data<T>(value: Result<T>): T { if (!value.ok) throw new Error(JSON.stringify(value.error)); return value.data; }
function code(value: Result<unknown>, expected: string) { expect(value).toMatchObject({ ok: false, error: { code: expected } }); }
async function draft() { return data(await api.startDraft({ mode: 'create' })); }
async function record(values: RecordInput = input) {
  const d = await draft();
  return data(await api.createRecord({ draftId: d.id, recordId: d.recordId, input: values })).record;
}
beforeEach(() => {
  db = createDatabase(`test-${crypto.randomUUID()}`);
  now = '2026-09-25T00:00:00.000Z';
  api = createServices(db, { clock: () => now, id: () => crypto.randomUUID() });
});
afterEach(async () => { await db.delete(); });
describe('draft lifecycle', () => {
  it('creates distinct drafts, persists incomplete values and isolates lists', async () => {
    const a = await draft(), b = await draft();
    expect(a.id).not.toBe(b.id); expect(a.recordId).not.toBe(b.recordId);
    const values = { ...a.values, amountText: '12,', title: '', nextRule: 'a'.repeat(101) };
    const saved = data(await api.saveDraft({ id: a.id, values, step: 'reflection', expectedRevision: 1 }));
    expect(saved).toMatchObject({ revision: 2, values, step: 'reflection', baseRevision: null, recordId: a.recordId });
    expect(data(await api.getDraft(a.id))).toEqual(saved);
    expect(data(await api.listRecords())).toEqual([]);
    const drafts = data(await api.listDrafts());
    expect(drafts.map(d => d.id)).toEqual([a.id, b.id].sort());
    now = '2026-09-26T00:00:00.000Z';
    data(await api.saveDraft({ id: b.id, values: b.values, step: 'expense', expectedRevision: 1 }));
    expect(data(await api.listDrafts())[0].id).toBe(b.id);
  });
  it('rejects stale and racing saves; late saves never recreate deleted drafts', async () => {
    const d = await draft();
    const args = { id: d.id, values: d.values, step: 'expense', expectedRevision: 1 };
    const results = await Promise.all([api.saveDraft(args), api.saveDraft(args)]);
    expect(results.filter(r => r.ok)).toHaveLength(1);
    code(results.find(r => !r.ok)!, 'CONFLICT');
    expect(data(await api.getDraft(d.id)).revision).toBe(2);
    data(await api.deleteDraft(d.id)); data(await api.deleteDraft(d.id));
    code(await api.saveDraft({ ...args, expectedRevision: 2 }), 'NOT_FOUND');
    expect(await db.drafts.count()).toBe(0);
  });
  it('checks mode/step associations and system fields', async () => {
    const d = await draft();
    code(await api.saveDraft({ id: d.id, values: d.values, step: 'edit', expectedRevision: 1 }), 'VALIDATION_ERROR');
    code(await api.saveDraft({ id: d.id, values: d.values, step: 'expense', expectedRevision: 1, baseRevision: 8 }), 'VALIDATION_ERROR');
    code(await api.startDraft({ mode: 'create', recordId: d.recordId }), 'VALIDATION_ERROR');
    code(await api.startDraft({ mode: 'edit' }), 'VALIDATION_ERROR');
    code(await api.startDraft({ mode: 'edit', recordId: d.recordId }), 'NOT_FOUND');
    expect(data(await api.getDraft(d.id))).toEqual(d);
  });
});
describe('atomic record writes', () => {
  it('commits record + deletes draft, retries idempotently and ignores unrelated draft', async () => {
    const d = await draft();
    const args = { draftId: d.id, recordId: d.recordId, input };
    const created = data(await api.createRecord(args));
    expect(created.created).toBe(true); expect(await db.drafts.count()).toBe(0);
    const other = await draft();
    const retried = data(await api.createRecord({ ...args, draftId: other.id, input: { ...input, title: '변경 시도' } }));
    expect(retried).toEqual({ record: created.record, created: false });
    expect(await db.records.count()).toBe(1); expect(await db.drafts.get(other.id)).toEqual(other);
  });
  it('simultaneous create requests produce one record', async () => {
    const d = await draft(); const args = { draftId: d.id, recordId: d.recordId, input };
    const results = (await Promise.all([api.createRecord(args), api.createRecord(args)])).map(data);
    expect(results.map(r => r.created).sort()).toEqual([false, true]);
    expect(await db.records.count()).toBe(1); expect(await db.drafts.count()).toBe(0);
  });
  it('rolls record insertion and draft deletion back on real transaction failure', async () => {
    const d = await draft();
    const fail = () => { throw new DOMException('test-only', 'QuotaExceededError'); };
    db.drafts.hook('deleting', fail);
    code(await api.createRecord({ draftId: d.id, recordId: d.recordId, input }), 'QUOTA_EXCEEDED');
    db.drafts.hook('deleting').unsubscribe(fail);
    expect(await db.records.count()).toBe(0); expect(await db.drafts.get(d.id)).toEqual(d);
  });
  it('rejects draft identity mismatch and invalid input before writing', async () => {
    const d = await draft();
    code(await api.createRecord({ draftId: d.id, recordId: crypto.randomUUID(), input }), 'VALIDATION_ERROR');
    code(await api.createRecord({ draftId: d.id, recordId: d.recordId, input: { ...input, id: d.recordId } }), 'VALIDATION_ERROR');
    code(await api.createRecord({ draftId: d.id, recordId: d.recordId, input: { ...input, verdict: 'unsure' } }), 'VALIDATION_ERROR');
    expect(await db.records.count()).toBe(0); expect(await db.drafts.count()).toBe(1);
  });
  it('updates timestamp/revision, preserves identity and rejects stale edit', async () => {
    const r = await record();
    const a = data(await api.startDraft({ mode: 'edit', recordId: r.id }));
    const b = data(await api.startDraft({ mode: 'edit', recordId: r.id }));
    expect(a).toMatchObject({ mode: 'edit', step: 'edit', baseRevision: 1, values: { title: r.title, amountText: '', nextRule: '' } });
    now = '2026-09-26T00:00:00.000Z';
    const updated = data(await api.updateRecord({ id: r.id, draftId: a.id, input: { ...input, title: '수정' }, expectedRevision: 1 }));
    expect(updated).toMatchObject({ id: r.id, createdAt: r.createdAt, updatedAt: now, revision: 2, title: '수정' });
    expect(await db.drafts.get(a.id)).toBeUndefined();
    code(await api.updateRecord({ id: r.id, draftId: b.id, input, expectedRevision: 1 }), 'CONFLICT');
    code(await api.updateRecord({ id: r.id, draftId: b.id, input, expectedRevision: 2 }), 'CONFLICT');
    expect(data(await api.getRecord(r.id))).toEqual(updated); expect(await db.drafts.get(b.id)).toEqual(b);
  });
  it('only one of two concurrent edits wins', async () => {
    const r = await record();
    const a = data(await api.startDraft({ mode: 'edit', recordId: r.id })), b = data(await api.startDraft({ mode: 'edit', recordId: r.id }));
    const results = await Promise.all([a, b].map(d => api.updateRecord({ id: r.id, draftId: d.id, expectedRevision: 1, input: { ...input, title: d.id } })));
    expect(results.filter(r => r.ok)).toHaveLength(1); code(results.find(r => !r.ok)!, 'CONFLICT');
    expect(data(await api.getRecord(r.id)).revision).toBe(2); expect(await db.drafts.count()).toBe(1);
  });
  it('update rollback preserves original and draft', async () => {
    const r = await record(); const d = data(await api.startDraft({ mode: 'edit', recordId: r.id }));
    const fail = () => { throw new Error('injected'); }; db.drafts.hook('deleting', fail);
    code(await api.updateRecord({ id: r.id, draftId: d.id, input: { ...input, title: '변경' }, expectedRevision: 1 }), 'UNKNOWN');
    db.drafts.hook('deleting').unsubscribe(fail);
    expect(await db.records.get(r.id)).toEqual(r); expect(await db.drafts.get(d.id)).toEqual(d);
  });
  it('deleted records and all linked drafts cannot resurrect', async () => {
    const d = await draft(); const args = { draftId: d.id, recordId: d.recordId, input }; const r = data(await api.createRecord(args)).record;
    const a = data(await api.startDraft({ mode: 'edit', recordId: r.id }));
    data(await api.startDraft({ mode: 'edit', recordId: r.id }));
    data(await api.deleteRecord(r.id)); data(await api.deleteRecord(r.id));
    code(await api.updateRecord({ id: r.id, draftId: a.id, input, expectedRevision: 1 }), 'NOT_FOUND');
    code(await api.createRecord(args), 'NOT_FOUND');
    code(await api.saveDraft({ id: a.id, values: a.values, step: 'edit', expectedRevision: 1 }), 'NOT_FOUND');
    expect(await db.records.count()).toBe(0); expect(await db.drafts.count()).toBe(0);
  });
  it('delete rollback keeps record and linked drafts', async () => {
    const r = await record(); const d = data(await api.startDraft({ mode: 'edit', recordId: r.id }));
    const fail = () => { throw new Error('injected'); }; db.drafts.hook('deleting', fail);
    code(await api.deleteRecord(r.id), 'UNKNOWN'); db.drafts.hook('deleting').unsubscribe(fail);
    expect(await db.records.get(r.id)).toEqual(r); expect(await db.drafts.get(d.id)).toEqual(d);
  });
});
it('AND filters and createdAt descending/id ascending ordering', async () => {
  const a = await record(); const b = await record();
  now = '2026-09-26T00:00:00.000Z';
  const c = await record({ ...input, category: 'shopping', verdict: 'change', reasonCode: 'unused' });
  expect(data(await api.listRecords()).map(r => r.id)).toEqual([c.id, ...[a.id, b.id].sort()]);
  expect(data(await api.listRecords({ verdict: 'repeat', category: 'food' })).map(r => r.id)).toEqual([a.id, b.id].sort());
  expect(data(await api.listRecords({ verdict: 'repeat', category: 'shopping' }))).toEqual([]);
});
it('settings default is read-only, patch strict, export excludes drafts/settings, clear retains schema', async () => {
  expect(data(await api.getSettings())).toEqual({ id: 'app', analyticsChoice: 'unset', schemaVersion: 1, updatedAt: now });
  expect(await db.settings.count()).toBe(0);
  data(await api.updateSettings({ analyticsChoice: 'enabled' }));
  expect(data(await api.getSettings()).analyticsChoice).toBe('enabled');
  code(await api.updateSettings({ analyticsChoice: 'disabled', schemaVersion: 2 }), 'VALIDATION_ERROR');
  const r = await record(); await draft();
  const blob = data(await api.exportRecords()); expect(blob.type).toBe('application/json');
  expect(JSON.parse(await blob.text())).toEqual({ schemaVersion: 1, exportedAt: now, records: [r] });
  data(await api.clearAllData());
  expect(await Promise.all([db.records.count(), db.drafts.count(), db.settings.count()])).toEqual([0, 0, 0]);
  expect(db.verno).toBe(1); expect(db.tables.map(t => t.name).sort()).toEqual(['drafts', 'records', 'settings']);
  expect(data(await api.getSettings()).analyticsChoice).toBe('unset');
  expect(await db.settings.count()).toBe(0);
});
it('clearAllData rolls all three tables back on failure', async () => {
  const r = await record(); const d = await draft(); data(await api.updateSettings({ analyticsChoice: 'disabled' }));
  const fail = () => { throw new Error('injected'); }; db.settings.hook('deleting', fail);
  code(await api.clearAllData(), 'UNKNOWN'); db.settings.hook('deleting').unsubscribe(fail);
  expect(await db.records.get(r.id)).toEqual(r); expect(await db.drafts.get(d.id)).toEqual(d); expect(await db.settings.count()).toBe(1);
});
it('persists across close and new instance with same name', async () => {
  const r = await record(); const d = await draft(); data(await api.updateSettings({ analyticsChoice: 'disabled' }));
  const name = db.name; db.close(); db = createDatabase(name); await db.open(); api = createServices(db);
  expect(data(await api.getRecord(r.id))).toEqual(r); expect(data(await api.getDraft(d.id))).toEqual(d); expect(data(await api.getSettings()).analyticsChoice).toBe('disabled');
});
it('maps a closed database and does not delete data', async () => {
  const r = await record(); db.close();
  code(await api.getRecord(r.id), 'STORAGE_UNAVAILABLE'); await db.open(); expect(await db.records.get(r.id)).toEqual(r);
});
it('all ID/version/enum/unknown-field boundaries reject without writes', async () => {
  for (const call of [api.getRecord('bad'), api.deleteRecord('bad'), api.getDraft('bad'), api.deleteDraft('bad'), api.listRecords({ verdict: 'bad' }), api.listRecords({ unexpected: true }), api.startDraft({ mode: 'bad' }), api.updateSettings({ analyticsChoice: 'bad' })]) code(await call, 'VALIDATION_ERROR');
  const d = await draft();
  for (const expectedRevision of [0, -1, 1.5, '1', NaN, Infinity]) {
    code(await api.saveDraft({ id: d.id, values: d.values, step: 'expense', expectedRevision }), 'VALIDATION_ERROR');
    code(await api.updateRecord({ id: d.recordId, draftId: d.id, input, expectedRevision }), 'VALIDATION_ERROR');
  }
  expect(await db.records.count()).toBe(0); expect(await db.drafts.get(d.id)).toEqual(d);
});
