import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoseWorkerClient } from './worker-client';
import type { WorkerOutMessage } from '../types/worker-messages';

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  simulateMessage(data: WorkerOutMessage) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

describe('PoseWorkerClient', () => {
  let mockWorker: MockWorker;
  let client: PoseWorkerClient;

  beforeEach(() => {
    mockWorker = new MockWorker();
    client = new PoseWorkerClient(mockWorker as unknown as Worker);
  });

  it('should send init message', () => {
    client.init({ angle: 'back', modelPath: '/model.task' });
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'init',
      config: { angle: 'back', modelPath: '/model.task' },
    });
  });

  it('should call onRep when worker sends rep message', () => {
    const onRep = vi.fn();
    client.onRep = onRep;

    mockWorker.simulateMessage({
      type: 'rep',
      count: 1,
      formScore: 85,
      details: [],
    });

    expect(onRep).toHaveBeenCalledWith(1, 85, []);
  });

  it('should send stop and terminate', () => {
    client.stop();
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'stop' });
    expect(mockWorker.terminate).toHaveBeenCalled();
  });
});
