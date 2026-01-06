import { Colors } from "../../constants/Colors";
import type { IScene } from "../../IScene";
import { Sprite } from "../../Sprite";
import { MineScenePlayerController } from "./MineScenePlayerController";

export class MineScene implements IScene {
  #playerSprite: Sprite | null = null;
  playerController = new MineScenePlayerController(this);

  get playerSprite(): Sprite {
    if (!this.#playerSprite) {
      throw new Error("Player sprite not loaded yet");
    }
    return this.#playerSprite;
  }

  async load() {
    this.#playerSprite = await Sprite.load(
      new URL("/assets/sprites/player-sprite.png", import.meta.url).href,
      new URL("/assets/sprites/player-sprite.json", import.meta.url).href
    );
  }

  update(deltaTime: number): void {
    this.playerController.update(deltaTime);
  }

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    context.fillStyle = Colors.BLACK;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    this.playerController.draw(context, deltaTime);
  }

  destroy(): void {}
}
