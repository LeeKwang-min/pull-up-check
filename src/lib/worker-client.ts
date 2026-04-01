import type { WorkerInMessage, WorkerOutMessage } from '../types/worker-messages';
import type { CameraAngle, LandmarkSnapshot, FormIssue, SetData } from '../types/analysis';

export class PoseWorkerClient {
  private worker: Worker;

  onReady: (() => void) | null = null;
  onLandmarks: ((data: LandmarkSnapshot, timestamp: number) => void) | null = null;
  onRep: ((count: number, formScore: number, details: FormIssue[]) => void) | null = null;
  onFormAlert: ((issue: FormIssue) => void) | null = null;
  onProgress: ((percent: number) => void) | null = null;
  onSetSummary: ((stats: SetData) => void) | null = null;
  onError: ((message: string) => void) | null = null;

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'ready':
          this.onReady?.();
          break;
        case 'landmarks':
          this.onLandmarks?.(msg.data, msg.timestamp);
          break;
        case 'rep':
          this.onRep?.(msg.count, msg.formScore, msg.details);
          break;
        case 'form-alert':
          this.onFormAlert?.(msg.issue);
          break;
        case 'progress':
          this.onProgress?.(msg.percent);
          break;
        case 'set-summary':
          this.onSetSummary?.(msg.stats);
          break;
        case 'error':
          this.onError?.(msg.message);
          break;
      }
    };
  }

  private send(msg: WorkerInMessage): void {
    this.worker.postMessage(msg);
  }

  init(config: { angle: CameraAngle; modelPath: string }): void {
    this.send({ type: 'init', config });
  }

  sendFrame(imageData: ImageBitmap, timestamp: number): void {
    this.send({ type: 'frame', imageData, timestamp });
  }

  startSet(): void {
    this.send({ type: 'start-set' });
  }

  endSet(): void {
    this.send({ type: 'end-set' });
  }

  stop(): void {
    this.send({ type: 'stop' });
    this.worker.terminate();
  }
}
