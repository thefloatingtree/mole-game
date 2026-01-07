import { Colors } from "../../constants/Colors";
import { Game } from "../../Game";
import type { IScene } from "../../IScene";
import { Sprite } from "../../Sprite";
import { Block } from "./Block";
import { BlockType } from "./constants/BlockType";
import { MineScenePlayer } from "./MineScenePlayer";

type Level = {
  meta: {
    width: number;
    height: number;
  };
  blocks: BlockType[];
};

export class MineScene implements IScene {
  readonly cameraFollowMargin = 60;
  readonly cameraFollowSpeed = 0.005;
  readonly cameraLookAhead = 15;

  #cameraVelocity = { x: 0, y: 0 };
  #cameraTarget = { x: 0, y: 0 };
  
  public cameraShakeIntensity = 0;

  public playerSprite: Sprite | null = null;
  public environmentSprite: Sprite | null = null;
  public iconSprite: Sprite | null = null;

  playerEntity = new MineScenePlayer(this);
  blocks: Block[] = [];

  async load() {
    this.playerSprite = await Sprite.load(
      new URL("/assets/sprites/player-sprite.png", import.meta.url).href,
      new URL("/assets/sprites/player-sprite.json", import.meta.url).href
    );
    this.environmentSprite = await Sprite.load(
      new URL("/assets/sprites/environment-sprite.png", import.meta.url).href,
      new URL("/assets/sprites/environment-sprite.json", import.meta.url).href
    );
    this.iconSprite = await Sprite.load(
      new URL("/assets/sprites/icon-sprite.png", import.meta.url).href,
      new URL("/assets/sprites/icon-sprite.json", import.meta.url).href
    );

    // Load level data
    const level1: Level = await fetch(
      new URL("/assets/data/mine-levels/1.json", import.meta.url).href
    ).then((response) => response.json());

    for (let i = 0; i < level1.blocks.length; i++) {
      const x = (i % level1.meta.width) * 32;
      const y = Math.floor(i / level1.meta.width) * 32;
      const blockType = level1.blocks[i];

      if (blockType === BlockType.PLAYER_START) {
        this.playerEntity.position.x = x;
        this.playerEntity.position.y = y;
        continue;
      }
      if (blockType === BlockType.AIR) continue;
      this.blocks.push(new Block(this, { x, y }, blockType));
    }
  }

  performShakeCamera() {
    if (!this.cameraShakeIntensity) {
      Game.instance.camera.xOffset = 0;
      Game.instance.camera.yOffset = 0;
      return;
    }

    const camera = Game.instance.camera;
    const randomDirection = Math.random() * Math.PI * 2;
    const randomDistance = Math.random() * this.cameraShakeIntensity;
    const randomX = Math.cos(randomDirection) * randomDistance;
    const randomY = Math.sin(randomDirection) * randomDistance;

    camera.xOffset = randomX;
    camera.yOffset = randomY;
  }

  performFollowCamera(deltaTime: number) {
    // Adjust camera to follow player if gets too close
    const camera = Game.instance.camera;
    const player = this.playerEntity;
    const margin = this.cameraFollowMargin;
    const lookAhead = this.cameraLookAhead;

    // Determine target position for camera based on player position, facing direction, and lookahead distance
    // Instead of centering on player, offset by lookAhead in facing direction
    this.#cameraTarget.x =
      player.position.x + player.collisionBox.width / 2 - camera.width / 2;
    this.#cameraTarget.y =
      player.position.y + player.collisionBox.height / 2 - camera.height / 2;

    this.#cameraTarget.x += lookAhead * player.isFacing.x;

    // If target is outside margin, move camera towards target
    if (this.#cameraTarget.x - camera.x > margin) {
      this.#cameraVelocity.x =
        (this.#cameraTarget.x - camera.x - margin) * this.cameraFollowSpeed;
    } else if (this.#cameraTarget.x - camera.x < -margin) {
      this.#cameraVelocity.x =
        (this.#cameraTarget.x - camera.x + margin) * this.cameraFollowSpeed;
    } else {
      this.#cameraVelocity.x = 0;
    }

    if (this.#cameraTarget.y - camera.y > margin) {
      this.#cameraVelocity.y =
        (this.#cameraTarget.y - camera.y - margin) * this.cameraFollowSpeed;
    } else if (this.#cameraTarget.y - camera.y < -margin) {
      this.#cameraVelocity.y =
        (this.#cameraTarget.y - camera.y + margin) * this.cameraFollowSpeed;
    } else {
      this.#cameraVelocity.y = 0;
    }

    camera.x += this.#cameraVelocity.x * deltaTime;
    camera.y += this.#cameraVelocity.y * deltaTime;
  }

  update(deltaTime: number): void {
    this.playerEntity.update(deltaTime);

    for (const block of this.blocks) {
      block.update(deltaTime);
    }

    for (const block of this.blocks) {
      if (block.shouldDestroy) {
        this.blocks.splice(this.blocks.indexOf(block), 1);
      }
    }

    if (Game.instance.input.isDown("arrowright")) {
      Game.instance.camera.x += 0.1 * deltaTime;
    } else if (Game.instance.input.isDown("arrowleft")) {
      Game.instance.camera.x -= 0.1 * deltaTime;
    } else if (Game.instance.input.isDown("arrowdown")) {
      Game.instance.camera.y += 0.1 * deltaTime;
    } else if (Game.instance.input.isDown("arrowup")) {
      Game.instance.camera.y -= 0.1 * deltaTime;
    }
  }

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    this.performFollowCamera(deltaTime);
    this.performShakeCamera();

    context.fillStyle = Colors.BLACK;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    this.playerEntity.draw(context, deltaTime);

    for (const block of this.blocks) {
      block.draw(context);
    }
  }

  destroy(): void {}
}
