export function vectorMagnitude(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function vectorNormalize(
  x: number,
  y: number
): { x: number; y: number } {
  const magnitude = vectorMagnitude(x, y);
  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }
  return { x: x / magnitude, y: y / magnitude };
}

export function vectorScale(
  x: number,
  y: number,
  scale: number
): { x: number; y: number } {
  return { x: x * scale, y: y * scale };
}

export function vectorAdd(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number } {
  return { x: x1 + x2, y: y1 + y2 };
}

export function vectorSubtract(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number } {
  return { x: x1 - x2, y: y1 - y2 };
}

export function vectorDot(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return x1 * x2 + y1 * y2;
}

export function vectorAngleBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dot = vectorDot(x1, y1, x2, y2);
  const mag1 = vectorMagnitude(x1, y1);
  const mag2 = vectorMagnitude(x2, y2);
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  const cosTheta = dot / (mag1 * mag2);
  return Math.acos(Math.min(Math.max(cosTheta, -1), 1)); // Clamp value between -1 and 1
}

export function vectorRotate(
  x: number,
  y: number,
  angleRadians: number
): { x: number; y: number } {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

export function vectorLerp(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number
): { x: number; y: number } {
  return {
    x: x1 + (x2 - x1) * t,
    y: y1 + (y2 - y1) * t,
  };
}