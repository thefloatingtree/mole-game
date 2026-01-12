import { Game } from "../Game";
import { drawText } from "./drawText";

export const DebugColor = {
  RED: "FF0000",
  GREEN: "00FF00",
  BLUE: "0000FF",
  CYAN: "00FFFF",
  MAGENTA: "FF00FF",
  YELLOW: "FFFF00",
  WHITE: "FFFFFF",
  BLACK: "000000",
  NONE: null,
} as const;
export type DebugColor = (typeof DebugColor)[keyof typeof DebugColor];

export function hexToRgb(hex: string | null): {
  r: number;
  g: number;
  b: number;
} | null {
  if (hex === null) return null;
  // Remove leading '#' if present
  if (hex.startsWith("#")) {
    hex = hex.slice(1);
  }

  if (hex.length !== 6) {
    throw new Error("Invalid hex color format");
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

export function drawDebugRect(
  box: { x: number; y: number; width: number; height: number },
  strokeColor: DebugColor = DebugColor.RED,
  fillColor: DebugColor = DebugColor.NONE
) {
  if (!Game.drawDebugInfo) return;

  // Grab the image data for the area we want to draw the box in
  const imageData = Game.instance.context.getImageData(
    Math.round(box.x - Game.instance.camera.x),
    Math.round(box.y - Game.instance.camera.y),
    box.width,
    box.height
  );
  const data = imageData.data;
  const strokeColorRgb = hexToRgb(strokeColor);
  const fillColorRgb = hexToRgb(fillColor);

  for (let x = 0; x < box.width; x++) {
    for (let y = 0; y < box.height; y++) {
      const isBorder =
        x === 0 || x === box.width - 1 || y === 0 || y === box.height - 1;

      const index = (y * box.width + x) * 4;
      if (isBorder && strokeColorRgb) {
        data[index] = strokeColorRgb.r; // Red
        data[index + 1] = strokeColorRgb.g; // Green
        data[index + 2] = strokeColorRgb.b; // Blue
        data[index + 3] = 255; // Alpha
      }

      if (!isBorder && fillColorRgb) {
        data[index] = fillColorRgb.r;
        data[index + 1] = fillColorRgb.g;
        data[index + 2] = fillColorRgb.b;
        data[index + 3] = 255;
      }
    }
  }

  Game.instance.deferDraw(() => {
    Game.instance.context.putImageData(
      imageData,
      Math.round(box.x - Game.instance.camera.x),
      Math.round(box.y - Game.instance.camera.y)
    );
  }, true);
}

export function drawDebugRectOverlay(
  box: { x: number; y: number; width: number; height: number },
  strokeColor: DebugColor = DebugColor.RED,
  fillColor: DebugColor = DebugColor.NONE
) {
  if (!Game.drawDebugInfo) return;
  drawDebugRect(
    {
      x: box.x - Game.instance.camera.x,
      y: box.y - Game.instance.camera.y,
      width: box.width,
      height: box.height,
    },
    strokeColor,
    fillColor
  );
}

export function drawDebugPoint(
  point: { x: number; y: number },
  color: DebugColor = DebugColor.RED
) {
  drawDebugRect({ x: point.x - 1, y: point.y - 1, width: 2, height: 2 }, color);
}

export function drawDebugPointOverlay(
  point: { x: number; y: number },
  color: DebugColor = DebugColor.RED
) {
  if (!Game.drawDebugInfo) return;
  drawDebugPoint(
    {
      x: point.x - Game.instance.camera.x,
      y: point.y - Game.instance.camera.y,
    },
    color
  );
}

export function drawDebugLine(
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: DebugColor = DebugColor.RED
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const xIncrement = dx / steps;
  const yIncrement = dy / steps;
  let x = start.x;
  let y = start.y;

  for (let i = 0; i <= steps; i++) {
    drawDebugPoint({ x: Math.round(x), y: Math.round(y) }, color);
    x += xIncrement;
    y += yIncrement;
  }
}

export function drawDebugLineOverlay(
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: DebugColor = DebugColor.RED
) {
  if (!Game.drawDebugInfo) return;
  drawDebugLine(
    {
      x: start.x - Game.instance.camera.x,
      y: start.y - Game.instance.camera.y,
    },
    {
      x: end.x - Game.instance.camera.x,
      y: end.y - Game.instance.camera.y,
    },
    color
  );
}

export function drawDebugText(text: string, x: number, y: number) {
  if (!Game.drawDebugInfo) return;

  Game.instance.deferDraw(() => {
    drawText(
      Game.instance.context,
      Game.instance.defaultFontSprite,
      text,
      Math.round(x - Game.instance.camera.x),
      Math.round(y - Game.instance.camera.y)
    );
  }, true);
}

export function drawDebugTextOverlay(text: string, x: number, y: number) {
  if (!Game.drawDebugInfo) return;

  Game.instance.deferDraw(() => {
    drawText(
      Game.instance.context,
      Game.instance.defaultFontSprite,
      text,
      Math.round(x),
      Math.round(y)
    );
  }, true);
}
