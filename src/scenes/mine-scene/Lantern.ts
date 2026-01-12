import { Easing } from "../../Animator";
import { Colors } from "../../constants/Colors";
import { Entity } from "../../Entity";
import { Game } from "../../Game";
import { lerp } from "../../util/lerp";
import { randomIntBetween } from "../../util/random";
import type { MineScene } from "./MineScene";

export class Lantern extends Entity {
  position = { x: 0, y: 0 };
  positionOffset = { x: 0, y: 0 };
  targetPosition = { x: 0, y: 0 };
  maxSpeed = 0.05;
  speed = this.maxSpeed;
  maxShiftDirectionOffset = 24;
  currentSizeIndex = 0;
  nextSizeIndex = 0;
  shakeMagnitude = {
    x: 0,
    y: 0,
  };
  shakeTimer = 0;
  sizes = [
    "0", // Largest
    "0", 
    "0",
    "1",
    "1",
    "2",
    "3",
    "4",
    "4",
    "5",
    null,
  ];

  constructor(public scene: MineScene) {
    super();
  }

  init() {
    Game.instance.events.subscribe(
      "player-lantern-shake",
      (
        magnitude: { x: number; y: number },
        duration: number,
        speed: number
      ) => {
        this.shakeMagnitude = magnitude;
        this.speed = speed;
        setTimeout(() => {
          this.shakeMagnitude = { x: 0, y: 0 };
          this.speed = this.maxSpeed;
        }, duration);
      }
    );

    Game.instance.events.subscribe(
      "player-lantern-size-change",
      (sizeIndex) => {
        this.scene.playerLanternExtinguishAudio?.play();
        // Delay a bit to match sound effect
        setTimeout(() => {
          this.currentSizeIndex = sizeIndex;
        }, 500);
      }
    );

    Game.instance.animator.animate({
      target: this,
      key: "currentSizeIndex",
      from: 9,
      to: 2,
      duration: 2000,
      easing: Easing.easeInOutCubic,
      valueFilter: (value: number) => Math.round(value),
      onComplete: () => {
        this.currentSizeIndex = 0;
      },
    });
  }

  updateSizeIndex() {
    const levelTimePercentage =
      this.scene.levelTimeInMilliseconds /
      this.scene.maxLevelTimeInMilliseconds;

    const newSizeIndex = Math.min(
      this.sizes.length - 1,
      Math.floor(lerp(this.sizes.length - 1, 0, levelTimePercentage))
    );

    if (newSizeIndex !== this.nextSizeIndex) {
      // Check if sprite will actually change size, only play audio if it does
      if (this.sizes[newSizeIndex] !== this.sizes[this.nextSizeIndex]) {
        this.scene.playerLanternExtinguishAudio?.play();
      }

      this.nextSizeIndex = newSizeIndex;
      // Delay a bit to match sound effect
      setTimeout(() => {
        this.currentSizeIndex = this.nextSizeIndex;
      }, 500);
    }
  }

  getShiftDirectionOffset() {
    if (this.currentSizeIndex === 0) return this.maxShiftDirectionOffset;
    return (
      (this.maxShiftDirectionOffset *
        (this.sizes.length - this.currentSizeIndex)) /
      this.sizes.length
    );
  }

  update(deltaTime: number): void {
    if (!this.scene.playerLanternSprite) return;

    this.updateSizeIndex();

    // If shaking, apply random offset every 100ms
    if (this.shakeMagnitude.x !== 0 || this.shakeMagnitude.y !== 0) {
      this.shakeTimer += deltaTime;
      if (this.shakeTimer >= 50) {
        this.shakeTimer = 0;
        this.positionOffset.x = randomIntBetween(
          -this.shakeMagnitude.x,
          this.shakeMagnitude.x
        );
        this.positionOffset.y = randomIntBetween(
          -this.shakeMagnitude.y,
          this.shakeMagnitude.y
        );
      }
    } else {
      this.positionOffset.x = 0;
      this.positionOffset.y = 0;
      this.shakeTimer = 0;
    }

    // Shift target in players mine direction and falling back to player's facing direction
    const getMineDirectionOffset = () => {
      const direction = this.scene.playerEntity.mineDirection;
      if (direction === "up")
        return { x: 0, y: -this.getShiftDirectionOffset() };
      if (direction === "down")
        return { x: 0, y: this.getShiftDirectionOffset() };
      return {
        x: this.getShiftDirectionOffset() * this.scene.playerEntity.isFacing.x,
        y: this.sizes[this.currentSizeIndex] === "5" ? 8 : 0,
      };
    };

    this.targetPosition.x =
      this.scene.playerEntity.position.x -
      this.scene.playerLanternSprite.width / 2 +
      8 +
      getMineDirectionOffset().x +
      this.positionOffset.x;
    this.targetPosition.y =
      this.scene.playerEntity.position.y -
      this.scene.playerLanternSprite.height / 2 +
      getMineDirectionOffset().y +
      this.positionOffset.y;

    this.position.x += (this.targetPosition.x - this.position.x) * this.speed;
    this.position.y += (this.targetPosition.y - this.position.y) * this.speed;
  }

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    if (this.sizes[this.currentSizeIndex] === null) {
      // Fully cover up canvas to simulate lantern going out
      context.beginPath();
      context.fillStyle = Colors.BLACK;
      context.fillRect(
        0,
        0,
        Game.instance.camera.width,
        Game.instance.camera.height
      );
      context.closePath();
      return;
    }

    this.scene.playerLanternSprite?.drawFrame(
      context,
      this.sizes[this.currentSizeIndex]!,
      this.position.x - Game.instance.camera.x,
      this.position.y - Game.instance.camera.y
    );
  }
}
