import { Colors } from "../../constants/Colors";
import { Game } from "../../Game";
import type { IScene } from "../../IScene";
import { Sprite } from "../../Sprite";
import { drawText } from "../../util/drawText";
import { lerp } from "../../util/lerp";
import { MineScene } from "../mine-scene/MineScene";

export class MainMenuScene implements IScene {
  public transitionsSprite: Sprite | null = null;
  public selectAudio: Howl | null = null;

  resetHoldTime: number = 0;

  async load() {
    this.transitionsSprite = await Sprite.load(
      new URL("/assets/sprites/transitions-sprite.png", import.meta.url).href,
      new URL("/assets/sprites/transitions-sprite.json", import.meta.url).href
    );
  }

  update(deltaTime: number): void {
    if (Game.instance.input.isPressed("enter")) {
      setTimeout(() => {
        new Howl({
          src: [new URL("/assets/audio/select.wav", import.meta.url).href],
          volume: 0.5,
        }).play();
      }, 1);
      Game.instance.switchScene(new MineScene());
    }

    // Hold R to restart
    if (Game.instance.input.isDown("r")) {
      this.resetHoldTime += deltaTime;
      if (this.resetHoldTime >= 1000) {
        this.resetHoldTime = 0;

        Game.instance.state.clear();
      }
    } else {
      this.resetHoldTime = 0;
    }
  }

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    context.beginPath();
    context.fillStyle = Colors.BLACK;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.closePath();

    // Bob up and down effect
    const yOffset = Math.sin(Game.instance.timeSinceStart / 500) * 5;

    drawText(
      context,
      Game.instance.defaultFontSprite,
      "Enter to start",
      Game.instance.camera.centerX,
      Game.instance.camera.centerY + yOffset,
      true
    );

    if (Game.instance.state.hasAnyState()) {
      const restartProgress = this.resetHoldTime / 1000;
      const numberOfHyphens = lerp(
        0,
        "Hold R to reset all progress".length,
        restartProgress
      );
      const restartString =
        numberOfHyphens > 0
          ? "Hold R to reset all progress\n" +
            "-".repeat(Math.floor(numberOfHyphens))
          : "Hold R to reset all progress";

      // Hold R to reset all progress
      drawText(
        context,
        Game.instance.defaultFontSprite,
        restartString,
        Game.instance.camera.centerX,
        Game.instance.camera.height - 32,
        true
      );
    }

    this.transitionsSprite?.drawTiledAnimation(
      context,
      "FadeIn",
      0,
      0,
      40,
      24,
      deltaTime,
      false
    );
  }

  destroy(): void {}
}
