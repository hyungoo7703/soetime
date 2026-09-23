import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { thirdPartyLicenses, LICENSES_FILE } from './vite-plugins/third-party-licenses';

export default defineConfig({
  base: '/soetime/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        // 서비스 워커가 모든 페이지 이동을 index.html로 돌리므로, 라이선스 파일은 예외로 둔다.
        // 안 그러면 설정 화면의 링크를 눌러도 앱 화면이 다시 뜬다.
        navigateFallbackDenylist: [new RegExp(`${LICENSES_FILE.replace(/\./g, '\\.')}$`)]
      },
      manifest: {
        name: '쇠타임 - 운동 휴식 타이머',
        short_name: '쇠타임',
        lang: 'ko',
        description: '광고 없는 운동 휴식 타이머. 화면 꺼짐 방지와 오프라인 동작을 지원합니다.',
        theme_color: '#0b0f19',
        background_color: '#0b0f19',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    }),
    thirdPartyLicenses()
  ]
});
