import { Howl } from "howler";
import { Colors } from "../../constants/Colors";
import { Game } from "../../Game";
import type { IScene } from "../../IScene";
import { Sprite } from "../../Sprite";
import { drawText } from "../../util/drawText";
import { randomBetween } from "../../util/random";
import { DeathScene } from "../death-scene/DeathScene";
import { WinScene } from "../win-scene/WinScene";
import { Block } from "./Block";
import { BlockType } from "./constants/BlockType";
import { Lantern } from "./Lantern";
import { Log } from "./Log";
import { MineScenePlayer } from "./MineScenePlayer";
import { ShopScene } from "../shop-scene/ShopScene";
import { lerp } from "../../util/lerp";
import { LevelData } from "./constants/LevelData";
import { drawDebugText } from "../../util/drawDebug";

export class MineScene implements IScene {
  readonly cameraFollowSpeed = 0.005;
  readonly cameraLookAheadX = 15;
  readonly cameraLookAheadY = 24;
  readonly cameraHorizontalDeadZone = 80;

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
  public blockBreakAudio: Howl | null = null;
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

  levelIndex = 0;
  playerLanternLevel = 1;
  restartHoldTime = 0;

  async load() {
    this.levelIndex = Game.instance.state.get("level-index") || 0;
    this.playerLanternLevel =
      Game.instance.state.get<number>("lantern-level") || 1;

    const level = LevelData[this.levelIndex % LevelData.length];

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

    const lanternUpgradeDuration = lerp(
      0,
      60 * 1000,
      (this.playerLanternLevel - 1) / 9
    ); // Up to +60s for max lantern level
    this.levelTimeInMilliseconds =
      level.meta.baseLevelTimeInSeconds * 1000 + lanternUpgradeDuration;
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
    this.blockBreakAudio = new Howl({
      src: [new URL("/assets/audio/block-break.wav", import.meta.url).href],
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

    this.playerEntity.init();

    for (let i = 0; i < level.blocks.length; i++) {
      const x = (i % level.meta.width) * 32;
      const y = Math.floor(i / level.meta.width) * 32;
      const blockType = level.blocks[i];

      if (blockType === BlockType.PLAYER_START) {
        this.playerEntity.position.x = x;
        this.playerEntity.position.y = y;
        continue;
      }
      if (blockType === BlockType.AIR) continue;
      this.blockEntities.push(new Block(this, { x, y }, blockType));
    }

    this.logEntity = new Log(this, { x: 8, y: 165 });
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
      this.playerWalkAudio?.rate(randomBetween(1.3, 1.4));
      this.playerWalkAudio?.play();
    });

    Game.instance.events.subscribe("block-destroyed", () => {
      this.blockMinedAudio?.rate(1.2);
      this.blockMinedAudio?.play();
      this.blockBreakAudio?.play();
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
        this.exitLevel();
        return;
      }
    });

    if (this.playerLanternLevel > 1) {
      Game.instance.events.dispatch(
        "log-message",
        `+${Math.floor(lanternUpgradeDuration / 1000)} seconds`,
        { iconIndex: "11" }
      );
    }
  }

  getLevelTotalValue(): number {
    let totalValue = 0;
    for (const block of this.blockEntities) {
      totalValue += block.getValue();
    }
    return totalValue;
  }

  exitLevel() {
    Game.instance.state.set("level-index", this.levelIndex + 1);
    Game.instance.switchScene(new ShopScene());
    setTimeout(() => {
      new Howl({
        src: [new URL("/assets/audio/select.wav", import.meta.url).href],
        volume: 0.5,
      })
        .load()
        .play();
    }, 1);
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
    const camera = Game.instance.camera;
    const player = this.playerEntity;

    // Center camera on player
    const centerX =
      player.position.x + player.collisionBox.width / 2 - camera.width / 2;
    const centerY =
      player.position.y + player.collisionBox.height / 2 - camera.height / 2;

    // Apply look-ahead based on facing and mining direction
    const lookAheadX = this.cameraLookAheadX * player.isFacing.x;
    let lookAheadY = 0;
    if (player.mineDirection === "down") {
      lookAheadY = this.cameraLookAheadY;
    } else if (player.mineDirection === "up") {
      lookAheadY = -this.cameraLookAheadY;
    }

    // Calculate ideal target position
    const idealX = centerX + lookAheadX;
    const idealY = centerY + lookAheadY;

    // Only update horizontal target if player is outside the padding zone
    const deltaX = idealX - camera.x;
    if (Math.abs(deltaX) > this.cameraHorizontalDeadZone) {
      const sign = deltaX > 0 ? 1 : -1;
      this.#cameraTarget.x = idealX - sign * this.cameraHorizontalDeadZone;
    } else {
      this.#cameraTarget.x = camera.x;
    }

    // Vertical always follows smoothly
    this.#cameraTarget.y = idealY;

    // Smoothly move camera towards target
    const speed = this.cameraFollowSpeed * deltaTime;
    camera.x += (this.#cameraTarget.x - camera.x) * speed;
    camera.y += (this.#cameraTarget.y - camera.y) * speed;
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

    // Hold R to restart
    if (Game.instance.input.isDown("r")) {
      this.restartHoldTime += deltaTime;
      if (this.restartHoldTime >= 1000) {
        this.restartHoldTime = 0;

        Game.instance.switchScene(new MineScene());
      }
    } else {
      this.restartHoldTime = 0;
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

      // UI
      this.logEntity?.draw(context, deltaTime);

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

      const restartProgress = this.restartHoldTime / 1000;
      const numberOfHyphens = lerp(
        0,
        "Hold R to Restart".length,
        restartProgress
      );
      const restartString =
        numberOfHyphens > 0
          ? "Hold R to Restart\n" + "-".repeat(Math.floor(numberOfHyphens))
          : "Hold R to Restart";

      drawText(
        context,
        Game.instance.defaultFontSprite,
        restartString,
        212,
        context.canvas.height - 8 - 7,
        false
      );

      // Level indicator (top left corner)
      drawText(
        context,
        Game.instance.defaultFontSprite,
        `Level ${this.levelIndex + 1}`,
        10,
        10,
        false
      );
    });

    drawDebugText(`Level Value: $${this.getLevelTotalValue()}`, 0, 0);
  }

  destroy(): void {
    // clear all timeouts/intervals if any
    this.playerEntity.destroy();
  }
}
