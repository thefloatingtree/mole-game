import { Colors } from "../../constants/Colors";
import type { IScene } from "../../IScene";

export class ShopScene implements IScene {
  async load() {}

  update(deltaTime: number): void {}

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    context.beginPath();
    context.fillStyle = Colors.BLACK;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.closePath();
  }
  
  destroy(): void {}
}
