import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

// ── 풀업 체크 아이콘 SVG ──
// 철봉에 매달린 실루엣 + 체크마크 결합
function createIconSvg(size, maskable = false) {
  const padding = maskable ? size * 0.2 : size * 0.08;
  const inner = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const scale = inner / 512;
  const ox = padding;
  const oy = padding;

  // 아이콘 요소 좌표 (512x512 기준, scale + offset 적용)
  const s = (v) => v * scale;
  const tx = (v) => ox + v * scale;
  const ty = (v) => oy + v * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <!-- 배경 그라데이션 -->
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#1c1917"/>
      <stop offset="100%" stop-color="#0c0a09"/>
    </radialGradient>
    <!-- 앰버 그라데이션 -->
    <linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <!-- 체크마크 글로우 -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="${s(6)}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- 배경 -->
  ${maskable
    ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>`
    : `<rect x="${s(8)}" y="${s(8)}" width="${size - s(16)}" height="${size - s(16)}" rx="${s(96)}" fill="url(#bg)"/>`
  }

  <!-- 철봉 (가로 바) -->
  <rect x="${tx(80)}" y="${ty(100)}" width="${s(352)}" height="${s(22)}" rx="${s(11)}" fill="url(#amber)"/>
  <!-- 좌측 기둥 -->
  <rect x="${tx(100)}" y="${ty(70)}" width="${s(18)}" height="${s(60)}" rx="${s(6)}" fill="url(#amber)" opacity="0.7"/>
  <!-- 우측 기둥 -->
  <rect x="${tx(394)}" y="${ty(70)}" width="${s(18)}" height="${s(60)}" rx="${s(6)}" fill="url(#amber)" opacity="0.7"/>

  <!-- 인체 실루엣 (매달린 자세) -->
  <!-- 머리 -->
  <circle cx="${tx(256)}" cy="${ty(160)}" r="${s(28)}" fill="#a8a29e" opacity="0.9"/>
  <!-- 목 -->
  <rect x="${tx(248)}" y="${ty(186)}" width="${s(16)}" height="${s(14)}" rx="${s(4)}" fill="#a8a29e" opacity="0.7"/>
  <!-- 좌측 팔 -->
  <line x1="${tx(200)}" y1="${ty(111)}" x2="${tx(230)}" y2="${ty(190)}" stroke="#a8a29e" stroke-width="${s(16)}" stroke-linecap="round" opacity="0.85"/>
  <!-- 우측 팔 -->
  <line x1="${tx(312)}" y1="${ty(111)}" x2="${tx(282)}" y2="${ty(190)}" stroke="#a8a29e" stroke-width="${s(16)}" stroke-linecap="round" opacity="0.85"/>
  <!-- 몸통 -->
  <rect x="${tx(232)}" y="${ty(198)}" width="${s(48)}" height="${s(80)}" rx="${s(10)}" fill="#a8a29e" opacity="0.75"/>
  <!-- 좌측 다리 -->
  <line x1="${tx(244)}" y1="${ty(276)}" x2="${tx(238)}" y2="${ty(370)}" stroke="#a8a29e" stroke-width="${s(14)}" stroke-linecap="round" opacity="0.7"/>
  <!-- 우측 다리 -->
  <line x1="${tx(268)}" y1="${ty(276)}" x2="${tx(274)}" y2="${ty(370)}" stroke="#a8a29e" stroke-width="${s(14)}" stroke-linecap="round" opacity="0.7"/>

  <!-- 체크마크 (우하단) -->
  <circle cx="${tx(380)}" cy="${ty(390)}" r="${s(56)}" fill="#0c0a09" opacity="0.85"/>
  <polyline
    points="${tx(354)},${ty(390)} ${tx(374)},${ty(414)} ${tx(412)},${ty(366)}"
    fill="none"
    stroke="url(#amber)"
    stroke-width="${s(16)}"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#glow)"
  />
</svg>`;
}

// ── 파비콘 SVG (심플 버전) ──
function createFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0c0a09"/>
  <!-- 바 -->
  <rect x="5" y="6" width="22" height="2" rx="1" fill="#f59e0b"/>
  <!-- 팔 -->
  <line x1="11" y1="8" x2="14" y2="13" stroke="#a8a29e" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="21" y1="8" x2="18" y2="13" stroke="#a8a29e" stroke-width="1.8" stroke-linecap="round"/>
  <!-- 머리 -->
  <circle cx="16" cy="12" r="2.5" fill="#a8a29e"/>
  <!-- 몸 -->
  <line x1="16" y1="14.5" x2="16" y2="22" stroke="#a8a29e" stroke-width="2.2" stroke-linecap="round"/>
  <!-- 다리 -->
  <line x1="16" y1="22" x2="14" y2="28" stroke="#a8a29e" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="16" y1="22" x2="18" y2="28" stroke="#a8a29e" stroke-width="1.6" stroke-linecap="round"/>
  <!-- 체크 -->
  <polyline points="20,22 23,26 28,18" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// ── 생성 ──
async function generate() {
  const variants = [
    { size: 192, maskable: false, name: 'icon-192x192.png' },
    { size: 192, maskable: true,  name: 'icon-192x192-maskable.png' },
    { size: 512, maskable: false, name: 'icon-512x512.png' },
    { size: 512, maskable: true,  name: 'icon-512x512-maskable.png' },
  ];

  for (const { size, maskable, name } of variants) {
    const svg = createIconSvg(size, maskable);
    const png = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toBuffer();

    const outPath = join(PUBLIC, name);
    writeFileSync(outPath, png);
    console.log(`✓ ${name} (${(png.length / 1024).toFixed(1)} KB)`);
  }

  // 파비콘 SVG (브라우저용)
  const faviconSvg = createFaviconSvg();
  writeFileSync(join(PUBLIC, 'favicon.svg'), faviconSvg);
  console.log('✓ favicon.svg');

  // 파비콘 PNG 32x32
  const faviconPng = await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, 'favicon.png'), faviconPng);
  console.log(`✓ favicon.png (${(faviconPng.length / 1024).toFixed(1)} KB)`);

  // Apple Touch Icon 180x180
  const appleSvg = createIconSvg(180, true);
  const applePng = await sharp(Buffer.from(appleSvg))
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), applePng);
  console.log(`✓ apple-touch-icon.png (${(applePng.length / 1024).toFixed(1)} KB)`);

  console.log('\nDone! All icons generated.');
}

generate().catch(console.error);
