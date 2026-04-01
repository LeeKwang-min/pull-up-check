import { db } from './index';
import type { Session } from '../../types/analysis';

export async function saveSession(session: Session): Promise<void> {
  await db.sessions.put(session);
}

export async function getSession(id: string): Promise<Session | undefined> {
  return db.sessions.get(id);
}

export async function getAllSessions(): Promise<Session[]> {
  return db.sessions.orderBy('date').reverse().toArray();
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}
