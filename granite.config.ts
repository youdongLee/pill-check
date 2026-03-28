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
      brand: {
        displayName: '영양제 챙겨먹기',
        primaryColor: '#22C55E',
        icon: 'https://static.toss.im/appsintoss/28423/b49aa26d-29f3-4000-8f82-0cd7fe43e0e5.png',
      },
      permissions: [],
    }),
  ],
});
