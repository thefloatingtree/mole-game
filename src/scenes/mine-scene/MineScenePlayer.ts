import { Game } from "../../Game";
import { Entity } from "../../Entity";
import { checkCollisionAABB, resolveCollisionAABB } from "../../util/collision";
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

    Game.instance.events.dispatch("log-message", `+${quantity} ${itemType}`);
  }

  resolveCollisionWithEnvironment(): void {
    let anyBottomCollision = false;
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
    }
    this.isAirborne = !anyBottomCollision;
  }

  mineSelectedBlock(): void {
    if (Game.instance.input.isReleased("e")) {
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

        console.log(this.inventory);
      }, this.mineTickTime);
    }
  }

  update(deltaTime: number): void {
    this.isMoving = false;

    if (Game.instance.input.isPressed("b")) {
      this.scene.blocks.forEach(block => block.shouldApplyGravity = true)
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
    if (this.isAirborne) {
      this.scene.playerSprite?.drawAnimation(
        context,
        this.isFacing.x === -1 ? "Fall-L" : "Fall-R",
        this.cameraPosition.x,
        this.cameraPosition.y,
        deltaTime
      );
      return;
    }

    if (this.isMoving) {
      this.scene.playerSprite?.drawAnimation(
        context,
        this.isFacing.x === -1 ? "Run-L" : "Run-R",
        this.cameraPosition.x,
        this.cameraPosition.y,
        deltaTime
      );
      return;
    }

    this.scene.playerSprite?.drawAnimation(
      context,
      this.isFacing.x === -1 ? "Idle-L" : "Idle-R",
      this.cameraPosition.x,
      this.cameraPosition.y,
      deltaTime
    );

    // Debug: Draw selection box

    // context.strokeStyle = "red";
    // context.strokeRect(
    //   this.selectionCollisionBox.x - Game.instance.camera.x,
    //   this.selectionCollisionBox.y - Game.instance.camera.y,
    //   this.selectionCollisionBox.width,
    //   this.selectionCollisionBox.height
    // );
  }
}
