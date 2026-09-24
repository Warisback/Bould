/** Chess-style Elo against the boulder. */
export function boulderRating(grade: number): number {
  return 800 + 150 * grade;
}

export function expectedScore(rating: number, grade: number): number {
  return 1 / (1 + Math.pow(10, (boulderRating(grade) - rating) / 400));
}

export function ratingChange(
  rating: number,
  grade: number,
  sent: boolean,
  accuracy: number,
): number {
  const result = sent ? 1 : 0;
  return Math.round(32 * (result - expectedScore(rating, grade)) + (accuracy - 70) / 10);
}
