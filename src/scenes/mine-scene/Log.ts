import { Easing } from "../../Animator";
import { Entity } from "../../Entity";
import { Game } from "../../Game";
import { drawText } from "../../util/drawText";
import type { MineScene } from "./MineScene";

export class Log extends Entity {
  readonly messageLifetime = 2500; // milliseconds

  message: string | null = null;
  iconIndex: string | null = null;

  position: { x: number; y: number };

  private fadeTimeout: number | null = null;

  constructor(public scene: MineScene, public origin = { x: 0, y: 0 }) {
    super();
    this.position = { x: origin.x, y: origin.y };
  }

  clearMessage() {
    this.message = null;
    this.iconIndex = null;
    this.position = { x: this.origin.x, y: this.origin.y };
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
  }

  onLogMessage(message: string, iconIndex: string | null) {
    this.clearMessage();
    this.message = message;
    this.iconIndex = iconIndex;
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
    Game.instance.events.subscribe("log-message", (message: string, data) =>
      this.onLogMessage(message, data?.iconIndex || null)
    );
  }

  update(deltaTime: number): void {}

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    drawText(
      context,
      Game.instance.defaultFontSprite,
      this.message || "",
      this.position.x,
      this.position.y
    );

    if (this.iconIndex && this.message) {
      this.scene.iconSprite?.drawFrame(
        context,
        this.iconIndex,
        this.position.x +
          Game.instance.defaultFontSprite.width * this.message.length +
          4,
        this.position.y - 14
      );
    }
  }
}
