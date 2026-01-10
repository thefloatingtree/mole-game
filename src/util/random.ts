export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomIntBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice<T>(choices: T[]): T {
  const index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

export function randomArrayShuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function randomAngleBetween(
  minDegrees: number,
  maxDegrees: number
): number {
  const minRadians = (minDegrees * Math.PI) / 180;
  const maxRadians = (maxDegrees * Math.PI) / 180;
  return randomBetween(minRadians, maxRadians);
}

export function randomBoolean(chanceTrue: number = 0.5): boolean {
  return Math.random() < chanceTrue;
}

export function randomAtRate(valueRatePairs: { value: any; rate: number }[]): any {
  const totalRate = valueRatePairs.reduce((sum, pair) => sum + pair.rate, 0);
  const rand = Math.random() * totalRate;
  let cumulativeRate = 0;
  for (const pair of valueRatePairs) {
    cumulativeRate += pair.rate;
    if (rand < cumulativeRate) {
      return pair.value;
    }
  }
  return null; // Fallback, should not reach here if rates are set correctly
}