// 광고 / 프로모션 식별자 — 전부 콘솔 발급 완료된 운영 지면(2026-08-24 기준 ENABLED).
//
// 수익 구조 원칙:
//  - 리워드(전면형)는 **기능 언락 전용**이다. 포인트 지급에 연결하지 않는다.
//    복용 건수처럼 유저가 늘릴 수 있는 행동에 지급을 걸면 등록을 늘릴수록 지급이 커져 마진이 역주행한다.
//  - 수익 본체는 배너/피드다. 지급이 0원이므로 노출을 늘린 만큼 그대로 마진이 된다.
export const AD_IDS = {
  /** 홈 상단 배너 (문구 강조형) */
  homeBanner: 'ait.v2.live.a0ee7a06ab474249',
  /** 홈 중단 피드 (이미지 강조형) */
  homeFeed: 'ait.v2.live.cdd859d125c446bc',
  /** 기록 탭 상단 배너 */
  recordBanner: 'ait.v2.live.517b705f3dab488c',
  /** 기록 탭 하단 피드 */
  recordFeed: 'ait.v2.live.e9cc2b606e7743f3',
  /** 영양제 관리 탭 배너 */
  manageBanner: 'ait.v2.live.2588455d864e4122',
  /** 점검 결과 화면 피드 — 체류가 가장 긴 자리 */
  checkFeed: 'ait.v2.live.b6930667f8144517',
  /** 고민별 찾기 화면 피드 */
  findFeed: 'ait.v2.live.775f2c64478b4c3b',
  /** 영양제 추가 화면 피드 */
  addFeed: 'ait.v2.live.14c7a31d3b0b46c9',
  /**
   * 리워드 전면형 — 순차 폴백 체인(useRewardAd가 실패 시에만 다음 그룹 시도).
   * 쓰이는 곳: 영양제 자리 늘리기(기능 언락) · 일일/주간 보너스 도장 발급.
   */
  reward: ['ait.v2.live.7848babf27974479', 'ait.v2.live.f8f99d3e8bd5467e'],
};

// 프로모션 코드 — 콘솔에 등록된 운영 코드(RUNNING·APPROVED). 지급액은 프로모션의 최대 지급액과 일치해야 한다.
// 현행 배포본(20260423)과 동일한 지급 구조를 유지한다.
export const PROMO = {
  /** "매일 복약 완료하면 3원 지급" — 하루 1회 */
  daily: '01KNMBKGEZN9GCQB8VJYGXCE36',
  /** "7일 연속 복약 완료하면 10원 지급" — 주 1회 */
  streak: '01KNMBMT7JJR0HVRMS2Q44MW9V',
};
