/**
 * Points for one saved climb. Points only ever go up: every climb you log adds
 * to your total, and harder grades, sends and cleaner technique add more.
 *
 *   points = 10 * (grade + 1) * (sent ? 2 : 1) + round(accuracy / 10)
 *
 * V0 fall at 0% accuracy = 10 (the minimum). V8 send at 100% = 190.
 */
export function pointsForClimb(grade: number, sent: boolean, accuracy: number): number {
  const g = Number.isFinite(grade) ? Math.min(8, Math.max(0, Math.round(grade))) : 0;
  const acc = Number.isFinite(accuracy) ? Math.min(100, Math.max(0, accuracy)) : 0;
  return 10 * (g + 1) * (sent ? 2 : 1) + Math.round(acc / 10);
}
