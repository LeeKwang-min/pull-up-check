import Dexie, { type EntityTable } from 'dexie';
import type { Session } from '../../types/analysis';

const database = new Dexie('PullUpCheckDB') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
};

database.version(1).stores({
  sessions: 'id, date',
});

export const db = database;
