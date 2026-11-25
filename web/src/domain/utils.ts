/** RN data/utils.ts 중 쓰는 것만. 날짜는 숫자 생성자만 쓴다(Hermes 문자열 파싱 결함 5f0713d 와 같은 이유) */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** 'YYYY-MM-DD' → 요일 글자. new Date('YYYY/MM/DD') 같은 문자열 파싱을 쓰지 않는다 */
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
export function dayNameOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()] ?? '오늘';
}
