// 테스트 전용 플래그. RN 은 출시 전에 손으로 false 로 바꿨다. 웹은 빌드 모드로 갈린다:
//   npm run build      → false (패널·광고 스킵·TEST_ 코드가 번들에서 빠진다)
//   npm run build:test → true  (🧪 번들)
import { TEST_MODE } from '../lib/platform';

export const SHOW_DEV_PANEL: boolean = TEST_MODE;

export const devFlags = {
  skipAds: false,
};
