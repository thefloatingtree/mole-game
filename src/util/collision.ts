export function checkCollisionAABB(
  rectA: { x: number; y: number; width: number; height: number },
  rectB: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    rectA.x < rectB.x + rectB.width &&
    rectA.x + rectA.width > rectB.x &&
    rectA.y < rectB.y + rectB.height &&
    rectA.y + rectA.height > rectB.y
  );
}

export type CollisionSide = "top" | "bottom" | "left" | "right" | null;
export function resolveCollisionAABB(
  movingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
    vx: number;
    vy: number;
  },
  staticRect: { x: number; y: number; width: number; height: number }
): { x: number; y: number; vx: number; vy: number; side: CollisionSide } {
  let x = movingRect.x;
  let y = movingRect.y;
  let vx = movingRect.vx;
  let vy = movingRect.vy;

  const overlapX1 = x + movingRect.width - staticRect.x;
  const overlapX2 = staticRect.x + staticRect.width - x;
  const overlapY1 = y + movingRect.height - staticRect.y;
  const overlapY2 = staticRect.y + staticRect.height - y;
  const minOverlapX = Math.min(overlapX1, overlapX2);
  const minOverlapY = Math.min(overlapY1, overlapY2);

  if (minOverlapX < minOverlapY) {
    if (overlapX1 < overlapX2) {
      return { x: staticRect.x - movingRect.width, y, vx: 0, vy, side: "right" };
    } else {
      return {
        x: staticRect.x + staticRect.width,
        y,
        vx: 0,
        vy,
        side: "left",
      };
    }
  } else {
    if (overlapY1 < overlapY2) {
      return { x, y: staticRect.y - movingRect.height, vx, vy: 0, side: "bottom" };
    } else {
      return {
        x,
        y: staticRect.y + staticRect.height,
        vx,
        vy: 0,
        side: "top",
      };
    }
  }
}
