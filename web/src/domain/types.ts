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
}
