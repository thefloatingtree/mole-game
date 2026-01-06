import { Game } from "../../Game";
import type { IEntity } from "../../IEntity";
import type { MineScene } from "./MineScene";

export class MineScenePlayerController implements IEntity {
  readonly speed = 0.03;
  readonly gravity = 0.0010;

  position = { x: 0, y: 0 };
  velocity = { x: 0, y: 0 };

  isJumpDisabled = false;
  isAirborne = false;
  isFacing = { x: 1, y: 0 };
  isMoving = false;

  constructor(private scene: MineScene) {}

  update(deltaTime: number): void {
    this.isMoving = false;
    
    this.velocity.y += this.gravity * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    const isTouchingGround = this.position.y >= Game.instance.context.canvas.height - 16;
    this.isAirborne = !isTouchingGround;

    if (Game.instance.input.isReleased("w")) {
      this.isJumpDisabled = false;
    }

    if (Game.instance.input.isDown("w") && !this.isAirborne && !this.isJumpDisabled) {
      this.velocity.y = -0.2;
      this.isAirborne = true;
      this.isJumpDisabled = true;
    }
    if (Game.instance.input.isDown("a")) {
      this.position.x -= this.speed * deltaTime;
      this.isMoving = true;
      this.isFacing.x = -1;
    }
    if (Game.instance.input.isDown("d")) {
      this.position.x += this.speed * deltaTime;
      this.isMoving = true;
      this.isFacing.x = 1;
    }

    // Clamp position to screen bounds
    this.position.x = Math.max(0, Math.min(Game.instance.context.canvas.width - 32, this.position.x));
    this.position.y = Math.min(Game.instance.context.canvas.height - 16, this.position.y);
  }

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    if (this.isAirborne) {
      this.scene.playerSprite.drawAnimation(
        context,
        this.isFacing.x === -1 ? "Fall-L" : "Fall-R",
        this.position.x,
        this.position.y,
        deltaTime
      );
      return;
    }

    if (this.isMoving) {
      this.scene.playerSprite.drawAnimation(
        context,
        this.isFacing.x === -1 ? "Run-L" : "Run-R",
        this.position.x,
        this.position.y,
        deltaTime
      );
      return;
    }

    this.scene.playerSprite.drawAnimation(
      context,
      this.isFacing.x === -1 ? "Idle-L" : "Idle-R",
      this.position.x,
      this.position.y,
      deltaTime
    );
  }
}
