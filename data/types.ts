export interface Pill {
  id: string;
  name: string;
  times: string[]; // ["08:00", "12:00"]
  emoji: string;
  color: string;
  dosageAmount?: string;
  dosageUnit?: string;
  note?: string;
}

export interface Intake {
  pillId: string;
  pillName: string; // denormalized for history
  time: string;
  taken: boolean;
}

export interface DailyRecord {
  date: string; // "YYYY-MM-DD"
  intakes: Intake[];
  /**
   * 목돈식 지급 분리 — 아래 3개 필드는 구버전 기록에 없다(undefined).
   * 읽는 쪽에서 항상 `?? 0` / `?? false` 로 기본값을 채워 쓸 것. 마이그레이션 불필요.
   */
  stamped?: number; // 광고를 봐서 발급된 스탬프 수
  claimedStamps?: number; // 탭해서 실제 지급까지 끝낸 스탬프 수
  bonusClaimed?: boolean; // 전량 복용 완주 보너스 수령 여부
}

/** 구버전 기록도 안전하게 읽기 위한 정규화 */
export function normalizeRecord(r: DailyRecord): Required<Pick<DailyRecord, 'stamped' | 'claimedStamps' | 'bonusClaimed'>> & DailyRecord {
  return {
    ...r,
    stamped: r.stamped ?? 0,
    claimedStamps: r.claimedStamps ?? 0,
    bonusClaimed: r.bonusClaimed ?? false,
  };
}
