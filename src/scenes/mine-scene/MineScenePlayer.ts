import { Entity } from "../../Entity";
import { Game } from "../../Game";
import { checkCollisionAABB, resolveCollisionAABB } from "../../util/collision";
import {
  DebugColor,
  drawDebugRect,
  drawDebugTextOverlay,
} from "../../util/drawDebug";
import type { MineScene } from "./MineScene";
import type { ItemType } from "./constants/ItemType";

export class MineScenePlayer extends Entity {
  readonly speed = 0.05;
  readonly jumpSpeed = 0.3;
  readonly gravity = 0.001;

  readonly mineTickTime = 250;
  readonly mineStrength = 1;
  mineDirection: "horizontal" | "down" | "up" = "horizontal";

  inventory: Map<ItemType, { type: ItemType; quantity: number }> = new Map();
  position = { x: 0, y: 0 };
  velocity = { x: 0, y: 0 };
  miningTimer: number | null = null;

  isJumpDisabled = false;
  isAirborne = false;
  isFacing = { x: 1, y: 0 };
  isMoving = false;

  isDead = false;

  constructor(private scene: MineScene) {
    super();
  }

  public get collisionBox() {
    return {
      x: this.position.x + 4,
      y: this.position.y + 4,
      vx: this.velocity.x,
      vy: this.velocity.y,
      width: 8,
      height: 12,
    };
  }

  public get selectionCollisionBox() {
    if (this.mineDirection === "down") {
      return {
        x: this.position.x + 8,
        y: this.position.y + 16,
        width: 1,
        height: 16,
      };
    }

    if (this.mineDirection === "up") {
      return {
        x: this.position.x + 8,
        y: this.position.y - 24,
        width: 1,
        height: 16,
      };
    }

    return {
      x: this.position.x + 12 * this.isFacing.x,
      y: this.position.y,
      width: 16,
      height: 1,
    };
  }

  addItemToInventory(itemType: ItemType, quantity: number): void {
    const existingItem = this.inventory.get(itemType);
    if (existingItem) {
      this.inventory.set(itemType, {
        type: itemType,
        quantity: existingItem.quantity + quantity,
      });
    } else {
      this.inventory.set(itemType, { type: itemType, quantity });
    }

    Game.instance.state.set(
      "player-inventory",
      Object.fromEntries(this.inventory)
    );
    Game.instance.events.dispatch("log-message", `+${quantity} ${itemType}`);
  }

  resolveCollisionWithEnvironment(): void {
    let anyBottomCollision = false;
    let selectedBlock = null;
    for (const block of this.scene.blocks) {
      if (checkCollisionAABB(this.collisionBox, block.collisionBox)) {
        const resolved = resolveCollisionAABB(
          this.collisionBox,
          block.collisionBox
        );

        // Ignore bottom collisions if moving upwards
        if (resolved.side === "bottom" && this.velocity.y < 0) {
          continue;
        }

        this.position.x = resolved.x - 4;
        this.position.y = resolved.y - 4;
        this.velocity.x = resolved.vx;
        this.velocity.y = resolved.vy;

        if (resolved.side === "bottom") anyBottomCollision = true;
      }
      // Death check
      if (block.deathCollisionBox && !this.isAirborne) {
        if (checkCollisionAABB(this.collisionBox, block.deathCollisionBox)) {
          this.isDead = true;
          Game.instance.events.dispatch("player-death");
        }
      }

      // Select check
      block.isSelected = false;
      if (
        !this.isAirborne &&
        checkCollisionAABB(this.selectionCollisionBox, block.collisionBox)
      ) {
        selectedBlock = block;
      }
    }
    this.isAirborne = !anyBottomCollision;

    if (selectedBlock) {
      selectedBlock.isSelected = true;
    }
  }

  mineSelectedBlock(): void {
    if (Game.instance.input.isReleased("e") || this.isMoving) {
      if (this.miningTimer) {
        clearInterval(this.miningTimer);
        this.miningTimer = null;

        for (const block of this.scene.blocks) {
          block.isBeingMined = false;
        }
      }
    }

    if (!Game.instance.input.isDown("e")) return;

    const selectedBlock = this.scene.blocks.find((block) => block.isSelected);
    if (!selectedBlock) return;

    selectedBlock.isBeingMined = true;

    // Mine the block at a fixed interval
    if (!this.miningTimer) {
      this.miningTimer = setInterval(() => {
        const drop = selectedBlock.mine(this.mineStrength);
        if (drop) this.addItemToInventory(drop.type, drop.quantity);
      }, this.mineTickTime);
    }
  }

  update(deltaTime: number): void {
    if (this.isDead) return;

    this.isMoving = false;

    if (Game.instance.input.isPressed("b")) {
      this.scene.blocks.forEach((block) => (block.shouldApplyGravity = true));
    }

    if (Game.instance.input.isReleased("spacebar")) {
      this.isJumpDisabled = false;
    }

    if (
      Game.instance.input.isDown("spacebar") &&
      !this.isAirborne &&
      !this.isJumpDisabled
    ) {
      this.velocity.y = -this.jumpSpeed;
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

    // Hold down to mine beneath you
    if (Game.instance.input.isDown("s")) {
      this.mineDirection = "down";
    } else if (Game.instance.input.isDown("w")) {
      this.mineDirection = "up";
    } else {
      this.mineDirection = "horizontal";
    }

    this.velocity.y += this.gravity * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    this.resolveCollisionWithEnvironment();

    this.mineSelectedBlock();
  }

  draw(context: CanvasRenderingContext2D, deltaTime: number): void {
    if (this.isDead) return;

    if (this.isAirborne) {
      this.scene.playerSprite?.drawAnimation(
        context,
        this.isFacing.x === -1 ? "Fall-L" : "Fall-R",
        this.cameraPosition.x,
        this.cameraPosition.y,
        deltaTime
      );
    } else if (this.isMoving) {
      this.scene.playerSprite?.drawAnimation(
        context,
        this.isFacing.x === -1 ? "Run-L" : "Run-R",
        this.cameraPosition.x,
        this.cameraPosition.y,
        deltaTime
      );
    } else {
      this.scene.playerSprite?.drawAnimation(
        context,
        this.isFacing.x === -1 ? "Idle-L" : "Idle-R",
        this.cameraPosition.x,
        this.cameraPosition.y,
        deltaTime
      );
    }

    drawDebugRect(this.collisionBox, DebugColor.BLUE);
    drawDebugRect(this.selectionCollisionBox, DebugColor.GREEN);

    // Draw player x/y position for debugging
    drawDebugTextOverlay(this.position.x.toString(), 10, 10);
    drawDebugTextOverlay(this.position.y.toString(), 10, 20);
  }
}
