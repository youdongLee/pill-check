export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatKoreanDate(dateStr: string): string {
  const [y, m, day] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, day);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  if (dateStr === todayStr()) return `오늘 (${days[date.getDay()]})`;
  return `${m}월 ${day}일 (${days[date.getDay()]})`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${h12}:${String(m).padStart(2, '0')}`;
}

export function getDatesBack(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }
  return dates;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
