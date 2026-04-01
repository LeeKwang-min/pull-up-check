import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './index';
import { saveSession, getSession, getAllSessions, deleteSession } from './sessions';
import type { Session } from '../../types/analysis';

function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    id: crypto.randomUUID(),
    date: new Date(),
    angle: 'back',
    inputMode: 'camera',
    sets: [],
    overallScore: 80,
    balanceScore: 85,
    totalReps: 10,
    duration: 120,
    ...overrides,
  };
}

describe('sessions DB', () => {
  beforeEach(async () => {
    await db.sessions.clear();
  });

  it('should save and retrieve a session', async () => {
    const session = createMockSession({ id: 'test-1' });
    await saveSession(session);

    const retrieved = await getSession('test-1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('test-1');
    expect(retrieved!.overallScore).toBe(80);
  });

  it('should list all sessions sorted by date desc', async () => {
    await saveSession(createMockSession({ id: 'old', date: new Date('2026-01-01') }));
    await saveSession(createMockSession({ id: 'new', date: new Date('2026-04-01') }));

    const all = await getAllSessions();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('new');
  });

  it('should delete a session', async () => {
    await saveSession(createMockSession({ id: 'delete-me' }));
    await deleteSession('delete-me');

    const retrieved = await getSession('delete-me');
    expect(retrieved).toBeUndefined();
  });
});
