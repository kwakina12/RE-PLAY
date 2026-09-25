import type { AppDatabase } from './db';
import { createDatabase } from './db';
import { databaseName } from './env';
import { defaultRuntime, type Runtime } from './runtime';
import { createRecordService } from '@/features/records/service';
import { createDraftService } from '@/features/drafts/service';
import { createSettingsService } from '@/features/settings/service';
export function createServices(db: AppDatabase, runtime: Runtime = defaultRuntime) {
  return { ...createRecordService(db, runtime), ...createDraftService(db, runtime), ...createSettingsService(db, runtime) };
}
// Explicit lazy composition: importing domain/services never opens a production DB.
export function createBrowserServices() {
  const db = createDatabase(databaseName(import.meta.env.VITE_APP_ENV ?? (import.meta.env.DEV ? 'development' : undefined)));
  return { db, services: createServices(db) };
}
