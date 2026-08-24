// 크로스 프로모션 — 보상 없는 단순 안내(지급 로직 없음). 자기 앱(pillcheck)은 목록에서 제외한다.
// 딥링크·아이콘은 딥링크 마스터 카탈로그(메모리 linked-app-deeplinks) 기준.
export interface LinkedApp {
  name: string;
  deepLink: string;
  desc: string;
  icon: string;
}

const ICON = (file: string) => `https://static.toss.im/appsintoss/28423/${file}`;

/** 날짜별로 돌아가며 노출되는 페어. 매일 다른 앱이 보이도록 한다. */
export const APP_PAIRS: readonly (readonly [LinkedApp, LinkedApp])[] = [
  [
    { name: '목돈', deepLink: 'intoss://mokdon', desc: '거북목 고치는 스트레칭 해봐요', icon: ICON('0d8ea711-afb7-4291-862e-beeb21f30a82.png') },
    { name: '하루세끼', deepLink: 'intoss://mealsnap', desc: '식사를 거르지 않는 습관 만들기', icon: ICON('6b209964-d1a5-47f4-bdbb-f668fe2d4b65.png') },
  ],
  [
    { name: '카페인 지수', deepLink: 'intoss://trippack', desc: '오늘 하루의 카페인 섭취량 체크해보기', icon: ICON('aa954944-a32a-49d6-bd58-d1bcd92e92fd.png') },
    { name: '건강체조 1234', deepLink: 'intoss://healthgym1234', desc: '건강해지는 체조와 퀴즈 풀어봐요', icon: ICON('1d5bfa43-9f9c-486a-88e3-92ab0065d06e.png') },
  ],
  [
    { name: '허리업', deepLink: 'intoss://spinehealth', desc: '허리 건강 챙기는 스트레칭 해보기', icon: ICON('632d5bf3-54d6-429a-a4ff-4c3cf2f8f313.png') },
    { name: '기억력 트레이닝', deepLink: 'intoss://mindnote', desc: '기억력을 높여주는 게임을 해봐요', icon: ICON('2332457b-aa39-4929-8336-f2429e7b6ddb.png') },
  ],
  [
    { name: '어깨펴자', deepLink: 'intoss://shoulderfix', desc: '라운드숄더 고쳐주는 어깨 스트레칭', icon: ICON('8eeec1f1-126a-4308-aba0-00bcb0d601b6.png') },
    { name: '깜빡이자', deepLink: 'intoss://kkambbakija', desc: '눈에 휴식시간 주기', icon: ICON('7d4b2107-24a6-4ec5-af48-02a0b6ced051.png') },
  ],
];

/** 완주한 날 보여줄 페어 — 축하 맥락에 맞는 가벼운 앱 */
export const COMPLETE_PAIR: readonly [LinkedApp, LinkedApp] = [
  { name: '포인트 빙고', deepLink: 'intoss://streetkitty', desc: '일상을 채워 빙고를 완성해봐요', icon: ICON('8e46ea1f-37e9-498e-84e0-6b6942fcbafe.png') },
  { name: '금값 알리미', deepLink: 'intoss://goldprice', desc: '오늘 금 시세와 환율 확인하기', icon: ICON('73a294af-05a3-458f-8e07-7a5e06a82742.png') },
];

/** 날짜 문자열(YYYY-MM-DD)로 페어를 고른다 — 하루 단위로 고정, 매일 교체 */
export function pairForDate(date: string): readonly [LinkedApp, LinkedApp] {
  const day = Number(date.slice(-2)) || 1;
  return APP_PAIRS[day % APP_PAIRS.length];
}
