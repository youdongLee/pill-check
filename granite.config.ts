import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';
import { router } from '@granite-js/plugin-router';

export default defineConfig({
  appName: 'pillcheck',
  scheme: 'intoss',
  entryFile: './src/_app.tsx',
  plugins: [
    router(),
    appsInToss({
      // 비게임 표준 내비게이션 바 — 생략하면 매니페스트에 앱 타입이 비어
      // "표준 내비게이션 바 미적용"으로 자동 검수 반려된다(운세앱 20260807-6 교훈).
      // 표준 내비바가 뒤로가기를 제공하므로 화면 안에 자체 헤더·백버튼을 그리지 않는다.
      appType: 'general',
      brand: {
        displayName: '영양제 챙겨먹기',
        primaryColor: '#22C55E',
        // 콘솔 앱 정보(iconUri)와 반드시 동일해야 검수를 통과한다
        icon: 'https://static.toss.im/appsintoss/28423/b49aa26d-29f3-4000-8f82-0cd7fe43e0e5.png',
      },
      // 쓰지 않는 권한은 요구하지 않는다
      permissions: [],
    }),
  ],
});
