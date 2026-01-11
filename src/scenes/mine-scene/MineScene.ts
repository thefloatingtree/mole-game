import { Howl } from "howler";
import { Colors } from "../../constants/Colors";
import { Game } from "../../Game";
import type { IScene } from "../../IScene";
import { Sprite } from "../../Sprite";
import { drawText } from "../../util/drawText";
import { randomBetween } from "../../util/random";
import { DeathScene } from "../death-scene/DeathScene";
import { MainMenuScene } from "../main-menu-scene/MainMenuScene";
import { WinScene } from "../win-scene/WinScene";
import { Block } from "./Block";
import { BlockType } from "./constants/BlockType";
import { Lantern } from "./Lantern";
import { Log } from "./Log";
import { MineScenePlayer } from "./MineScenePlayer";
import { ShopScene } from "../shop-scene/ShopScene";

type Level = {
  meta: {
    width: number;
    height: number;
    baseLevelTimeInSeconds: number;
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
  public playerLanternSprite: Sprite | null = null;
  public environmentSprite: Sprite | null = null;
  public iconSprite: Sprite | null = null;
  public transitionsSprite: Sprite | null = null;

  public blockStartFallAudio: Howl | null = null;
  public blockLandedAudio: Howl | null = null;
  public blockMinedAudio: Howl | null = null;
  public playerJumpAudio: Howl | null = null;
  public playerWalkAudio: Howl | null = null;
  public playerLanternExtinguishAudio: Howl | null = null;

  public maxLevelTimeInMilliseconds = 0;
  public levelTimeInMilliseconds = 0;

  private haltScene = false;

  playerEntity = new MineScenePlayer(this);
  playerLanternEntity = new Lantern(this);
  blockEntities: Block[] = [];
  logEntity: Log | null = null;

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
    this.transitionsSprite = await Sprite.load(
      new URL("/assets/sprites/transitions-sprite.png", import.meta.url).href,
      new URL("/assets/sprites/transitions-sprite.json", import.meta.url).href
    );
    this.playerLanternSprite = await Sprite.load(
      new URL("/assets/sprites/lantern-sprite.png", import.meta.url).href,
      new URL("/assets/sprites/lantern-sprite.json", import.meta.url).href
    );

    // Load level data
    const level1: Level = await fetch(
      new URL("/assets/data/mine-levels/1.json", import.meta.url).href
    ).then((response) => response.json());

    this.levelTimeInMilliseconds = level1.meta.baseLevelTimeInSeconds * 1000;
    this.maxLevelTimeInMilliseconds = this.levelTimeInMilliseconds;

    // Load audio
    this.blockStartFallAudio = new Howl({
      src: [new URL("/assets/audio/block-gravity.wav", import.meta.url).href],
    }).load();
    this.blockLandedAudio = new Howl({
      src: [new URL("/assets/audio/block-land.wav", import.meta.url).href],
    }).load();
    this.blockMinedAudio = new Howl({
      src: [new URL("/assets/audio/pickaxe.wav", import.meta.url).href],
    }).load();
    this.playerJumpAudio = new Howl({
      src: [new URL("/assets/audio/jump.wav", import.meta.url).href],
    }).load();
    this.playerWalkAudio = new Howl({
      src: [new URL("/assets/audio/walk.wav", import.meta.url).href],
    }).load();
    this.playerLanternExtinguishAudio = new Howl({
      src: [new URL("/assets/audio/extinguish.wav", import.meta.url).href],
    }).load();

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
      this.blockEntities.push(new Block(this, { x, y }, blockType));
    }

    this.logEntity = new Log({ x: 8, y: 165 });
    this.logEntity.init();

    this.playerLanternEntity.init();

    Game.instance.events.subscribe("player-death", () => {
      setTimeout(() => {
        Game.instance.switchScene(new DeathScene());
      }, 1000);
    });

    Game.instance.events.subscribe("block-start-fall", () => {
      this.blockStartFallAudio?.play();
    });

    Game.instance.events.subscribe("block-landed", () => {
      this.blockLandedAudio?.play();
      Game.instance.events.dispatch(
        "player-lantern-shake",
        { x: 12, y: 12 },
        200,
        0.15
      );
    });

    Game.instance.events.subscribe("block-mined", () => {
      this.blockMinedAudio?.rate(randomBetween(0.95, 1.05));
      this.blockMinedAudio?.play();
      Game.instance.events.dispatch(
        "player-lantern-shake",
        { x: 6, y: 6 },
        150,
        0.17
      );
    });

    Game.instance.events.subscribe("player-start-mine-block", () => {
      this.blockMinedAudio?.rate(randomBetween(0.95, 1.05));
      this.blockMinedAudio?.play();
    });

    Game.instance.events.subscribe("player-jump", () => {
      this.playerJumpAudio?.volume(0.4);
      this.playerJumpAudio?.play();
    });

    Game.instance.events.subscribe("player-walk", () => {
      this.playerWalkAudio?.volume(0.2);
      this.playerWalkAudio?.rate(randomBetween(1.3, 1.35));
      this.playerWalkAudio?.play();
    });

    Game.instance.events.subscribe("block-destroyed", () => {
      this.blockMinedAudio?.rate(1.2);
      this.blockMinedAudio?.play();
    });

    Game.instance.events.subscribe("block-clicked", ({ block }) => {
      console.log("Block clicked:", block);
      if (block.type === BlockType.TREASURE_CHEST) {
        Game.instance.switchScene(new WinScene());
        setTimeout(() => {
          new Howl({
            src: [new URL("/assets/audio/select.wav", import.meta.url).href],
            volume: 0.5,
          })
            .load()
            .play();
        }, 1);
        return;
      }
      if (block.type === BlockType.EXIT) {
        Game.instance.switchScene(new ShopScene());
        setTimeout(() => {
          new Howl({
            src: [new URL("/assets/audio/select.wav", import.meta.url).href],
            volume: 0.5,
          })
            .load()
            .play();
        }, 1);
        return;
      }
    });
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
    if (this.haltScene) return;

    this.levelTimeInMilliseconds -= deltaTime;
    if (this.levelTimeInMilliseconds <= 0) {
      this.levelTimeInMilliseconds = 0;
      Game.instance.events.dispatch("player-death");
      this.haltScene = true;
    }

    this.playerEntity.update(deltaTime);
    this.playerLanternEntity.update(deltaTime);
    this.logEntity?.update(deltaTime);

    for (const block of this.blockEntities) {
      block.update(deltaTime);
    }

    for (const block of this.blockEntities) {
      if (block.shouldDestroy) {
        this.blockEntities.splice(this.blockEntities.indexOf(block), 1);
      }
    }
  }

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    this.performFollowCamera(deltaTime);
    this.performShakeCamera();

    context.fillStyle = Colors.BLACK;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    for (const block of this.blockEntities) {
      if (!block.isIntangible) continue;
      block.draw(context);
    }

    this.playerEntity.draw(context, deltaTime);

    for (const block of this.blockEntities) {
      if (block.isIntangible) continue;
      block.draw(context);
    }

    Game.instance.deferDraw(() => {
      this.playerLanternEntity.draw(context, deltaTime);

      // UI
      this.logEntity?.draw(context, deltaTime);
      this.transitionsSprite?.drawTiledAnimation(
        context,
        "FadeIn",
        0,
        0,
        40,
        24,
        deltaTime,
        false,
        1.25
      );

      // Draw lantern timer (1:23 format, top-right corner)
      const totalSeconds = Math.ceil(this.levelTimeInMilliseconds / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const timeString = `Lantern ${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;

      drawText(
        context,
        Game.instance.defaultFontSprite,
        timeString,
        context.canvas.width - 80,
        10,
        false
      );
    });
  }

  destroy(): void {}
}
