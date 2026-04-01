# Pull-Up Check — Design Spec

Client-side pull-up form analysis service using MediaPipe Pose Landmarker. Analyzes pull-up videos (real-time camera or file upload) to count reps, detect form breakdown, and generate visual reports with balance scores and improvement feedback.

## Goals

- Provide rep counting, form analysis, and left/right balance scoring for pull-ups
- Support both real-time camera capture and video file upload
- Run entirely client-side (no backend, no data leaves the device)
- Deploy as PWA + TWA (Play Store) with near-zero operational cost
- Extensible to other exercises (e.g., running form analysis) in the future

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | TanStack Router |
| State Management | Zustand |
| Pose Estimation | @mediapipe/tasks-vision (Pose Landmarker, WASM) |
| Processing | Web Worker + OffscreenCanvas |
| Visualization | D3.js |
| Data Persistence | Dexie.js (IndexedDB wrapper) |
| Image Export | html2canvas + Web Share API |
| Deployment | Cloudflare Pages (web), TWA via Bubblewrap (Play Store) |
| Offline | PWA with Service Worker (model file caching) |

## Architecture

### Two-Thread Model

**Main Thread (UI):** React app handles all user interaction — camera feed display, navigation, dashboard rendering, settings. Never blocked by analysis work.

**Web Worker (Analysis):** MediaPipe Pose Landmarker runs in a dedicated Web Worker with OffscreenCanvas. Receives video frames from the main thread, returns analysis results and progress updates via `postMessage`.

```
Main Thread                          Web Worker
-----------                          ----------
Camera/Video → transferFrame() →     MediaPipe WASM
                                     Pose Landmarker (33 landmarks)
                                     ↓
UI Updates   ← postMessage()    ←   Analysis Engine
(landmarks,                          - Joint angle calculation
 rep count,                          - Rep counting (state machine)
 form score,                         - Form breakdown detection
 progress %)                         - L/R asymmetry measurement
                                     - ROM tracking
                                     - Rep tempo analysis
```

### Worker Communication Protocol

Messages from Main → Worker:
- `{ type: 'init', config: { angle, model } }` — Initialize MediaPipe with settings
- `{ type: 'frame', imageData, timestamp }` — Send video frame for analysis
- `{ type: 'start-set' }` — Begin a new set
- `{ type: 'end-set' }` — End current set
- `{ type: 'stop' }` — Stop analysis session

Messages from Worker → Main:
- `{ type: 'ready' }` — MediaPipe initialized
- `{ type: 'landmarks', data, timestamp }` — Raw landmark data per frame
- `{ type: 'rep', count, formScore, details }` — Rep completed with analysis
- `{ type: 'form-alert', issue, severity }` — Real-time form warning
- `{ type: 'progress', percent }` — File upload analysis progress
- `{ type: 'set-summary', stats }` — Set completed with summary
- `{ type: 'error', message }` — Error occurred

## Camera Angle System

Users select their filming angle before analysis. Each angle activates a different rule set:

### Front/Back View (정면/후면)
- Left/right shoulder height asymmetry (%)
- Left/right elbow height difference (%)
- Lateral body sway (hip landmark X-axis displacement)
- Grip width estimation
- Overall balance score

### Side View (측면)
- Range of Motion — chin-to-bar clearance, arm full extension
- Kipping detection — hip/knee angle sudden changes
- Body swing magnitude
- Chin position tracking relative to wrist height (bar proxy)

### Shared (all angles)
- Rep counting via elbow angle state machine (extended → flexed → extended = 1 rep)
- Rep tempo (time per rep)
- Form consistency score (variance between reps)
- Set-over-set degradation tracking

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — start analysis or view history |
| `/analyze` | Choose input mode (camera or upload) and filming angle |
| `/analyze/camera` | Real-time camera mode with start/stop measurement |
| `/analyze/upload` | Video file upload with progress-based analysis |
| `/result/:id` | Analysis report — body diagram, charts, feedback |
| `/history` | Exercise history list with session comparison |
| `/history/:id` | Redirect to `/result/:id` |
| `/settings` | Default filming angle, notification preferences |

## Report Contents

### 1. Set-by-Set Analysis
- Rep count per set
- Average form score per set
- Visualization of form degradation across sets (D3 line chart)
- "Form started breaking down from rep N" feedback per set

### 2. Body Balance Diagram
- D3-rendered human body outline (인체도)
- Color-coded left/right regions showing asymmetry percentages
- Highlighted problem areas (shoulders, arms, back)
- Overall balance score (0-100)

### 3. Improvement Feedback
- Specific textual feedback per detected issue
  - Example: "Left shoulder was 10% lower than right during pull-ups"
  - Example: "Average rep count decreased by N reps per set"
  - Example: "Form started breaking significantly from rep 7 in set 3"
- Rep tempo analysis — fatigue signal when slowing down
- ROM tracking — if range decreases as reps progress

### 4. Additional Metrics
- Form consistency score — lower variance = better form
- Range of Motion per rep (for side view)
- Historical comparison with previous sessions (when history exists)

### 5. Export
- Dashboard screenshot as image (html2canvas)
- Share via Web Share API (mobile native share sheet)

## Data Model (IndexedDB via Dexie.js)

```typescript
interface Session {
  id: string;              // UUID
  date: Date;
  angle: 'front' | 'back' | 'side';
  inputMode: 'camera' | 'upload';
  sets: SetData[];
  overallScore: number;
  balanceScore: number;
  totalReps: number;
  duration: number;        // seconds
}

interface SetData {
  setNumber: number;
  reps: RepData[];
  averageFormScore: number;
  formBreakdownRep: number | null;  // rep where form started breaking
}

interface RepData {
  repNumber: number;
  formScore: number;
  tempo: number;           // milliseconds
  rom: number;             // range of motion percentage
  landmarks: LandmarkSnapshot;
  issues: FormIssue[];
}

interface FormIssue {
  type: 'asymmetry' | 'kipping' | 'incomplete_rom' | 'body_swing';
  severity: 'low' | 'medium' | 'high';
  detail: string;          // human-readable description
  values: Record<string, number>;  // measured values
}

interface LandmarkSnapshot {
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
  nose: Point3D;            // chin/head position proxy
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility: number;       // 0-1 confidence
}
```

## Project Structure

```
src/
  main.tsx                  # Entry point
  App.tsx                   # Root component with router
  routes/                   # TanStack Router file-based routes
    __root.tsx
    index.tsx               # /
    analyze/
      index.tsx             # /analyze
      camera.tsx            # /analyze/camera
      upload.tsx            # /analyze/upload
    result/
      $id.tsx               # /result/:id
    history/
      index.tsx             # /history
    settings/
      index.tsx             # /settings
  components/
    layout/                 # Shell, nav, common layout
    camera/                 # Camera input components
    upload/                 # File upload components
    analysis/               # Real-time overlay, landmarks display
    report/                 # Dashboard, charts, body diagram
    shared/                 # Buttons, cards, common UI
  workers/
    pose-worker.ts          # Web Worker entry — MediaPipe + analysis
  lib/
    analysis/
      angle-calculator.ts   # Joint angle math utilities
      rep-counter.ts        # State machine for rep counting
      form-analyzer.ts      # Form breakdown detection rules
      rule-sets/
        front-back.ts       # Front/back view specific rules
        side.ts             # Side view specific rules
        shared.ts           # Shared analysis rules
    db/
      index.ts              # Dexie.js database setup
      sessions.ts           # Session CRUD operations
    export/
      image.ts              # html2canvas + share API
  stores/
    analysis-store.ts       # Zustand — current analysis state
    session-store.ts        # Zustand — session/settings state
  types/
    analysis.ts             # TypeScript types for analysis data
    worker-messages.ts      # Worker message type definitions
```

## Deployment

### Web (Primary)
- Cloudflare Pages — unlimited bandwidth, free, global CDN
- Custom domain optional (~$15/year)
- Service Worker caches MediaPipe WASM + model files after first load

### Android (Play Store)
- TWA via Bubblewrap — $25 one-time developer account fee
- Requires: HTTPS, Web App Manifest, Service Worker, Digital Asset Links
- No ongoing fees for free app

### iOS (Future)
- Capacitor wrapping if iOS deployment needed ($99/year Apple Developer)

## Cost Summary

| Item | Cost |
|---|---|
| Hosting (Cloudflare Pages) | $0/month |
| Domain (optional) | $0-15/year |
| MediaPipe | $0 (Apache 2.0, client-side) |
| Play Store account | $25 one-time |
| Backend | $0 (none needed) |
| **Total monthly** | **$0 - $1.25** |

## Future Extension

Running form analysis reuses the same architecture:
- Same MediaPipe Pose Landmarker model (no additional WASM)
- New rule set in `lib/analysis/rule-sets/` for running-specific metrics (knee angle, stride, trunk lean, landing pattern)
- New route `/analyze/running/` with running-specific UI
- Incremental addition — no architectural changes needed
