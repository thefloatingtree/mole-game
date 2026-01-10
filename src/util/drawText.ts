import type { Sprite } from "../Sprite";

export function measureText(text: string): {
  width: number;
  height: number;
} {
  const { lineWidth, lineHeight } = calculateCharacterPositions(text, 0, 0);
  
  return {
    width: lineWidth,
    height: lineHeight,
  };
}

// Numbers start on frame 0, letters start on frame 10. Space, period, comma, question mark, exclamation mark start on frame 36
export function drawText(
  context: CanvasRenderingContext2D,
  fontSprite: Sprite,
  text: string,
  x: number,
  y: number,
  centered: boolean = false
) {
  const { positions, lineWidth } = calculateCharacterPositions(text, x, y);

  const finalPositions = centered
    ? positions.map((pos) => ({
        x: pos.x - lineWidth / 2,
        y: pos.y,
        frameIndex: pos.frameIndex,
      }))
    : positions;

  for (const pos of finalPositions) {
    fontSprite.drawFrame(context, pos.frameIndex.toString(), pos.x, pos.y);
  }
}

export function calculateCharacterPositions(
  text: string,
  x: number,
  y: number
) {
  let line = 0;
  let charInLine = 0;
  let lineLengthAccumulator = 0;
  const positions: { x: number; y: number; frameIndex: number }[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i].toUpperCase();

    if (char === "\n") {
      line++;
      charInLine = 0;
      lineLengthAccumulator = 0;
      continue;
    }

    let frameIndex: number;
    if (char >= "0" && char <= "9") {
      frameIndex = char.charCodeAt(0) - "0".charCodeAt(0);
    } else if (char >= "A" && char <= "Z") {
      frameIndex = char.charCodeAt(0) - "A".charCodeAt(0) + 10;
    } else if (char >= "a" && char <= "z") {
      frameIndex = char.charCodeAt(0) - "a".charCodeAt(0) + 10;
    } else if (char === " ") {
      frameIndex = 36; // Space character
    } else if (char === ".") {
      frameIndex = 37; // Period character
    } else if (char === ",") {
      frameIndex = 38; // Comma character
    } else if (char === "?") {
      frameIndex = 39; // Question mark character
    } else if (char === "!") {
      frameIndex = 40; // Exclamation mark character
    } else if (char === "+") {
      frameIndex = 41; // Plus sign character
    } else if (char === "-") {
      frameIndex = 42; // Hyphen character
    } else if (char === ":") {
      frameIndex = 43; // Colon character
    } else {
      continue; // Skip unsupported characters
    }

    let characterWidth = 6;
    let xOffset = 0;

    if (
      char === "I" ||
      char === " " ||
      char === "." ||
      char === "," ||
      char === "!"
    ) {
      characterWidth = 4;
    }

    if (char === "I" || char === "!") {
      xOffset = -1;
    }

    positions.push({
      x: x + lineLengthAccumulator + xOffset,
      y: y + line * 8,
      frameIndex: frameIndex,
    });

    lineLengthAccumulator += characterWidth;
    charInLine++;
  }

  return {
    positions,
    lineWidth: lineLengthAccumulator,
    lineHeight: (line + 1) * 8,
  };
}
