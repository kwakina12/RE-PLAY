import Dexie, { type Table } from 'dexie';
import type { SpendingRecord } from '@/features/records/types';
import type { Draft } from '@/features/drafts/types';
import type { AppSettings } from '@/features/settings/schema';
export class AppDatabase extends Dexie {
  records!: Table<SpendingRecord, string>;
  drafts!: Table<Draft, string>;
  settings!: Table<AppSettings, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ records: 'id, createdAt, verdict, category', drafts: 'id, recordId, mode, updatedAt', settings: 'id' });
  }
}
export const createDatabase = (name: string) => new AppDatabase(name);
