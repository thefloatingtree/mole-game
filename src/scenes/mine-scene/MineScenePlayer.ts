import { Entity } from "../../Entity";
import { Game } from "../../Game";
import { checkCollisionAABB, resolveCollisionAABB } from "../../util/collision";
import { DebugColor, drawDebugRect } from "../../util/drawDebug";
import { lerp } from "../../util/lerp";
import { randomAtRate } from "../../util/random";
import type { MineScene } from "./MineScene";
import type { ItemType } from "./constants/ItemType";

export class MineScenePlayer extends Entity {
  readonly gravity = 0.001;
  readonly gravityAtPeakOfJump = 0.0003;
  readonly gravityWhileNotHoldingJump = 0.002;

  mineDirection: "horizontal" | "down" | "up" = "horizontal";

  inventory: Map<ItemType, { type: ItemType; quantity: number }> = new Map();
  position = { x: 0, y: 0 };
  velocity = { x: 0, y: 0 };
  miningTimer: number | null = null;
  walkingSoundTimer: number | null = null;

  isJumpDisabled = false;
  isAirborne = false;
  isFacing = { x: 1, y: 0 };
  isMoving = false;

  isDead = false;
  isDestroyed = false;

  upgrades = {
    pickaxeLevel: 1,
    hasBoots: false,
    hasLuckyCharm: false,
  };
  mineTickTime = 500;
  mineStrength = 1;
  speed = 0.03;
  jumpSpeed = 0.3;

  constructor(private scene: MineScene) {
    super();
  }

  init() {
    // Load upgrades
    this.upgrades.pickaxeLevel =
      Game.instance.state.get<number>("pickaxe-level") || 1;
    this.upgrades.hasBoots =
      Game.instance.state.get<boolean>("has-boots") || false;
    this.upgrades.hasLuckyCharm =
      Game.instance.state.get<boolean>("has-lucky-charm") || false;

    // Apply upgrades
    this.mineTickTime = lerp(500, 200, (this.upgrades.pickaxeLevel - 1) / 9);
    this.mineStrength = lerp(1, 5, (this.upgrades.pickaxeLevel - 1) / 9);
    if (this.upgrades.hasBoots) {
      this.speed *= 1.9;
      this.jumpSpeed *= 1.1;
    }
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
        x: this.position.x + 8 + this.isFacing.x * 3,
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
    const getQuantity = () => {
      if (!this.upgrades.hasLuckyCharm) return quantity;
      return randomAtRate([
        { value: 1, rate: 5 },
        { value: 2, rate: 2 },
        { value: 3, rate: 1 },
      ]);
    };
    const quantityToAdd = getQuantity();

    const existingItem = this.inventory.get(itemType);
    if (existingItem) {
      this.inventory.set(itemType, {
        type: itemType,
        quantity: existingItem.quantity + quantityToAdd,
      });
    } else {
      this.inventory.set(itemType, { type: itemType, quantity: quantityToAdd });
    }

    Game.instance.state.set(
      "player-inventory",
      Object.fromEntries(this.inventory)
    );
    Game.instance.events.dispatch(
      "log-message",
      `+${quantityToAdd} ${itemType}`,
      quantityToAdd > 1 ? { iconIndex: "13" } : { iconIndex: null }
    );
  }

  resolveCollisionWithEnvironment(): void {
    let anyBottomCollision = false;
    let selectedBlock = null;
    for (const block of this.scene.blockEntities) {
      if (
        !block.isIntangible &&
        checkCollisionAABB(this.collisionBox, block.collisionBox)
      ) {
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

    // Check player just landed
    if (anyBottomCollision && this.isAirborne) {
      Game.instance.events.dispatch("player-land");
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

        for (const block of this.scene.blockEntities) {
          block.isBeingMined = false;
        }
      }
    }

    if (!Game.instance.input.isDown("e")) return;

    const selectedBlock = this.scene.blockEntities.find(
      (block) => block.isSelected
    );
    if (!selectedBlock) return;

    if (
      !selectedBlock.isBeingMined &&
      this.miningTimer === null &&
      !this.isMoving
    ) {
      Game.instance.events.dispatch("player-start-mine-block", {
        block: selectedBlock,
      });
    }

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
    if (this.isDead || this.isDestroyed) return;

    this.isMoving = false;

    if (Game.instance.input.isPressed("b")) {
      this.scene.blockEntities.forEach(
        (block) => (block.shouldApplyGravity = true)
      );
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
      Game.instance.events.dispatch("player-jump");
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

    if (Game.instance.input.isDown("a") && Game.instance.input.isDown("d")) {
      this.isMoving = false;
    }

    // Hold down to mine beneath you
    if (Game.instance.input.isDown("s")) {
      this.mineDirection = "down";
    } else if (Game.instance.input.isDown("w")) {
      this.mineDirection = "up";
    } else {
      this.mineDirection = "horizontal";
    }

    
    const getGravity = () => {
      const isPeakOfJump = this.isAirborne && this.velocity.y < 0.01 && this.velocity.y > -0.01;
      if (!Game.instance.input.isDown("spacebar")) {
        return this.gravityWhileNotHoldingJump;
      }
      if (isPeakOfJump) {
        return this.gravityAtPeakOfJump;
      }
      return this.gravity;
    }

    this.velocity.y += getGravity() * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    this.resolveCollisionWithEnvironment();

    this.mineSelectedBlock();

    // Play walking sound at intervals when moving and not airborne
    if (this.isMoving && !this.isAirborne && !this.isDead) {
      if (this.walkingSoundTimer === null) {
        Game.instance.events.dispatch("player-walk");
        this.walkingSoundTimer = window.setInterval(() => {
          if (this.isDead) return;
          Game.instance.events.dispatch("player-walk");
        }, 400);
      }
    } else {
      if (this.walkingSoundTimer !== null) {
        clearInterval(this.walkingSoundTimer);
        this.walkingSoundTimer = null;
      }
    }
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
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.miningTimer) {
      clearInterval(this.miningTimer);
      this.miningTimer = null;
    }
    if (this.walkingSoundTimer) {
      clearInterval(this.walkingSoundTimer);
      this.walkingSoundTimer = null;
    }
  }
}
