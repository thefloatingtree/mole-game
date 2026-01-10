import type { Color } from "../constants/Colors";
import { Game } from "../Game";
import { hexToRgb } from "./drawDebug";

const imageDataCache = new Map<number, ImageData>();

export function drawPoint(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: Color,
  size: number = 1
) {
  const rgb = hexToRgb(color);
  if (!rgb) return;

  const cacheKey = (rgb.r << 16) | (rgb.g << 8) | rgb.b | (size << 24);

  let imageData = imageDataCache.get(cacheKey);
  if (!imageData) {
    imageData = context.createImageData(size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
      data[i + 3] = 255;
    }
    imageDataCache.set(cacheKey, imageData);
  }

  context.putImageData(
    imageData,
    Math.round(x - Game.instance.camera.x),
    Math.round(y - Game.instance.camera.y)
  );
}

// Use Bresenham's circle algorithm to draw a filled circle
export function drawCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fillColor: Color | null,
  strokeColor: Color | null = null
) {
  const radiusInt = Math.floor(radius);
  if (radiusInt < 0) return;

  const startX = Math.round(x - radiusInt);
  const startY = Math.round(y - radiusInt);
  const size = radiusInt * 2 + 1;

  const camX = Game.instance.camera.x;
  const camY = Game.instance.camera.y;

  const imageData = context.getImageData(
    Math.round(startX - camX),
    Math.round(startY - camY),
    size,
    size
  );
  const data = imageData.data;

  const fillRgb = fillColor ? hexToRgb(fillColor) : null;
  const strokeRgb = strokeColor ? hexToRgb(strokeColor) : null;

  const setPixelRgb = (
    px: number,
    py: number,
    r: number,
    g: number,
    b: number
  ) => {
    const localX = px + radiusInt;
    const localY = py + radiusInt;
    if (localX < 0 || localX >= size || localY < 0 || localY >= size) return;
    const idx = (localY * size + localX) * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 255;
  };

  const drawHLine = (
    x1: number,
    x2: number,
    py: number,
    r: number,
    g: number,
    b: number
  ) => {
    const localY = py + radiusInt;
    if (localY < 0 || localY >= size) return;
    const minX = Math.max(0, x1 + radiusInt);
    const maxX = Math.min(size - 1, x2 + radiusInt);
    for (let lx = minX; lx <= maxX; lx++) {
      const idx = (localY * size + lx) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  };

  if (fillRgb) {
    let f = 1 - radiusInt;
    let ddF_x = 1;
    let ddF_y = -2 * radiusInt;
    let xPos = 0;
    let yPos = radiusInt;

    // Fill the center horizontal line
    drawHLine(-radiusInt, radiusInt, 0, fillRgb.r, fillRgb.g, fillRgb.b);

    while (xPos < yPos) {
      if (f >= 0) {
        yPos--;
        ddF_y += 2;
        f += ddF_y;
      }
      xPos++;
      ddF_x += 2;
      f += ddF_x;

      // Fill horizontal spans for all 4 quadrants
      drawHLine(-xPos, xPos, yPos, fillRgb.r, fillRgb.g, fillRgb.b);
      drawHLine(-xPos, xPos, -yPos, fillRgb.r, fillRgb.g, fillRgb.b);
      drawHLine(-yPos, yPos, xPos, fillRgb.r, fillRgb.g, fillRgb.b);
      drawHLine(-yPos, yPos, -xPos, fillRgb.r, fillRgb.g, fillRgb.b);
    }
  }

  if (strokeRgb) {
    let f = 1 - radiusInt;
    let ddF_x = 1;
    let ddF_y = -2 * radiusInt;
    let xPos = 0;
    let yPos = radiusInt;

    // Draw the 4 cardinal points
    setPixelRgb(0, radiusInt, strokeRgb.r, strokeRgb.g, strokeRgb.b);
    setPixelRgb(0, -radiusInt, strokeRgb.r, strokeRgb.g, strokeRgb.b);
    setPixelRgb(radiusInt, 0, strokeRgb.r, strokeRgb.g, strokeRgb.b);
    setPixelRgb(-radiusInt, 0, strokeRgb.r, strokeRgb.g, strokeRgb.b);

    while (xPos < yPos) {
      if (f >= 0) {
        yPos--;
        ddF_y += 2;
        f += ddF_y;
      }
      xPos++;
      ddF_x += 2;
      f += ddF_x;

      // Draw 8 symmetric points for the outline
      setPixelRgb(xPos, yPos, strokeRgb.r, strokeRgb.g, strokeRgb.b);
      setPixelRgb(-xPos, yPos, strokeRgb.r, strokeRgb.g, strokeRgb.b);
      setPixelRgb(xPos, -yPos, strokeRgb.r, strokeRgb.g, strokeRgb.b);
      setPixelRgb(-xPos, -yPos, strokeRgb.r, strokeRgb.g, strokeRgb.b);
      setPixelRgb(yPos, xPos, strokeRgb.r, strokeRgb.g, strokeRgb.b);
      setPixelRgb(-yPos, xPos, strokeRgb.r, strokeRgb.g, strokeRgb.b);
      setPixelRgb(yPos, -xPos, strokeRgb.r, strokeRgb.g, strokeRgb.b);
      setPixelRgb(-yPos, -xPos, strokeRgb.r, strokeRgb.g, strokeRgb.b);
    }
  }

  context.putImageData(
    imageData,
    Math.round(startX - camX),
    Math.round(startY - camY)
  );
}
