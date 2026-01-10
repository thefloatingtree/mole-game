import { Colors } from "../../constants/Colors";
import { Game } from "../../Game";
import type { IScene } from "../../IScene";
import { Sprite } from "../../Sprite";
import { drawText } from "../../util/drawText";
import { MineScene } from "../mine-scene/MineScene";

export class MainMenuScene implements IScene {
  public transitionsSprite: Sprite | null = null;

  async load() {
    this.transitionsSprite = await Sprite.load(
      new URL("/assets/sprites/transitions-sprite.png", import.meta.url).href,
      new URL("/assets/sprites/transitions-sprite.json", import.meta.url).href
    );
  }

  update(deltaTime: number): void {
    if (Game.instance.input.isPressed("enter")) {
      Game.instance.switchScene(new MineScene());
    }
  }

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    context.beginPath();
    context.fillStyle = Colors.BLACK;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.closePath();

    drawText(
      context,
      Game.instance.defaultFontSprite,
      "Enter to start",
      Game.instance.camera.centerX,
      Game.instance.camera.height - 32,
      true
    );

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
