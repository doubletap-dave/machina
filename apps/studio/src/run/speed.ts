export function delayForSpeed(speed: 1 | 10 | 100): number {
  if (speed === 1) {
    return 1000;
  }
  if (speed === 10) {
    return 100;
  }
  return 10;
}
