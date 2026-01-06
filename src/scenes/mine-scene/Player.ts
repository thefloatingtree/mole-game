import { Game } from "../../Game";
import type { IEntity } from "../../IEntity";
import type { MineScene } from "./MineScene";

export class MineScenePlayer implements IEntity {
  readonly speed = 0.25;

  public position = { x: 0, y: 0 };

  constructor(private scene: MineScene) {}

  update(deltaTime: number): void {
    if (Game.instance.input.isDown("w")) {
      this.position.y -= this.speed * deltaTime;
    }
    if (Game.instance.input.isDown("s")) {
      this.position.y += this.speed * deltaTime;
    }
    if (Game.instance.input.isDown("a")) {
      this.position.x -= this.speed * deltaTime;
    }
    if (Game.instance.input.isDown("d")) {
      this.position.x += this.speed * deltaTime;
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    // Draw player (for now, just a white square)
    context.fillStyle = "white";
    context.fillRect(this.position.x, this.position.y, 20, 20);
  }
}
