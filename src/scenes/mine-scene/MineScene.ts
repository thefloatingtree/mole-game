import { Colors } from "../../constants/Colors";
import type { IScene } from "../../IScene";
import { MineScenePlayer } from "./Player";

export class MineScene implements IScene {
  player = new MineScenePlayer(this);

  async load() {
    
  }

  update(deltaTime: number): void {
    this.player.update(deltaTime);
  }

  draw(context: CanvasRenderingContext2D): void {
    context.fillStyle = Colors.BLACK;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    this.player.draw(context);
  }

  destroy(): void {}
}
