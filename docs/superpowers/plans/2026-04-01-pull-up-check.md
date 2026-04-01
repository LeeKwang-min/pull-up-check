# Pull-Up Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side pull-up form analysis web app that counts reps, detects form breakdown, and generates visual reports using MediaPipe Pose Landmarker in a Web Worker.

**Architecture:** Two-thread model — React UI on main thread, MediaPipe + analysis engine in a Web Worker communicating via postMessage. Filming angle selection (front/back/side) activates different rule sets. All data stored locally in IndexedDB.

**Tech Stack:** React 19 + Vite, TypeScript, Tailwind CSS v4, TanStack Router, Zustand, @mediapipe/tasks-vision (WASM), D3.js, Dexie.js, html2canvas

**Spec:** `docs/superpowers/specs/2026-04-01-pull-up-check-design.md`

---

## File Map

```
src/
  main.tsx                          # Vite entry, render App
  App.tsx                           # RouterProvider setup
  routeTree.gen.ts                  # TanStack Router generated route tree
  routes/
    __root.tsx                      # Root layout with nav shell
    index.tsx                       # Landing page
    analyze/
      index.tsx                     # Mode & angle selection
      camera.tsx                    # Real-time camera analysis
      upload.tsx                    # Video upload analysis
    result/
      $id.tsx                       # Analysis report dashboard
    history/
      index.tsx                     # Session history list
    settings/
      index.tsx                     # User preferences
  components/
    layout/
      Shell.tsx                     # App shell with bottom nav
      BottomNav.tsx                 # Mobile bottom navigation
    camera/
      CameraView.tsx                # Camera stream with overlay
      CameraControls.tsx            # Start/stop/set buttons
    upload/
      VideoDropzone.tsx             # Drag & drop + file picker
      VideoPlayer.tsx               # Upload playback with progress
    analysis/
      LandmarkOverlay.tsx           # SVG overlay drawing landmarks
      LiveStats.tsx                 # Real-time rep count & alerts
    report/
      SetChart.tsx                  # D3 set-by-set line chart
      BodyDiagram.tsx               # D3 human body balance diagram
      FeedbackList.tsx              # Improvement feedback cards
      ScoreCard.tsx                 # Overall/balance score display
      ReportExport.tsx              # Image save & share buttons
    shared/
      AngleSelector.tsx             # Front/back/side radio selector
      ProgressBar.tsx               # Analysis progress indicator
  workers/
    pose-worker.ts                  # Web Worker: MediaPipe + analysis
  lib/
    analysis/
      angle-calculator.ts           # Joint angle math (3 points → degrees)
      rep-counter.ts                # State machine: extended↔flexed = 1 rep
      form-analyzer.ts              # Orchestrates rule sets per angle
      rule-sets/
        front-back.ts               # Asymmetry, sway rules
        side.ts                     # ROM, kipping rules
        shared.ts                   # Rep tempo, consistency rules
    db/
      index.ts                      # Dexie database class
      sessions.ts                   # Session CRUD helpers
    export/
      image.ts                      # html2canvas + Web Share API
    worker-client.ts                # Main-thread wrapper for Worker comms
  stores/
    analysis-store.ts               # Live analysis state (landmarks, reps, alerts)
    session-store.ts                # Settings & current session
  types/
    analysis.ts                     # Session, SetData, RepData, FormIssue, etc.
    worker-messages.ts              # Main↔Worker message discriminated unions
index.html                          # Vite HTML entry
vite.config.ts                      # Vite config with worker plugin
tailwind.config.ts                  # Tailwind v4 config
tsconfig.json                       # TypeScript config
package.json                        # Dependencies
vitest.config.ts                    # Vitest config
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `postcss.config.js`, `.gitignore`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd /Users/leekwangmin/Desktop/pull-up-check
npm create vite@latest . -- --template react-ts
```

Select `React` and `TypeScript` when prompted. If the directory is non-empty, confirm overwrite.

- [ ] **Step 2: Install core dependencies**

```bash
npm install @tanstack/react-router @tanstack/router-devtools zustand dexie d3 html2canvas @mediapipe/tasks-vision
npm install -D tailwindcss @tailwindcss/vite postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom @types/d3 @tanstack/router-plugin
```

- [ ] **Step 3: Configure Tailwind CSS v4**

Replace `src/index.css` with:

```css
@import "tailwindcss";
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ quoteStyle: 'single' }),
    react(),
    tailwindcss(),
  ],
  worker: {
    format: 'es',
  },
});
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Configure TanStack Router**

Create `src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => <Outlet />,
});
```

Create `src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold">Pull-Up Check</h1>
    </div>
  );
}
```

Update `src/App.tsx`:

```tsx
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
```

Update `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: App opens at `http://localhost:5173` showing "Pull-Up Check".

- [ ] **Step 7: Verify tests run**

Add a smoke test `src/App.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('should be true', () => {
    expect(true).toBe(true);
  });
});
```

```bash
npx vitest run
```

Expected: 1 test passes.

- [ ] **Step 8: Update .gitignore and commit**

Ensure `.gitignore` includes:

```
node_modules
dist
.superpowers
```

```bash
git add -A
git commit -m "chore: scaffold project with Vite, React, TypeScript, Tailwind, TanStack Router"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `src/types/analysis.ts`, `src/types/worker-messages.ts`
- Test: `src/types/analysis.test.ts`

- [ ] **Step 1: Write type validation test**

Create `src/types/analysis.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type {
  Point3D,
  LandmarkSnapshot,
  FormIssue,
  RepData,
  SetData,
  Session,
  CameraAngle,
  InputMode,
} from './analysis';

describe('Analysis types', () => {
  it('should create a valid Session object', () => {
    const session: Session = {
      id: 'test-uuid',
      date: new Date('2026-04-01'),
      angle: 'back',
      inputMode: 'camera',
      sets: [
        {
          setNumber: 1,
          reps: [
            {
              repNumber: 1,
              formScore: 85,
              tempo: 2400,
              rom: 92,
              landmarks: createMockLandmarks(),
              issues: [],
            },
          ],
          averageFormScore: 85,
          formBreakdownRep: null,
        },
      ],
      overallScore: 85,
      balanceScore: 90,
      totalReps: 1,
      duration: 30,
    };

    expect(session.id).toBe('test-uuid');
    expect(session.sets).toHaveLength(1);
    expect(session.sets[0].reps[0].formScore).toBe(85);
  });

  it('should create FormIssue with all severity levels', () => {
    const issues: FormIssue[] = [
      {
        type: 'asymmetry',
        severity: 'low',
        detail: 'Left shoulder 3% lower',
        values: { leftY: 0.3, rightY: 0.31 },
      },
      {
        type: 'kipping',
        severity: 'high',
        detail: 'Significant hip swing detected',
        values: { hipSwing: 25 },
      },
    ];

    expect(issues[0].severity).toBe('low');
    expect(issues[1].type).toBe('kipping');
  });
});

function createMockLandmarks(): LandmarkSnapshot {
  const point = (): Point3D => ({ x: 0, y: 0, z: 0, visibility: 1 });
  return {
    shoulderLeft: point(),
    shoulderRight: point(),
    elbowLeft: point(),
    elbowRight: point(),
    wristLeft: point(),
    wristRight: point(),
    hipLeft: point(),
    hipRight: point(),
    kneeLeft: point(),
    kneeRight: point(),
    nose: point(),
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/types/analysis.test.ts
```

Expected: FAIL — cannot find module `./analysis`.

- [ ] **Step 3: Create analysis types**

Create `src/types/analysis.ts`:

```typescript
export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface LandmarkSnapshot {
  shoulderLeft: Point3D;
  shoulderRight: Point3D;
  elbowLeft: Point3D;
  elbowRight: Point3D;
  wristLeft: Point3D;
  wristRight: Point3D;
  hipLeft: Point3D;
  hipRight: Point3D;
  kneeLeft: Point3D;
  kneeRight: Point3D;
  nose: Point3D;
}

export type CameraAngle = 'front' | 'back' | 'side';
export type InputMode = 'camera' | 'upload';
export type FormIssueType = 'asymmetry' | 'kipping' | 'incomplete_rom' | 'body_swing';
export type Severity = 'low' | 'medium' | 'high';

export interface FormIssue {
  type: FormIssueType;
  severity: Severity;
  detail: string;
  values: Record<string, number>;
}

export interface RepData {
  repNumber: number;
  formScore: number;
  tempo: number;
  rom: number;
  landmarks: LandmarkSnapshot;
  issues: FormIssue[];
}

export interface SetData {
  setNumber: number;
  reps: RepData[];
  averageFormScore: number;
  formBreakdownRep: number | null;
}

export interface Session {
  id: string;
  date: Date;
  angle: CameraAngle;
  inputMode: InputMode;
  sets: SetData[];
  overallScore: number;
  balanceScore: number;
  totalReps: number;
  duration: number;
}
```

- [ ] **Step 4: Create worker message types**

Create `src/types/worker-messages.ts`:

```typescript
import type { CameraAngle, LandmarkSnapshot, FormIssue, SetData } from './analysis';

// Main → Worker
export type WorkerInMessage =
  | { type: 'init'; config: { angle: CameraAngle; modelPath: string } }
  | { type: 'frame'; imageData: ImageBitmap; timestamp: number }
  | { type: 'start-set' }
  | { type: 'end-set' }
  | { type: 'stop' };

// Worker → Main
export type WorkerOutMessage =
  | { type: 'ready' }
  | { type: 'landmarks'; data: LandmarkSnapshot; timestamp: number }
  | { type: 'rep'; count: number; formScore: number; details: FormIssue[] }
  | { type: 'form-alert'; issue: FormIssue }
  | { type: 'progress'; percent: number }
  | { type: 'set-summary'; stats: SetData }
  | { type: 'error'; message: string };
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
npx vitest run src/types/analysis.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/
git commit -m "feat: add analysis and worker message type definitions"
```

---

## Task 3: Analysis Core — Angle Calculator

**Files:**
- Create: `src/lib/analysis/angle-calculator.ts`
- Test: `src/lib/analysis/angle-calculator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/analysis/angle-calculator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateAngle,
  calculateAsymmetry,
  calculateDisplacement,
} from './angle-calculator';
import type { Point3D } from '../../types/analysis';

const p = (x: number, y: number, z = 0): Point3D => ({
  x, y, z, visibility: 1,
});

describe('calculateAngle', () => {
  it('should return 180 for a straight line', () => {
    const a = p(0, 0);
    const b = p(1, 0);
    const c = p(2, 0);
    expect(calculateAngle(a, b, c)).toBeCloseTo(180, 0);
  });

  it('should return 90 for a right angle', () => {
    const a = p(0, 1);
    const b = p(0, 0);
    const c = p(1, 0);
    expect(calculateAngle(a, b, c)).toBeCloseTo(90, 0);
  });

  it('should return ~45 for a 45-degree angle', () => {
    const a = p(0, 1);
    const b = p(0, 0);
    const c = p(1, 1);
    expect(calculateAngle(a, b, c)).toBeCloseTo(45, 0);
  });
});

describe('calculateAsymmetry', () => {
  it('should return 0 for identical values', () => {
    expect(calculateAsymmetry(0.5, 0.5)).toBeCloseTo(0);
  });

  it('should return positive percentage when left is higher (lower y)', () => {
    // In screen coords, lower y = higher position
    expect(calculateAsymmetry(0.4, 0.5)).toBeCloseTo(10);
  });

  it('should return negative percentage when right is higher', () => {
    expect(calculateAsymmetry(0.6, 0.5)).toBeCloseTo(-10);
  });
});

describe('calculateDisplacement', () => {
  it('should return 0 for same position', () => {
    expect(calculateDisplacement(p(0.5, 0.5), p(0.5, 0.5))).toBeCloseTo(0);
  });

  it('should return horizontal distance between two points', () => {
    expect(calculateDisplacement(p(0.3, 0.5), p(0.5, 0.5))).toBeCloseTo(0.2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/analysis/angle-calculator.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement angle calculator**

Create `src/lib/analysis/angle-calculator.ts`:

```typescript
import type { Point3D } from '../../types/analysis';

/**
 * Calculate angle at point B formed by points A-B-C in degrees.
 * Uses 2D coordinates (x, y) since camera provides a flat plane.
 */
export function calculateAngle(a: Point3D, b: Point3D, c: Point3D): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };

  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2);

  if (magBA === 0 || magBC === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Calculate asymmetry percentage between left and right Y positions.
 * Positive = left is higher (lower y in screen coords), Negative = right is higher.
 * Returns percentage relative to average position.
 */
export function calculateAsymmetry(leftY: number, rightY: number): number {
  const avg = (leftY + rightY) / 2;
  if (avg === 0) return 0;
  return ((rightY - leftY) / avg) * 100;
}

/**
 * Calculate horizontal displacement (X-axis distance) between two points.
 */
export function calculateDisplacement(a: Point3D, b: Point3D): number {
  return Math.abs(a.x - b.x);
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npx vitest run src/lib/analysis/angle-calculator.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/angle-calculator.ts src/lib/analysis/angle-calculator.test.ts
git commit -m "feat: add angle calculator with asymmetry and displacement utils"
```

---

## Task 4: Analysis Core — Rep Counter

**Files:**
- Create: `src/lib/analysis/rep-counter.ts`
- Test: `src/lib/analysis/rep-counter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/analysis/rep-counter.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RepCounter } from './rep-counter';

describe('RepCounter', () => {
  let counter: RepCounter;

  beforeEach(() => {
    counter = new RepCounter();
  });

  it('should start at 0 reps', () => {
    expect(counter.count).toBe(0);
    expect(counter.phase).toBe('idle');
  });

  it('should not count until full cycle completes', () => {
    // Arm extended (large angle)
    counter.update(170, 1000);
    expect(counter.count).toBe(0);
    expect(counter.phase).toBe('extended');
  });

  it('should count 1 rep after extend → flex → extend cycle', () => {
    counter.update(170, 1000); // extended
    counter.update(160, 1100);
    counter.update(100, 1200);
    counter.update(50, 1300);  // flexed (top of pull-up)
    counter.update(40, 1400);
    counter.update(90, 1500);
    counter.update(150, 1600);
    counter.update(170, 1700); // back to extended = 1 rep

    expect(counter.count).toBe(1);
  });

  it('should track tempo for each rep', () => {
    counter.update(170, 1000);
    counter.update(40, 2000);
    counter.update(170, 3000);

    expect(counter.count).toBe(1);
    expect(counter.lastTempo).toBeCloseTo(2000);
  });

  it('should count multiple reps', () => {
    // Rep 1
    counter.update(170, 1000);
    counter.update(40, 2000);
    counter.update(170, 3000);
    // Rep 2
    counter.update(40, 4000);
    counter.update(170, 5000);

    expect(counter.count).toBe(2);
  });

  it('should track ROM as minimum angle reached', () => {
    counter.update(170, 1000);
    counter.update(35, 2000);
    counter.update(170, 3000);

    expect(counter.lastRom).toBeCloseTo(35);
  });

  it('should reset correctly', () => {
    counter.update(170, 1000);
    counter.update(40, 2000);
    counter.update(170, 3000);

    counter.reset();
    expect(counter.count).toBe(0);
    expect(counter.phase).toBe('idle');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/analysis/rep-counter.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement rep counter state machine**

Create `src/lib/analysis/rep-counter.ts`:

```typescript
export type RepPhase = 'idle' | 'extended' | 'flexing' | 'flexed' | 'extending';

const EXTENDED_THRESHOLD = 140;
const FLEXED_THRESHOLD = 70;

export class RepCounter {
  count = 0;
  phase: RepPhase = 'idle';
  lastTempo = 0;
  lastRom = 0;

  private repStartTime = 0;
  private minAngle = 180;

  update(elbowAngle: number, timestamp: number): boolean {
    let repCompleted = false;

    switch (this.phase) {
      case 'idle':
        if (elbowAngle >= EXTENDED_THRESHOLD) {
          this.phase = 'extended';
          this.repStartTime = timestamp;
        }
        break;

      case 'extended':
        if (elbowAngle < EXTENDED_THRESHOLD) {
          this.phase = 'flexing';
          this.minAngle = elbowAngle;
        }
        break;

      case 'flexing':
        this.minAngle = Math.min(this.minAngle, elbowAngle);
        if (elbowAngle <= FLEXED_THRESHOLD) {
          this.phase = 'flexed';
        }
        break;

      case 'flexed':
        this.minAngle = Math.min(this.minAngle, elbowAngle);
        if (elbowAngle > FLEXED_THRESHOLD) {
          this.phase = 'extending';
        }
        break;

      case 'extending':
        if (elbowAngle >= EXTENDED_THRESHOLD) {
          this.count++;
          this.lastTempo = timestamp - this.repStartTime;
          this.lastRom = this.minAngle;
          this.phase = 'extended';
          this.repStartTime = timestamp;
          this.minAngle = 180;
          repCompleted = true;
        } else if (elbowAngle <= FLEXED_THRESHOLD) {
          this.phase = 'flexed';
        }
        break;
    }

    return repCompleted;
  }

  reset(): void {
    this.count = 0;
    this.phase = 'idle';
    this.lastTempo = 0;
    this.lastRom = 0;
    this.repStartTime = 0;
    this.minAngle = 180;
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npx vitest run src/lib/analysis/rep-counter.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/rep-counter.ts src/lib/analysis/rep-counter.test.ts
git commit -m "feat: add rep counter state machine with tempo and ROM tracking"
```

---

## Task 5: Analysis Core — Form Analyzer Rule Sets

**Files:**
- Create: `src/lib/analysis/rule-sets/front-back.ts`, `src/lib/analysis/rule-sets/side.ts`, `src/lib/analysis/rule-sets/shared.ts`, `src/lib/analysis/form-analyzer.ts`
- Test: `src/lib/analysis/form-analyzer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/analysis/form-analyzer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { FormAnalyzer } from './form-analyzer';
import type { LandmarkSnapshot, Point3D, FormIssue } from '../../types/analysis';

const p = (x: number, y: number, z = 0): Point3D => ({
  x, y, z, visibility: 1,
});

function symmetricLandmarks(): LandmarkSnapshot {
  return {
    shoulderLeft: p(0.4, 0.3),
    shoulderRight: p(0.6, 0.3),
    elbowLeft: p(0.35, 0.5),
    elbowRight: p(0.65, 0.5),
    wristLeft: p(0.35, 0.2),
    wristRight: p(0.65, 0.2),
    hipLeft: p(0.45, 0.7),
    hipRight: p(0.55, 0.7),
    kneeLeft: p(0.45, 0.9),
    kneeRight: p(0.55, 0.9),
    nose: p(0.5, 0.15),
  };
}

function asymmetricLandmarks(): LandmarkSnapshot {
  return {
    ...symmetricLandmarks(),
    shoulderLeft: p(0.4, 0.35),  // left shoulder 16% lower than right
    shoulderRight: p(0.6, 0.25),
  };
}

describe('FormAnalyzer — front/back', () => {
  it('should return no issues for symmetric form', () => {
    const analyzer = new FormAnalyzer('front');
    const issues = analyzer.analyze(symmetricLandmarks());
    const asymmetryIssues = issues.filter((i) => i.type === 'asymmetry');
    expect(asymmetryIssues).toHaveLength(0);
  });

  it('should detect shoulder asymmetry', () => {
    const analyzer = new FormAnalyzer('back');
    const issues = analyzer.analyze(asymmetricLandmarks());
    const shoulderIssue = issues.find(
      (i) => i.type === 'asymmetry' && i.detail.includes('shoulder'),
    );
    expect(shoulderIssue).toBeDefined();
    expect(shoulderIssue!.severity).toBe('medium');
  });
});

describe('FormAnalyzer — side', () => {
  it('should detect body swing', () => {
    const analyzer = new FormAnalyzer('side');
    const landmarks = symmetricLandmarks();
    // Simulate first frame baseline
    analyzer.analyze(landmarks);
    // Hip swings forward significantly
    const swung = {
      ...landmarks,
      hipLeft: p(0.6, 0.7),
      hipRight: p(0.7, 0.7),
    };
    const issues = analyzer.analyze(swung);
    const swingIssue = issues.find((i) => i.type === 'body_swing');
    expect(swingIssue).toBeDefined();
  });
});

describe('FormAnalyzer — shared', () => {
  it('should compute form score from issues', () => {
    const analyzer = new FormAnalyzer('front');
    const score = analyzer.computeFormScore([]);
    expect(score).toBe(100);
  });

  it('should deduct points for issues by severity', () => {
    const analyzer = new FormAnalyzer('front');
    const issues: FormIssue[] = [
      { type: 'asymmetry', severity: 'medium', detail: '', values: {} },
      { type: 'body_swing', severity: 'low', detail: '', values: {} },
    ];
    const score = analyzer.computeFormScore(issues);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/analysis/form-analyzer.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement shared rules**

Create `src/lib/analysis/rule-sets/shared.ts`:

```typescript
import type { FormIssue, Severity } from '../../../types/analysis';

const SEVERITY_DEDUCTIONS: Record<Severity, number> = {
  low: 5,
  medium: 15,
  high: 25,
};

export function computeFormScore(issues: FormIssue[]): number {
  const total = issues.reduce(
    (sum, issue) => sum + SEVERITY_DEDUCTIONS[issue.severity],
    0,
  );
  return Math.max(0, 100 - total);
}
```

- [ ] **Step 4: Implement front/back rules**

Create `src/lib/analysis/rule-sets/front-back.ts`:

```typescript
import type { LandmarkSnapshot, FormIssue, Severity } from '../../../types/analysis';
import { calculateAsymmetry } from '../angle-calculator';

const SHOULDER_THRESHOLD = 5;
const ELBOW_THRESHOLD = 8;

function classifySeverity(value: number, medium: number, high: number): Severity {
  const abs = Math.abs(value);
  if (abs >= high) return 'high';
  if (abs >= medium) return 'medium';
  return 'low';
}

export function analyzeFrontBack(landmarks: LandmarkSnapshot): FormIssue[] {
  const issues: FormIssue[] = [];

  // Shoulder asymmetry
  const shoulderAsym = calculateAsymmetry(
    landmarks.shoulderLeft.y,
    landmarks.shoulderRight.y,
  );
  if (Math.abs(shoulderAsym) > SHOULDER_THRESHOLD) {
    const side = shoulderAsym > 0 ? 'left' : 'right';
    issues.push({
      type: 'asymmetry',
      severity: classifySeverity(shoulderAsym, 5, 15),
      detail: `${side} shoulder is ${Math.abs(shoulderAsym).toFixed(1)}% lower`,
      values: { shoulderAsymmetry: shoulderAsym },
    });
  }

  // Elbow asymmetry
  const elbowAsym = calculateAsymmetry(
    landmarks.elbowLeft.y,
    landmarks.elbowRight.y,
  );
  if (Math.abs(elbowAsym) > ELBOW_THRESHOLD) {
    const side = elbowAsym > 0 ? 'left' : 'right';
    issues.push({
      type: 'asymmetry',
      severity: classifySeverity(elbowAsym, 8, 20),
      detail: `${side} elbow is ${Math.abs(elbowAsym).toFixed(1)}% lower`,
      values: { elbowAsymmetry: elbowAsym },
    });
  }

  return issues;
}
```

- [ ] **Step 5: Implement side rules**

Create `src/lib/analysis/rule-sets/side.ts`:

```typescript
import type { LandmarkSnapshot, FormIssue } from '../../../types/analysis';

const SWING_THRESHOLD = 0.08;

let baselineHipX: number | null = null;

export function resetSideState(): void {
  baselineHipX = null;
}

export function analyzeSide(landmarks: LandmarkSnapshot): FormIssue[] {
  const issues: FormIssue[] = [];

  const hipMidX = (landmarks.hipLeft.x + landmarks.hipRight.x) / 2;

  if (baselineHipX === null) {
    baselineHipX = hipMidX;
    return issues;
  }

  // Body swing detection
  const swing = Math.abs(hipMidX - baselineHipX);
  if (swing > SWING_THRESHOLD) {
    issues.push({
      type: 'body_swing',
      severity: swing > 0.15 ? 'high' : swing > 0.1 ? 'medium' : 'low',
      detail: `Body swing detected: ${(swing * 100).toFixed(1)}% displacement`,
      values: { swingAmount: swing },
    });
  }

  // Kipping detection (hip vertical movement)
  const hipMidY = (landmarks.hipLeft.y + landmarks.hipRight.y) / 2;
  const kneeMidY = (landmarks.kneeLeft.y + landmarks.kneeRight.y) / 2;
  const hipKneeAngleProxy = Math.abs(hipMidY - kneeMidY);

  if (hipKneeAngleProxy < 0.1) {
    issues.push({
      type: 'kipping',
      severity: 'medium',
      detail: 'Possible kipping: knees raised toward hips',
      values: { hipKneeDistance: hipKneeAngleProxy },
    });
  }

  return issues;
}
```

- [ ] **Step 6: Implement form analyzer orchestrator**

Create `src/lib/analysis/form-analyzer.ts`:

```typescript
import type { CameraAngle, LandmarkSnapshot, FormIssue } from '../../types/analysis';
import { analyzeFrontBack } from './rule-sets/front-back';
import { analyzeSide, resetSideState } from './rule-sets/side';
import { computeFormScore } from './rule-sets/shared';

export class FormAnalyzer {
  private angle: CameraAngle;

  constructor(angle: CameraAngle) {
    this.angle = angle;
    resetSideState();
  }

  analyze(landmarks: LandmarkSnapshot): FormIssue[] {
    switch (this.angle) {
      case 'front':
      case 'back':
        return analyzeFrontBack(landmarks);
      case 'side':
        return analyzeSide(landmarks);
    }
  }

  computeFormScore(issues: FormIssue[]): number {
    return computeFormScore(issues);
  }
}
```

- [ ] **Step 7: Run tests and verify they pass**

```bash
npx vitest run src/lib/analysis/form-analyzer.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/analysis/form-analyzer.ts src/lib/analysis/form-analyzer.test.ts src/lib/analysis/rule-sets/
git commit -m "feat: add form analyzer with front/back/side rule sets"
```

---

## Task 6: Database Layer

**Files:**
- Create: `src/lib/db/index.ts`, `src/lib/db/sessions.ts`
- Test: `src/lib/db/sessions.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/db/sessions.test.ts`:

```typescript
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
```

- [ ] **Step 2: Install fake-indexeddb for testing**

```bash
npm install -D fake-indexeddb
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run src/lib/db/sessions.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement database setup**

Create `src/lib/db/index.ts`:

```typescript
import Dexie, { type EntityTable } from 'dexie';
import type { Session } from '../../types/analysis';

const database = new Dexie('PullUpCheckDB') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
};

database.version(1).stores({
  sessions: 'id, date',
});

export const db = database;
```

- [ ] **Step 5: Implement session CRUD**

Create `src/lib/db/sessions.ts`:

```typescript
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
```

- [ ] **Step 6: Run tests and verify they pass**

```bash
npx vitest run src/lib/db/sessions.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/ package.json package-lock.json
git commit -m "feat: add IndexedDB persistence layer with Dexie.js"
```

---

## Task 7: Zustand Stores

**Files:**
- Create: `src/stores/analysis-store.ts`, `src/stores/session-store.ts`
- Test: `src/stores/analysis-store.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/stores/analysis-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAnalysisStore } from './analysis-store';

describe('analysisStore', () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
  });

  it('should start with default state', () => {
    const state = useAnalysisStore.getState();
    expect(state.isAnalyzing).toBe(false);
    expect(state.repCount).toBe(0);
    expect(state.currentSet).toBe(1);
    expect(state.alerts).toEqual([]);
  });

  it('should increment rep count', () => {
    useAnalysisStore.getState().addRep(85, []);
    expect(useAnalysisStore.getState().repCount).toBe(1);
  });

  it('should track form alerts', () => {
    const alert = {
      type: 'asymmetry' as const,
      severity: 'medium' as const,
      detail: 'Left shoulder lower',
      values: {},
    };
    useAnalysisStore.getState().addAlert(alert);
    expect(useAnalysisStore.getState().alerts).toHaveLength(1);
  });

  it('should advance to next set', () => {
    useAnalysisStore.getState().addRep(90, []);
    useAnalysisStore.getState().nextSet();
    expect(useAnalysisStore.getState().currentSet).toBe(2);
    expect(useAnalysisStore.getState().repCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/stores/analysis-store.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement analysis store**

Create `src/stores/analysis-store.ts`:

```typescript
import { create } from 'zustand';
import type { FormIssue, LandmarkSnapshot, RepData, SetData } from '../types/analysis';

interface AnalysisState {
  isAnalyzing: boolean;
  repCount: number;
  currentSet: number;
  landmarks: LandmarkSnapshot | null;
  alerts: FormIssue[];
  progress: number;
  sets: SetData[];
  currentSetReps: RepData[];

  startAnalysis: () => void;
  stopAnalysis: () => void;
  addRep: (formScore: number, issues: FormIssue[]) => void;
  addAlert: (alert: FormIssue) => void;
  updateLandmarks: (landmarks: LandmarkSnapshot) => void;
  updateProgress: (percent: number) => void;
  nextSet: () => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  isAnalyzing: false,
  repCount: 0,
  currentSet: 1,
  landmarks: null,
  alerts: [],
  progress: 0,
  sets: [],
  currentSetReps: [],

  startAnalysis: () => set({ isAnalyzing: true }),
  stopAnalysis: () => set({ isAnalyzing: false }),

  addRep: (formScore, issues) =>
    set((state) => {
      const rep: RepData = {
        repNumber: state.repCount + 1,
        formScore,
        tempo: 0,
        rom: 0,
        landmarks: state.landmarks ?? ({} as LandmarkSnapshot),
        issues,
      };
      return {
        repCount: state.repCount + 1,
        currentSetReps: [...state.currentSetReps, rep],
      };
    }),

  addAlert: (alert) =>
    set((state) => ({ alerts: [...state.alerts, alert] })),

  updateLandmarks: (landmarks) => set({ landmarks }),

  updateProgress: (percent) => set({ progress: percent }),

  nextSet: () =>
    set((state) => {
      const setData: SetData = {
        setNumber: state.currentSet,
        reps: state.currentSetReps,
        averageFormScore:
          state.currentSetReps.length > 0
            ? state.currentSetReps.reduce((s, r) => s + r.formScore, 0) /
              state.currentSetReps.length
            : 0,
        formBreakdownRep: null,
      };
      return {
        sets: [...state.sets, setData],
        currentSet: state.currentSet + 1,
        repCount: 0,
        currentSetReps: [],
        alerts: [],
      };
    }),

  reset: () =>
    set({
      isAnalyzing: false,
      repCount: 0,
      currentSet: 1,
      landmarks: null,
      alerts: [],
      progress: 0,
      sets: [],
      currentSetReps: [],
    }),
}));
```

- [ ] **Step 4: Implement session store**

Create `src/stores/session-store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CameraAngle, InputMode } from '../types/analysis';

interface SessionState {
  defaultAngle: CameraAngle;
  lastInputMode: InputMode;
  setDefaultAngle: (angle: CameraAngle) => void;
  setLastInputMode: (mode: InputMode) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      defaultAngle: 'back',
      lastInputMode: 'camera',
      setDefaultAngle: (angle) => set({ defaultAngle: angle }),
      setLastInputMode: (mode) => set({ lastInputMode: mode }),
    }),
    { name: 'pullup-check-settings' },
  ),
);
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
npx vitest run src/stores/analysis-store.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stores/
git commit -m "feat: add Zustand stores for analysis state and session settings"
```

---

## Task 8: Web Worker — MediaPipe Integration

**Files:**
- Create: `src/workers/pose-worker.ts`, `src/lib/worker-client.ts`
- Test: `src/lib/worker-client.test.ts`

- [ ] **Step 1: Write worker client tests**

Create `src/lib/worker-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoseWorkerClient } from './worker-client';
import type { WorkerOutMessage } from '../types/worker-messages';

// Mock Worker
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/worker-client.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement worker client**

Create `src/lib/worker-client.ts`:

```typescript
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
```

- [ ] **Step 4: Implement the Web Worker**

Create `src/workers/pose-worker.ts`:

```typescript
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { WorkerInMessage, WorkerOutMessage } from '../types/worker-messages';
import type { LandmarkSnapshot, CameraAngle, FormIssue } from '../types/analysis';
import { calculateAngle } from '../lib/analysis/angle-calculator';
import { RepCounter } from '../lib/analysis/rep-counter';
import { FormAnalyzer } from '../lib/analysis/form-analyzer';

let poseLandmarker: PoseLandmarker | null = null;
let repCounter: RepCounter | null = null;
let formAnalyzer: FormAnalyzer | null = null;

function post(msg: WorkerOutMessage): void {
  self.postMessage(msg);
}

function extractLandmarks(rawLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }>): LandmarkSnapshot {
  const lm = (index: number) => ({
    x: rawLandmarks[index].x,
    y: rawLandmarks[index].y,
    z: rawLandmarks[index].z,
    visibility: rawLandmarks[index].visibility ?? 0,
  });

  return {
    shoulderLeft: lm(11),
    shoulderRight: lm(12),
    elbowLeft: lm(13),
    elbowRight: lm(14),
    wristLeft: lm(15),
    wristRight: lm(16),
    hipLeft: lm(23),
    hipRight: lm(24),
    kneeLeft: lm(25),
    kneeRight: lm(26),
    nose: lm(0),
  };
}

async function initialize(angle: CameraAngle, modelPath: string): Promise<void> {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    repCounter = new RepCounter();
    formAnalyzer = new FormAnalyzer(angle);

    post({ type: 'ready' });
  } catch (error) {
    post({ type: 'error', message: `Init failed: ${error}` });
  }
}

function processFrame(imageData: ImageBitmap, timestamp: number): void {
  if (!poseLandmarker || !repCounter || !formAnalyzer) return;

  const result = poseLandmarker.detectForVideo(imageData, timestamp);

  if (!result.landmarks || result.landmarks.length === 0) return;

  const landmarks = extractLandmarks(result.landmarks[0]);
  post({ type: 'landmarks', data: landmarks, timestamp });

  // Calculate elbow angle (average of left and right)
  const leftAngle = calculateAngle(
    landmarks.shoulderLeft,
    landmarks.elbowLeft,
    landmarks.wristLeft,
  );
  const rightAngle = calculateAngle(
    landmarks.shoulderRight,
    landmarks.elbowRight,
    landmarks.wristRight,
  );
  const avgAngle = (leftAngle + rightAngle) / 2;

  // Check for rep completion
  const repCompleted = repCounter.update(avgAngle, timestamp);

  // Analyze form
  const issues = formAnalyzer.analyze(landmarks);

  // Send real-time alerts for high-severity issues
  for (const issue of issues) {
    if (issue.severity === 'high' || issue.severity === 'medium') {
      post({ type: 'form-alert', issue });
    }
  }

  if (repCompleted) {
    const formScore = formAnalyzer.computeFormScore(issues);
    post({
      type: 'rep',
      count: repCounter.count,
      formScore,
      details: issues,
    });
  }
}

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init':
      initialize(msg.config.angle, msg.config.modelPath);
      break;
    case 'frame':
      processFrame(msg.imageData, msg.timestamp);
      break;
    case 'start-set':
      repCounter?.reset();
      break;
    case 'end-set':
      // Set summary is computed on the main thread from stored reps
      break;
    case 'stop':
      poseLandmarker?.close();
      poseLandmarker = null;
      break;
  }
};
```

- [ ] **Step 5: Run worker client tests and verify they pass**

```bash
npx vitest run src/lib/worker-client.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/workers/ src/lib/worker-client.ts src/lib/worker-client.test.ts
git commit -m "feat: add Web Worker with MediaPipe Pose Landmarker integration"
```

---

## Task 9: Layout Shell & Navigation

**Files:**
- Create: `src/components/layout/Shell.tsx`, `src/components/layout/BottomNav.tsx`
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Create BottomNav component**

Create `src/components/layout/BottomNav.tsx`:

```tsx
import { Link, useRouterState } from '@tanstack/react-router';

const navItems = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/analyze', label: 'Analyze', icon: '◎' },
  { to: '/history', label: 'History', icon: '☰' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
] as const;

export function BottomNav() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${
                isActive ? 'text-blue-400' : 'text-zinc-500'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create Shell component**

Create `src/components/layout/Shell.tsx`:

```tsx
import { BottomNav } from './BottomNav';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      <main className="mx-auto max-w-lg px-4">{children}</main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Update root route to use Shell**

Replace `src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Shell } from '../components/layout/Shell';

export const Route = createRootRoute({
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
});
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Expected: Dark themed app with bottom navigation showing 4 tabs.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/routes/__root.tsx
git commit -m "feat: add app shell with bottom navigation"
```

---

## Task 10: Shared Components

**Files:**
- Create: `src/components/shared/AngleSelector.tsx`, `src/components/shared/ProgressBar.tsx`

- [ ] **Step 1: Create AngleSelector**

Create `src/components/shared/AngleSelector.tsx`:

```tsx
import type { CameraAngle } from '../../types/analysis';

interface AngleSelectorProps {
  value: CameraAngle;
  onChange: (angle: CameraAngle) => void;
}

const options: { value: CameraAngle; label: string; description: string }[] = [
  { value: 'front', label: 'Front', description: 'Left/right balance' },
  { value: 'back', label: 'Back', description: 'Left/right balance' },
  { value: 'side', label: 'Side', description: 'ROM & kipping' },
];

export function AngleSelector({ value, onChange }: AngleSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg p-3 text-center transition-all ${
            value === opt.value
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <div className="font-semibold text-sm">{opt.label}</div>
          <div className="text-xs mt-0.5 opacity-70">{opt.description}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ProgressBar**

Create `src/components/shared/ProgressBar.tsx`:

```tsx
interface ProgressBarProps {
  percent: number;
  label?: string;
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>{label}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      )}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/
git commit -m "feat: add AngleSelector and ProgressBar shared components"
```

---

## Task 11: Landing Page & Analyze Route

**Files:**
- Modify: `src/routes/index.tsx`
- Create: `src/routes/analyze/index.tsx`

- [ ] **Step 1: Build landing page**

Replace `src/routes/index.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Pull-Up Check</h1>
        <p className="text-zinc-400 mt-2">
          AI-powered pull-up form analysis
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          to="/analyze"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl text-center transition-colors"
        >
          Start Analysis
        </Link>
        <Link
          to="/history"
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-3 px-6 rounded-xl text-center transition-colors"
        >
          View History
        </Link>
      </div>

      <p className="text-xs text-zinc-600 max-w-xs">
        All processing happens on your device. No video data is uploaded or sent to any server.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Build analyze mode selection page**

Create `src/routes/analyze/index.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { AngleSelector } from '../../components/shared/AngleSelector';
import { useSessionStore } from '../../stores/session-store';
import type { CameraAngle } from '../../types/analysis';

export const Route = createFileRoute('/analyze/')({
  component: AnalyzePage,
});

function AnalyzePage() {
  const { defaultAngle } = useSessionStore();
  const [angle, setAngle] = useState<CameraAngle>(defaultAngle);

  return (
    <div className="py-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold">New Analysis</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Choose your filming angle and input method
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">
          Filming Angle
        </label>
        <AngleSelector value={angle} onChange={setAngle} />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">
          Input Method
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/analyze/camera"
            search={{ angle }}
            className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-2xl mb-1">📷</div>
            <div className="font-semibold text-sm">Real-time Camera</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Measure live
            </div>
          </Link>
          <Link
            to="/analyze/upload"
            search={{ angle }}
            className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-2xl mb-1">📁</div>
            <div className="font-semibold text-sm">Upload Video</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Analyze recorded
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Expected: Landing page with "Start Analysis" button → navigate to analyze page with angle selector and two input options.

- [ ] **Step 4: Commit**

```bash
git add src/routes/index.tsx src/routes/analyze/
git commit -m "feat: add landing page and analyze mode selection"
```

---

## Task 12: Camera Analysis Page

**Files:**
- Create: `src/routes/analyze/camera.tsx`, `src/components/camera/CameraView.tsx`, `src/components/camera/CameraControls.tsx`, `src/components/analysis/LandmarkOverlay.tsx`, `src/components/analysis/LiveStats.tsx`

- [ ] **Step 1: Create LandmarkOverlay**

Create `src/components/analysis/LandmarkOverlay.tsx`:

```tsx
import type { LandmarkSnapshot } from '../../types/analysis';

interface LandmarkOverlayProps {
  landmarks: LandmarkSnapshot | null;
  width: number;
  height: number;
}

const CONNECTIONS: [keyof LandmarkSnapshot, keyof LandmarkSnapshot][] = [
  ['shoulderLeft', 'elbowLeft'],
  ['elbowLeft', 'wristLeft'],
  ['shoulderRight', 'elbowRight'],
  ['elbowRight', 'wristRight'],
  ['shoulderLeft', 'shoulderRight'],
  ['shoulderLeft', 'hipLeft'],
  ['shoulderRight', 'hipRight'],
  ['hipLeft', 'hipRight'],
  ['hipLeft', 'kneeLeft'],
  ['hipRight', 'kneeRight'],
];

export function LandmarkOverlay({ landmarks, width, height }: LandmarkOverlayProps) {
  if (!landmarks) return null;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {CONNECTIONS.map(([from, to], i) => {
        const a = landmarks[from];
        const b = landmarks[to];
        if (a.visibility < 0.5 || b.visibility < 0.5) return null;
        return (
          <line
            key={i}
            x1={a.x * width}
            y1={a.y * height}
            x2={b.x * width}
            y2={b.y * height}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
      {Object.values(landmarks).map((point, i) => {
        if (point.visibility < 0.5) return null;
        return (
          <circle
            key={i}
            cx={point.x * width}
            cy={point.y * height}
            r={4}
            fill="#60a5fa"
          />
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Create LiveStats**

Create `src/components/analysis/LiveStats.tsx`:

```tsx
import type { FormIssue } from '../../types/analysis';

interface LiveStatsProps {
  repCount: number;
  currentSet: number;
  alerts: FormIssue[];
}

export function LiveStats({ repCount, currentSet, alerts }: LiveStatsProps) {
  const latestAlert = alerts.length > 0 ? alerts[alerts.length - 1] : null;

  return (
    <div className="flex items-center justify-between bg-zinc-900/80 backdrop-blur rounded-xl p-3">
      <div className="text-center">
        <div className="text-3xl font-bold tabular-nums">{repCount}</div>
        <div className="text-xs text-zinc-500">Reps</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-semibold text-zinc-300">Set {currentSet}</div>
      </div>
      {latestAlert && (
        <div
          className={`text-xs px-2 py-1 rounded-lg max-w-[140px] truncate ${
            latestAlert.severity === 'high'
              ? 'bg-red-900/50 text-red-300'
              : 'bg-yellow-900/50 text-yellow-300'
          }`}
        >
          {latestAlert.detail}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create CameraControls**

Create `src/components/camera/CameraControls.tsx`:

```tsx
interface CameraControlsProps {
  isAnalyzing: boolean;
  onStartStop: () => void;
  onNextSet: () => void;
  onFinish: () => void;
}

export function CameraControls({
  isAnalyzing,
  onStartStop,
  onNextSet,
  onFinish,
}: CameraControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onNextSet}
        disabled={!isAnalyzing}
        className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
      >
        Next Set
      </button>
      <button
        onClick={onStartStop}
        className={`w-16 h-16 rounded-full font-bold text-sm transition-all ${
          isAnalyzing
            ? 'bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-600/30'
            : 'bg-blue-600 hover:bg-blue-500 text-white ring-4 ring-blue-600/30'
        }`}
      >
        {isAnalyzing ? 'STOP' : 'START'}
      </button>
      <button
        onClick={onFinish}
        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
      >
        Finish
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create CameraView**

Create `src/components/camera/CameraView.tsx`:

```tsx
import { useRef, useEffect, useState, useCallback } from 'react';
import { LandmarkOverlay } from '../analysis/LandmarkOverlay';
import type { LandmarkSnapshot } from '../../types/analysis';

interface CameraViewProps {
  onFrame: (imageBitmap: ImageBitmap, timestamp: number) => void;
  isActive: boolean;
  landmarks: LandmarkSnapshot | null;
}

export function CameraView({ onFrame, isActive, landmarks }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isActive || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    createImageBitmap(video).then((bitmap) => {
      onFrame(bitmap, performance.now());
    });

    animationRef.current = requestAnimationFrame(processFrame);
  }, [isActive, onFrame]);

  useEffect(() => {
    if (isActive) {
      animationRef.current = requestAnimationFrame(processFrame);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isActive, processFrame]);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDimensions({ width: v.videoWidth, height: v.videoHeight });
        }}
        className="w-full"
      />
      <LandmarkOverlay
        landmarks={landmarks}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}
```

- [ ] **Step 5: Create camera analysis route**

Create `src/routes/analyze/camera.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef } from 'react';
import { CameraView } from '../../components/camera/CameraView';
import { CameraControls } from '../../components/camera/CameraControls';
import { LiveStats } from '../../components/analysis/LiveStats';
import { useAnalysisStore } from '../../stores/analysis-store';
import { PoseWorkerClient } from '../../lib/worker-client';
import type { CameraAngle } from '../../types/analysis';

type SearchParams = { angle: CameraAngle };

export const Route = createFileRoute('/analyze/camera')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    angle: (search.angle as CameraAngle) || 'back',
  }),
  component: CameraAnalysisPage,
});

function CameraAnalysisPage() {
  const { angle } = Route.useSearch();
  const navigate = useNavigate();
  const workerRef = useRef<PoseWorkerClient | null>(null);

  const {
    isAnalyzing,
    repCount,
    currentSet,
    landmarks,
    alerts,
    startAnalysis,
    stopAnalysis,
    addRep,
    addAlert,
    updateLandmarks,
    nextSet,
    sets,
    reset,
  } = useAnalysisStore();

  const handleStartStop = useCallback(() => {
    if (isAnalyzing) {
      // Stop
      workerRef.current?.stop();
      workerRef.current = null;
      stopAnalysis();
    } else {
      // Start
      const worker = new Worker(
        new URL('../../workers/pose-worker.ts', import.meta.url),
        { type: 'module' },
      );
      const client = new PoseWorkerClient(worker);

      client.onReady = () => startAnalysis();
      client.onLandmarks = (data) => updateLandmarks(data);
      client.onRep = (count, formScore, details) => addRep(formScore, details);
      client.onFormAlert = (issue) => addAlert(issue);

      client.init({
        angle,
        modelPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      });

      workerRef.current = client;
    }
  }, [isAnalyzing, angle, startAnalysis, stopAnalysis, addRep, addAlert, updateLandmarks]);

  const handleFrame = useCallback(
    (bitmap: ImageBitmap, timestamp: number) => {
      workerRef.current?.sendFrame(bitmap, timestamp);
    },
    [],
  );

  const handleNextSet = useCallback(() => {
    nextSet();
    workerRef.current?.startSet();
  }, [nextSet]);

  const handleFinish = useCallback(async () => {
    // Finalize current set if reps exist
    if (repCount > 0) {
      nextSet();
    }
    workerRef.current?.stop();
    workerRef.current = null;

    const sessionId = crypto.randomUUID();
    const { saveSession } = await import('../../lib/db/sessions');
    const allSets = useAnalysisStore.getState().sets;

    await saveSession({
      id: sessionId,
      date: new Date(),
      angle,
      inputMode: 'camera',
      sets: allSets,
      overallScore:
        allSets.length > 0
          ? allSets.reduce((s, set) => s + set.averageFormScore, 0) / allSets.length
          : 0,
      balanceScore: 0,
      totalReps: allSets.reduce((s, set) => s + set.reps.length, 0),
      duration: 0,
    });

    reset();
    navigate({ to: '/result/$id', params: { id: sessionId } });
  }, [angle, repCount, nextSet, reset, navigate]);

  return (
    <div className="py-4 space-y-4">
      <CameraView
        onFrame={handleFrame}
        isActive={isAnalyzing}
        landmarks={landmarks}
      />
      <LiveStats
        repCount={repCount}
        currentSet={currentSet}
        alerts={alerts}
      />
      <CameraControls
        isAnalyzing={isAnalyzing}
        onStartStop={handleStartStop}
        onNextSet={handleNextSet}
        onFinish={handleFinish}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verify camera page in browser**

```bash
npm run dev
```

Expected: Navigate to Analyze → Camera. Camera permission prompt appears, video stream displays, START/STOP button works.

- [ ] **Step 7: Commit**

```bash
git add src/routes/analyze/camera.tsx src/components/camera/ src/components/analysis/
git commit -m "feat: add real-time camera analysis page with landmark overlay"
```

---

## Task 13: Upload Analysis Page

**Files:**
- Create: `src/routes/analyze/upload.tsx`, `src/components/upload/VideoDropzone.tsx`

- [ ] **Step 1: Create VideoDropzone**

Create `src/components/upload/VideoDropzone.tsx`:

```tsx
import { useCallback, useState } from 'react';

interface VideoDropzoneProps {
  onFileSelected: (file: File) => void;
}

export function VideoDropzone({ onFileSelected }: VideoDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('video/')) {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
        isDragOver
          ? 'border-blue-400 bg-blue-900/20'
          : 'border-zinc-700 hover:border-zinc-500'
      }`}
    >
      <div className="text-3xl mb-2">📁</div>
      <p className="text-sm text-zinc-300">Drag & drop video or tap to select</p>
      <p className="text-xs text-zinc-500 mt-1">MP4, MOV, WebM</p>
      <input
        type="file"
        accept="video/*"
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}
```

- [ ] **Step 2: Create upload analysis route**

Create `src/routes/analyze/upload.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useRef, useCallback } from 'react';
import { VideoDropzone } from '../../components/upload/VideoDropzone';
import { ProgressBar } from '../../components/shared/ProgressBar';
import { LandmarkOverlay } from '../../components/analysis/LandmarkOverlay';
import { useAnalysisStore } from '../../stores/analysis-store';
import { PoseWorkerClient } from '../../lib/worker-client';
import type { CameraAngle } from '../../types/analysis';

type SearchParams = { angle: CameraAngle };

export const Route = createFileRoute('/analyze/upload')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    angle: (search.angle as CameraAngle) || 'back',
  }),
  component: UploadAnalysisPage,
});

function UploadAnalysisPage() {
  const { angle } = Route.useSearch();
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { landmarks, progress, updateLandmarks, updateProgress, addRep, reset } =
    useAnalysisStore();

  const handleFileSelected = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  }, []);

  const handleAnalyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setAnalyzing(true);
    const worker = new Worker(
      new URL('../../workers/pose-worker.ts', import.meta.url),
      { type: 'module' },
    );
    const client = new PoseWorkerClient(worker);

    client.onLandmarks = (data) => updateLandmarks(data);
    client.onRep = (count, formScore, details) => addRep(formScore, details);
    client.onProgress = (p) => updateProgress(p);

    await new Promise<void>((resolve) => {
      client.onReady = resolve;
      client.init({
        angle,
        modelPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      });
    });

    // Process video frame by frame
    const duration = video.duration;
    const fps = 15;
    const frameInterval = 1000 / fps;
    let currentTime = 0;

    while (currentTime < duration) {
      video.currentTime = currentTime;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      const bitmap = await createImageBitmap(video);
      client.sendFrame(bitmap, currentTime * 1000);
      updateProgress((currentTime / duration) * 100);
      currentTime += frameInterval / 1000;
    }

    updateProgress(100);
    client.stop();

    // Save session
    const sessionId = crypto.randomUUID();
    const { saveSession } = await import('../../lib/db/sessions');
    const store = useAnalysisStore.getState();

    // Wrap all reps into a single set for uploaded video
    const setData = {
      setNumber: 1,
      reps: store.currentSetReps,
      averageFormScore:
        store.currentSetReps.length > 0
          ? store.currentSetReps.reduce((s, r) => s + r.formScore, 0) /
            store.currentSetReps.length
          : 0,
      formBreakdownRep: null,
    };

    await saveSession({
      id: sessionId,
      date: new Date(),
      angle,
      inputMode: 'upload',
      sets: [setData],
      overallScore: setData.averageFormScore,
      balanceScore: 0,
      totalReps: store.currentSetReps.length,
      duration: Math.round(duration),
    });

    reset();
    navigate({ to: '/result/$id', params: { id: sessionId } });
  }, [angle, updateLandmarks, addRep, updateProgress, reset, navigate]);

  return (
    <div className="py-4 space-y-4">
      {!videoUrl ? (
        <VideoDropzone onFileSelected={handleFileSelected} />
      ) : (
        <>
          <div className="relative bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              muted
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setDimensions({ width: v.videoWidth, height: v.videoHeight });
              }}
              className="w-full"
            />
            <LandmarkOverlay
              landmarks={landmarks}
              width={dimensions.width}
              height={dimensions.height}
            />
          </div>

          {analyzing ? (
            <ProgressBar percent={progress} label="Analyzing video..." />
          ) : (
            <button
              onClick={handleAnalyze}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Start Analysis
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Expected: Analyze → Upload shows drag & drop area. After selecting a video file, shows preview with "Start Analysis" button.

- [ ] **Step 4: Commit**

```bash
git add src/routes/analyze/upload.tsx src/components/upload/
git commit -m "feat: add video upload analysis page with frame-by-frame processing"
```

---

## Task 14: Report Dashboard

**Files:**
- Create: `src/routes/result/$id.tsx`, `src/components/report/ScoreCard.tsx`, `src/components/report/SetChart.tsx`, `src/components/report/BodyDiagram.tsx`, `src/components/report/FeedbackList.tsx`, `src/components/report/ReportExport.tsx`

- [ ] **Step 1: Create ScoreCard**

Create `src/components/report/ScoreCard.tsx`:

```tsx
interface ScoreCardProps {
  label: string;
  score: number;
  color?: string;
}

export function ScoreCard({ label, score, color = '#3b82f6' }: ScoreCardProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 bg-zinc-900 rounded-xl p-4">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r={radius}
          fill="none" stroke="#27272a" strokeWidth="8"
        />
        <circle
          cx="50" cy="50" r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-700"
        />
        <text
          x="50" y="50"
          textAnchor="middle" dominantBaseline="central"
          fill="white" fontSize="20" fontWeight="bold"
        >
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-xs text-zinc-400">{label}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create SetChart with D3**

Create `src/components/report/SetChart.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { SetData } from '../../types/analysis';

interface SetChartProps {
  sets: SetData[];
}

export function SetChart({ sets }: SetChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || sets.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 360 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(sets.map((_, i) => `Set ${i + 1}`))
      .range([0, width])
      .padding(0.3);

    const maxReps = d3.max(sets, (s) => s.reps.length) ?? 10;
    const y = d3.scaleLinear().domain([0, maxReps]).range([height, 0]);

    // Bars for rep count
    g.selectAll('.bar')
      .data(sets)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (_, i) => x(`Set ${i + 1}`)!)
      .attr('y', (d) => y(d.reps.length))
      .attr('width', x.bandwidth())
      .attr('height', (d) => height - y(d.reps.length))
      .attr('fill', '#3b82f6')
      .attr('rx', 4);

    // Form score line
    const lineY = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    const line = d3
      .line<SetData>()
      .x((_, i) => x(`Set ${i + 1}`)! + x.bandwidth() / 2)
      .y((d) => lineY(d.averageFormScore))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(sets)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Dots on line
    g.selectAll('.dot')
      .data(sets)
      .join('circle')
      .attr('cx', (_, i) => x(`Set ${i + 1}`)! + x.bandwidth() / 2)
      .attr('cy', (d) => lineY(d.averageFormScore))
      .attr('r', 4)
      .attr('fill', '#f59e0b');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('fill', '#a1a1aa')
      .style('font-size', '11px');

    // Y axis (reps)
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('fill', '#a1a1aa')
      .style('font-size', '11px');

    // Style axis lines
    svg.selectAll('.domain, .tick line').attr('stroke', '#3f3f46');
  }, [sets]);

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-2">
        Set-by-Set Analysis
      </h3>
      <div className="flex gap-4 text-xs text-zinc-500 mb-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-500 rounded-sm inline-block" /> Reps
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-amber-500 rounded-full inline-block" /> Form Score
        </span>
      </div>
      <svg ref={svgRef} width="360" height="200" className="w-full" />
    </div>
  );
}
```

- [ ] **Step 3: Create BodyDiagram**

Create `src/components/report/BodyDiagram.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { SetData } from '../../types/analysis';

interface BodyDiagramProps {
  sets: SetData[];
}

interface BodyPart {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  side: 'left' | 'right';
}

const bodyParts: BodyPart[] = [
  { id: 'shoulder-l', label: 'L Shoulder', x: 55, y: 60, width: 30, height: 20, side: 'left' },
  { id: 'shoulder-r', label: 'R Shoulder', x: 115, y: 60, width: 30, height: 20, side: 'right' },
  { id: 'arm-l', label: 'L Arm', x: 40, y: 85, width: 20, height: 50, side: 'left' },
  { id: 'arm-r', label: 'R Arm', x: 140, y: 85, width: 20, height: 50, side: 'right' },
  { id: 'back-l', label: 'L Back', x: 70, y: 85, width: 30, height: 50, side: 'left' },
  { id: 'back-r', label: 'R Back', x: 100, y: 85, width: 30, height: 50, side: 'right' },
];

export function BodyDiagram({ sets }: BodyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Collect all asymmetry issues
    const allIssues = sets.flatMap((s) => s.reps.flatMap((r) => r.issues));
    const asymmetryIssues = allIssues.filter((i) => i.type === 'asymmetry');

    // Calculate average asymmetry per body part
    const shoulderAsym =
      asymmetryIssues
        .filter((i) => i.detail.includes('shoulder'))
        .reduce((sum, i) => sum + Math.abs(i.values.shoulderAsymmetry ?? 0), 0) /
        Math.max(1, asymmetryIssues.filter((i) => i.detail.includes('shoulder')).length);

    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 5, 15])
      .range(['#22c55e', '#eab308', '#ef4444'])
      .clamp(true);

    // Body outline
    svg
      .append('ellipse')
      .attr('cx', 100)
      .attr('cy', 30)
      .attr('rx', 18)
      .attr('ry', 22)
      .attr('fill', '#3f3f46')
      .attr('stroke', '#52525b');

    // Torso
    svg
      .append('rect')
      .attr('x', 65)
      .attr('y', 55)
      .attr('width', 70)
      .attr('height', 85)
      .attr('rx', 8)
      .attr('fill', '#3f3f46')
      .attr('stroke', '#52525b');

    // Body parts with color coding
    bodyParts.forEach((part) => {
      const asym = part.label.toLowerCase().includes('shoulder') ? shoulderAsym : 0;
      svg
        .append('rect')
        .attr('x', part.x)
        .attr('y', part.y)
        .attr('width', part.width)
        .attr('height', part.height)
        .attr('rx', 4)
        .attr('fill', colorScale(asym))
        .attr('opacity', 0.6);
    });

    // Legend
    const legend = svg.append('g').attr('transform', 'translate(10, 165)');
    const legendData = [
      { color: '#22c55e', label: 'Good' },
      { color: '#eab308', label: 'Caution' },
      { color: '#ef4444', label: 'Imbalanced' },
    ];
    legendData.forEach((d, i) => {
      legend
        .append('rect')
        .attr('x', i * 65)
        .attr('y', 0)
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', d.color);
      legend
        .append('text')
        .attr('x', i * 65 + 14)
        .attr('y', 9)
        .attr('fill', '#a1a1aa')
        .attr('font-size', '10px')
        .text(d.label);
    });
  }, [sets]);

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-2">Body Balance</h3>
      <svg ref={svgRef} viewBox="0 0 200 185" className="w-full max-w-[200px] mx-auto" />
    </div>
  );
}
```

- [ ] **Step 4: Create FeedbackList**

Create `src/components/report/FeedbackList.tsx`:

```tsx
import type { SetData } from '../../types/analysis';

interface FeedbackListProps {
  sets: SetData[];
}

interface Feedback {
  text: string;
  severity: 'low' | 'medium' | 'high' | 'info';
}

function generateFeedback(sets: SetData[]): Feedback[] {
  const feedback: Feedback[] = [];

  if (sets.length === 0) return feedback;

  // Rep count trend across sets
  if (sets.length >= 2) {
    const first = sets[0].reps.length;
    const last = sets[sets.length - 1].reps.length;
    if (first > last) {
      const avgDrop = (first - last) / (sets.length - 1);
      feedback.push({
        text: `Average rep count decreased by ${avgDrop.toFixed(1)} reps per set`,
        severity: 'info',
      });
    }
  }

  // Form breakdown per set
  sets.forEach((set) => {
    const scores = set.reps.map((r) => r.formScore);
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] < 60 && scores[i - 1] >= 60) {
        feedback.push({
          text: `Set ${set.setNumber}: Form started breaking from rep ${i + 1}`,
          severity: 'medium',
        });
        break;
      }
    }
  });

  // Aggregate asymmetry feedback
  const allIssues = sets.flatMap((s) => s.reps.flatMap((r) => r.issues));
  const shoulderIssues = allIssues.filter(
    (i) => i.type === 'asymmetry' && i.detail.includes('shoulder'),
  );
  if (shoulderIssues.length > 0) {
    const avgAsym =
      shoulderIssues.reduce(
        (sum, i) => sum + Math.abs(i.values.shoulderAsymmetry ?? 0),
        0,
      ) / shoulderIssues.length;
    const side = shoulderIssues[0].detail.includes('left') ? 'Left' : 'Right';
    feedback.push({
      text: `${side} shoulder was ${avgAsym.toFixed(1)}% lower on average`,
      severity: avgAsym > 10 ? 'high' : 'medium',
    });
  }

  return feedback;
}

const severityStyles = {
  info: 'bg-blue-900/30 border-blue-800 text-blue-300',
  low: 'bg-green-900/30 border-green-800 text-green-300',
  medium: 'bg-yellow-900/30 border-yellow-800 text-yellow-300',
  high: 'bg-red-900/30 border-red-800 text-red-300',
};

export function FeedbackList({ sets }: FeedbackListProps) {
  const feedback = generateFeedback(sets);

  if (feedback.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl p-4 text-center text-zinc-500 text-sm">
        Great form! No issues detected.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-zinc-300">Improvement Feedback</h3>
      {feedback.map((fb, i) => (
        <div
          key={i}
          className={`border rounded-lg px-3 py-2 text-sm ${severityStyles[fb.severity]}`}
        >
          {fb.text}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create ReportExport**

Create `src/components/report/ReportExport.tsx`:

```tsx
import { useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';

interface ReportExportProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
}

export function ReportExport({ targetRef }: ReportExportProps) {
  const handleSaveImage = useCallback(async () => {
    if (!targetRef.current) return;

    const canvas = await html2canvas(targetRef.current, {
      backgroundColor: '#09090b',
      scale: 2,
    });

    const link = document.createElement('a');
    link.download = `pullup-check-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [targetRef]);

  const handleShare = useCallback(async () => {
    if (!targetRef.current || !navigator.share) return;

    const canvas = await html2canvas(targetRef.current, {
      backgroundColor: '#09090b',
      scale: 2,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'pullup-check.png', { type: 'image/png' });
      await navigator.share({ files: [file] });
    });
  }, [targetRef]);

  return (
    <div className="flex gap-2">
      <button
        onClick={handleSaveImage}
        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        Save Image
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleShare}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          Share
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create result route**

Create `src/routes/result/$id.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { getSession } from '../../lib/db/sessions';
import { ScoreCard } from '../../components/report/ScoreCard';
import { SetChart } from '../../components/report/SetChart';
import { BodyDiagram } from '../../components/report/BodyDiagram';
import { FeedbackList } from '../../components/report/FeedbackList';
import { ReportExport } from '../../components/report/ReportExport';
import type { Session } from '../../types/analysis';

export const Route = createFileRoute('/result/$id')({
  component: ResultPage,
});

function ResultPage() {
  const { id } = Route.useParams();
  const [session, setSession] = useState<Session | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSession(id).then((s) => setSession(s ?? null));
  }, [id]);

  if (!session) {
    return (
      <div className="py-8 text-center text-zinc-500">Loading...</div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Analysis Report</h2>
        <p className="text-xs text-zinc-500">
          {session.date.toLocaleDateString()} · {session.angle} view ·{' '}
          {session.totalReps} total reps
        </p>
      </div>

      <div ref={reportRef} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard label="Overall Score" score={session.overallScore} />
          <ScoreCard
            label="Balance Score"
            score={session.balanceScore}
            color="#10b981"
          />
        </div>

        <SetChart sets={session.sets} />

        {(session.angle === 'front' || session.angle === 'back') && (
          <BodyDiagram sets={session.sets} />
        )}

        <FeedbackList sets={session.sets} />
      </div>

      <ReportExport targetRef={reportRef} />
    </div>
  );
}
```

- [ ] **Step 7: Verify in browser**

```bash
npm run dev
```

Expected: After completing an analysis (camera or upload), automatically navigates to `/result/:id` showing scores, charts, body diagram, feedback, and export buttons.

- [ ] **Step 8: Commit**

```bash
git add src/routes/result/ src/components/report/
git commit -m "feat: add analysis report dashboard with D3 charts and body diagram"
```

---

## Task 15: History Page

**Files:**
- Create: `src/routes/history/index.tsx`

- [ ] **Step 1: Create history page**

Create `src/routes/history/index.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { getAllSessions, deleteSession } from '../../lib/db/sessions';
import type { Session } from '../../types/analysis';

export const Route = createFileRoute('/history/')({
  component: HistoryPage,
});

function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    getAllSessions().then(setSessions);
  }, []);

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  if (sessions.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-zinc-500">No sessions yet</p>
        <Link
          to="/analyze"
          className="text-blue-400 text-sm mt-2 inline-block"
        >
          Start your first analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-3">
      <h2 className="text-xl font-bold">History</h2>
      {sessions.map((session) => (
        <Link
          key={session.id}
          to="/result/$id"
          params={{ id: session.id }}
          className="block bg-zinc-900 hover:bg-zinc-800 rounded-xl p-4 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-sm">
                {session.totalReps} reps · {session.sets.length} sets
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {new Date(session.date).toLocaleDateString()} ·{' '}
                {session.angle} view · {session.inputMode}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg font-bold text-blue-400">
                  {Math.round(session.overallScore)}
                </div>
                <div className="text-xs text-zinc-500">score</div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(session.id);
                }}
                className="text-zinc-600 hover:text-red-400 text-sm transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Expected: History tab shows list of past sessions, tapping navigates to result. Delete button removes sessions.

- [ ] **Step 3: Commit**

```bash
git add src/routes/history/
git commit -m "feat: add session history page with delete support"
```

---

## Task 16: Settings Page

**Files:**
- Create: `src/routes/settings/index.tsx`

- [ ] **Step 1: Create settings page**

Create `src/routes/settings/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { AngleSelector } from '../../components/shared/AngleSelector';
import { useSessionStore } from '../../stores/session-store';

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
});

function SettingsPage() {
  const { defaultAngle, setDefaultAngle } = useSessionStore();

  return (
    <div className="py-4 space-y-6">
      <h2 className="text-xl font-bold">Settings</h2>

      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">
          Default Filming Angle
        </label>
        <AngleSelector value={defaultAngle} onChange={setDefaultAngle} />
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-600">
          Pull-Up Check v1.0.0 · All processing on-device · No data uploaded
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Expected: Settings tab shows angle selector, changes persist on reload (Zustand persist).

- [ ] **Step 3: Commit**

```bash
git add src/routes/settings/
git commit -m "feat: add settings page with default angle preference"
```

---

## Task 17: PWA Setup

**Files:**
- Create: `public/manifest.json`, `public/sw.js`, `public/icons/` (placeholder)
- Modify: `index.html`, `src/main.tsx`

- [ ] **Step 1: Create Web App Manifest**

Create `public/manifest.json`:

```json
{
  "name": "Pull-Up Check",
  "short_name": "PullUpCheck",
  "description": "AI-powered pull-up form analysis",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Create Service Worker**

Create `public/sw.js`:

```javascript
const CACHE_NAME = 'pullup-check-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Cache MediaPipe WASM and model files aggressively
  if (
    event.request.url.includes('mediapipe') ||
    event.request.url.includes('.wasm') ||
    event.request.url.includes('.task')
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          }),
      ),
    );
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
```

- [ ] **Step 3: Register Service Worker and add manifest link**

Add to `index.html` inside `<head>`:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#3b82f6" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

Add to `src/main.tsx` after `createRoot`:

```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

- [ ] **Step 4: Create placeholder icons**

Create placeholder icon files (192x192 and 512x512 PNG). These will be replaced with real icons later:

```bash
# Create simple placeholder icons using a canvas-based approach
# For now, create empty files that will be replaced
touch public/icon-192.png public/icon-512.png
```

- [ ] **Step 5: Verify PWA in browser**

```bash
npm run build && npm run preview
```

Open Chrome DevTools → Application → Manifest should show the manifest. Service Workers tab should show the registered worker.

- [ ] **Step 6: Commit**

```bash
git add public/ index.html src/main.tsx
git commit -m "feat: add PWA support with service worker and model caching"
```

---

## Task 18: Build Verification & Final Polish

**Files:**
- Modify: Various files for build-time issues

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: No TypeScript errors, successful build output in `dist/`.

- [ ] **Step 3: Test production build**

```bash
npm run preview
```

Walk through the full flow: Home → Analyze → Camera/Upload → Result → History → Settings.

- [ ] **Step 4: Add .gitignore entry for superpowers**

Verify `.gitignore` contains:

```
.superpowers
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify build and finalize project setup"
```

---

## Summary

| Task | Description | Key Files |
|---|---|---|
| 1 | Project scaffolding | vite.config.ts, package.json, tsconfig.json |
| 2 | Type definitions | types/analysis.ts, types/worker-messages.ts |
| 3 | Angle calculator | lib/analysis/angle-calculator.ts |
| 4 | Rep counter | lib/analysis/rep-counter.ts |
| 5 | Form analyzer + rule sets | lib/analysis/form-analyzer.ts, rule-sets/* |
| 6 | Database layer | lib/db/index.ts, lib/db/sessions.ts |
| 7 | Zustand stores | stores/analysis-store.ts, stores/session-store.ts |
| 8 | Web Worker + MediaPipe | workers/pose-worker.ts, lib/worker-client.ts |
| 9 | Layout shell + navigation | components/layout/* |
| 10 | Shared components | components/shared/* |
| 11 | Landing + analyze route | routes/index.tsx, routes/analyze/index.tsx |
| 12 | Camera analysis page | routes/analyze/camera.tsx, components/camera/* |
| 13 | Upload analysis page | routes/analyze/upload.tsx, components/upload/* |
| 14 | Report dashboard | routes/result/$id.tsx, components/report/* |
| 15 | History page | routes/history/index.tsx |
| 16 | Settings page | routes/settings/index.tsx |
| 17 | PWA setup | public/manifest.json, public/sw.js |
| 18 | Build verification | Final test + build check |
