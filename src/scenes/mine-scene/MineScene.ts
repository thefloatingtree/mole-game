import { Colors } from "../../constants/Colors";
import type { IScene } from "../../IScene";
import { Sprite } from "../../Sprite";
import { Block } from "./Block";
import { MineScenePlayerController } from "./MineScenePlayerController";

type Level = {
  meta: {
    width: number;
    height: number;
  },
  blocks: number[];
}

export class MineScene implements IScene {
  #playerSprite: Sprite | null = null;
  playerController = new MineScenePlayerController(this);
  blocks: Block[] = [];

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

    // Load level data
    const level1: Level = await fetch(new URL("/assets/data/mine-levels/1.json", import.meta.url).href)
      .then((response) => response.json());

    for (let i = 0; i < level1.blocks.length; i++) {
      const x = (i % level1.meta.width) * 32;
      const y = Math.floor(i / level1.meta.width) * 32;
      if (level1.blocks[i] === 1) {
        this.blocks.push(new Block({ x, y }));
      }
    }
  }

  update(deltaTime: number): void {
    this.playerController.update(deltaTime);

    for (const block of this.blocks) {
      block.update(deltaTime);
    }
  }

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    context.fillStyle = Colors.BLACK;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    this.playerController.draw(context, deltaTime);

    for (const block of this.blocks) {
      block.draw(context);
    }
  }

  destroy(): void { }
}
