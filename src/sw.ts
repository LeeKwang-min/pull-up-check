/// <reference lib="webworker" />
import { defaultCache } from "@serwist/vite/worker";
import { CacheFirst, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // MediaPipe 모델 파일 (CacheFirst — 버전이 URL에 포함됨)
    {
      matcher: ({ url }) =>
        url.origin === "https://storage.googleapis.com" &&
        url.pathname.includes("mediapipe"),
      handler: new CacheFirst({
        cacheName: "mediapipe-models",
        matchOptions: { ignoreSearch: true },
      }),
    },
    // MediaPipe WASM 파일
    {
      matcher: ({ url }) =>
        url.origin === "https://cdn.jsdelivr.net" &&
        url.pathname.includes("mediapipe"),
      handler: new CacheFirst({
        cacheName: "mediapipe-wasm",
      }),
    },
    // Google Fonts
    {
      matcher: ({ url }) =>
        url.origin === "https://fonts.googleapis.com" ||
        url.origin === "https://fonts.gstatic.com",
      handler: new CacheFirst({
        cacheName: "google-fonts",
      }),
    },
    // 기본 캐싱 전략
    ...defaultCache,
  ],
});

serwist.addEventListeners();
