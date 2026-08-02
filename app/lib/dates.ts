const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isHabitDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function previousDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function calculateStreak(dates: string[], endingDate: string): number {
  const completed = new Set(dates);
  let cursor = endingDate;
  let streak = 0;
  while (completed.has(cursor)) {
    streak += 1;
    cursor = previousDate(cursor);
  }
  return streak;
}
