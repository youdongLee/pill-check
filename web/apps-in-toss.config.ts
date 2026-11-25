import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 콘솔 appName(miniAppId 24456). RN 라이브 번들 20261019-43(a0d98f3) + 미출시 알림 동의(ff4eae0)를
  // SDK 3.x 웹뷰로 옮긴 것(2026-11-25, SDK 2.x 지원 종료). 핫딜 특가 카드는 서버 삭제(11/23)로 옮기지 않았다.
  // 표시 이름·아이콘은 콘솔 앱 정보에서 온다(RN granite.config 의 displayName '영양제 챙겨먹기').
  appName: 'pillcheck',
  brand: {
    primaryColor: '#22C55E',
  },
  permissions: [],
  webBundleDir: 'dist',
});
