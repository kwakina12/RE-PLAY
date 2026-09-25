import type { AppDatabase } from '@/lib/db';
import type { AppSettings } from './schema';
import { newestFirst } from '@/lib/order';
export function settingsRepository(db: AppDatabase) {
  return {
    async get(now: string): Promise<AppSettings> { return (await db.settings.get('app')) ?? { id: 'app', analyticsChoice: 'unset', schemaVersion: 1, updatedAt: now }; },
    async update(analyticsChoice: AppSettings['analyticsChoice'], now: string): Promise<AppSettings> {
      const settings: AppSettings = { id: 'app', analyticsChoice, schemaVersion: 1, updatedAt: now };
      await db.settings.put(settings); return settings;
    },
    async snapshot() { return db.transaction('r', db.records, async () => newestFirst(await db.records.toArray(), row => row.createdAt)); },
    async clear() { await db.transaction('rw', db.records, db.drafts, db.settings, async () => { await db.records.clear(); await db.drafts.clear(); await db.settings.clear(); }); },
  };
}
