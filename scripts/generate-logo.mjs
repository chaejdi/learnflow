import sharp from 'sharp';
import { writeFileSync } from 'fs';

const svg = `
<svg width="640" height="640" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5"/>
      <stop offset="100%" style="stop-color:#7C3AED"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#38BDF8"/>
      <stop offset="100%" style="stop-color:#818CF8"/>
    </linearGradient>
  </defs>

  <!-- 배경: 라운드 사각형 -->
  <rect width="640" height="640" rx="128" fill="url(#bg)"/>

  <!-- 책 아이콘 (교육 상징) -->
  <g transform="translate(320, 240)">
    <!-- 왼쪽 페이지 -->
    <path d="M-8,-80 L-8,-80 C-8,-80 -100,-70 -100,-10 L-100,60 C-100,60 -100,80 -8,70"
          fill="none" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
    <!-- 오른쪽 페이지 -->
    <path d="M8,-80 L8,-80 C8,-80 100,-70 100,-10 L100,60 C100,60 100,80 8,70"
          fill="none" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
    <!-- 가운데 척추 -->
    <line x1="0" y1="-80" x2="0" y2="70" stroke="white" stroke-width="8" opacity="0.7"/>

    <!-- AI 뉴런/연결선 (AI 상징) -->
    <circle cx="-50" cy="-20" r="8" fill="url(#accent)" opacity="0.9"/>
    <circle cx="-30" cy="-45" r="6" fill="url(#accent)" opacity="0.9"/>
    <circle cx="50" cy="-15" r="8" fill="url(#accent)" opacity="0.9"/>
    <circle cx="35" cy="-45" r="6" fill="url(#accent)" opacity="0.9"/>
    <circle cx="0" cy="-30" r="10" fill="#38BDF8"/>

    <!-- 연결선 -->
    <line x1="-50" y1="-20" x2="0" y2="-30" stroke="url(#accent)" stroke-width="3" opacity="0.6"/>
    <line x1="-30" y1="-45" x2="0" y2="-30" stroke="url(#accent)" stroke-width="3" opacity="0.6"/>
    <line x1="50" y1="-15" x2="0" y2="-30" stroke="url(#accent)" stroke-width="3" opacity="0.6"/>
    <line x1="35" y1="-45" x2="0" y2="-30" stroke="url(#accent)" stroke-width="3" opacity="0.6"/>

    <!-- Flow 화살표 -->
    <path d="M70,30 Q90,10 110,30" fill="none" stroke="#38BDF8" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
    <path d="M105,22 L112,32 L100,32" fill="#38BDF8" opacity="0.8"/>
  </g>

  <!-- 텍스트: LearnFlow -->
  <text x="320" y="420" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="82" fill="white" letter-spacing="-2">
    Learn<tspan fill="#38BDF8">Flow</tspan>
  </text>

  <!-- 한글: 런플로우 -->
  <text x="320" y="478" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="36" fill="white" opacity="0.75" letter-spacing="6">
    런플로우
  </text>

  <!-- 서브 텍스트 -->
  <text x="320" y="530" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="24" fill="white" opacity="0.5" letter-spacing="2">
    AI Academy Assistant
  </text>
</svg>
`;

const buffer = Buffer.from(svg);

await sharp(buffer)
  .resize(640, 640)
  .jpeg({ quality: 95 })
  .toFile('public/logo.jpg');

console.log('Logo generated: public/logo.jpg');
