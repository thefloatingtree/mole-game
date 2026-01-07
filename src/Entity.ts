import { Game } from "./Game";

export abstract class Entity {
  abstract position: { x: number; y: number };

  constructor() {}

  public get cameraPosition() {
    const camera = Game.instance.camera;
    return {
      x: Math.round(this.position.x - camera.x + camera.xOffset),
      y: Math.round(this.position.y - camera.y + camera.yOffset),
    };
  }

  abstract update(deltaTime: number): void;
  abstract draw(context: CanvasRenderingContext2D, deltaTime: number): void;
}
