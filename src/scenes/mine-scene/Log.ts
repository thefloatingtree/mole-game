import { Easing } from "../../Animator";
import { Entity } from "../../Entity";
import { Game } from "../../Game";
import type { Sprite } from "../../Sprite";
import { drawText } from "../../util/drawText";

export class Log extends Entity {
  readonly messageLifetime = 2500; // milliseconds

  message: string | null = null;
  position: { x: number; y: number };

  private fadeTimeout: number | null = null;

  constructor(public origin = { x: 0, y: 0 }, public fontSprite: Sprite) {
    super();
    this.position = { x: origin.x, y: origin.y };
  }

  clearMessage() {
    this.message = null;
    this.position = { x: this.origin.x, y: this.origin.y };
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
  }

  onLogMessage(message: string) {
    this.clearMessage();
    this.message = message;
    Game.instance.animator.animate({
      target: this.position,
      key: "y",
      from: this.position.y + 20,
      to: this.position.y,
      duration: 150,
      easing: Easing.easeOutQuad,
    });
    this.fadeTimeout = setTimeout(() => {
      Game.instance.animator.animate({
        target: this.position,
        key: "y",
        from: this.position.y,
        to: this.position.y + 20,
        duration: 150,
        easing: Easing.easeInQuad,
        onComplete: () => this.clearMessage(),
      });
    }, this.messageLifetime);
  }

  init() {
    Game.instance.events.subscribe("log-message", (message: string) =>
      this.onLogMessage(message)
    );
  }

  update(deltaTime: number): void {}

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    drawText(
      context,
      this.fontSprite,
      this.message || "",
      this.position.x,
      this.position.y
    );
  }
}
