import { Entity } from "../../Entity";
import { checkCollisionAABB, resolveCollisionAABB } from "../../util/collision";
import { BlockType } from "./constants/BlockType";
import { ItemType } from "./constants/ItemType";
import type { MineScene } from "./MineScene";

export class Block extends Entity {
  readonly gravity = 0.005;

  private id = crypto.randomUUID();

  private durabilityLookup: Record<BlockType, number> = {
    [BlockType.PLAYER_START]: 0,
    [BlockType.AIR]: 0,
    [BlockType.DIRT]: 6,
    [BlockType.STONE]: 20,
    [BlockType.COAL_ORE]: 6,
    [BlockType.IRON_ORE]: 9,
    [BlockType.EMERALD_ORE]: 12,
    [BlockType.DIAMOND_ORE]: 18,
    [BlockType.BEDROCK1]: Infinity,
    [BlockType.BEDROCK2]: Infinity,
    [BlockType.BEDROCK3]: Infinity,
    [BlockType.BEDROCK4]: Infinity,
    [BlockType.BEDROCK5]: Infinity,
    [BlockType.BEDROCK6]: Infinity,
    [BlockType.BEDROCK7]: Infinity,
    [BlockType.BEDROCK8]: Infinity,
    [BlockType.BEDROCK9]: Infinity,
  };
  private dropLookup: Record<
    BlockType,
    {
      type: ItemType;
      quantity: number;
    } | null
  > = {
    [BlockType.PLAYER_START]: null,
    [BlockType.AIR]: null,
    [BlockType.DIRT]: {
      type: ItemType.DIRT,
      quantity: 1,
    },
    [BlockType.STONE]: null,
    [BlockType.COAL_ORE]: {
      type: ItemType.COAL,
      quantity: 1,
    },
    [BlockType.IRON_ORE]: {
      type: ItemType.IRON,
      quantity: 1,
    },
    [BlockType.EMERALD_ORE]: {
      type: ItemType.EMERALD,
      quantity: 1,
    },
    [BlockType.DIAMOND_ORE]: {
      type: ItemType.DIAMOND,
      quantity: 1,
    },
    [BlockType.BEDROCK1]: null,
    [BlockType.BEDROCK2]: null,
    [BlockType.BEDROCK3]: null,
    [BlockType.BEDROCK4]: null,
    [BlockType.BEDROCK5]: null,
    [BlockType.BEDROCK6]: null,
    [BlockType.BEDROCK7]: null,
    [BlockType.BEDROCK8]: null,
    [BlockType.BEDROCK9]: null,
  };
  private get maxDurability() {
    return this.durabilityLookup[this.type];
  }

  public durability: number;
  public shouldDestroy = false;
  public isInteractable = true;
  public isSelected = false;
  public isBeingMined = false;
  public isAirborne = false;
  public shouldApplyGravity = false;

  velocity = { x: 0, y: 0 };

  constructor(
    private scene: MineScene,
    public position: { x: number; y: number },
    public type: BlockType
  ) {
    super();

    this.durability = this.maxDurability;
    this.shouldApplyGravity = this.type === BlockType.STONE;

    if (this.type >= BlockType.BEDROCK1 && this.type <= BlockType.BEDROCK9) {
      this.isInteractable = false;
    }
  }

  public get collisionBox() {
    return {
      x: this.position.x,
      y: this.position.y,
      vx: this.velocity.x,
      vy: this.velocity.y,
      width: 32,
      height: 32,
    };
  }

  public mine(amount: number): {
    type: ItemType;
    quantity: number;
  } | null {
    if (!this.isInteractable || this.shouldDestroy) return null;
    this.durability -= amount;
    if (this.durability <= 0) {
      this.shouldDestroy = true;
      return this.dropLookup[this.type];
    }
    return null;
  }

  resolveCollisionWithEnvironment(): void {
    let anyBottomCollision = false;
    for (const block of this.scene.blocks) {
      if (this.id === block.id) continue;

      if (checkCollisionAABB(this.collisionBox, block.collisionBox)) {
        const resolved = resolveCollisionAABB(
          this.collisionBox,
          block.collisionBox
        );

        this.position.x = resolved.x;
        this.position.y = resolved.y;
        this.velocity.x = resolved.vx;
        this.velocity.y = resolved.vy;

        if (resolved.side === "bottom") anyBottomCollision = true;
      }
    }

    if (this.isAirborne && anyBottomCollision) {
      this.scene.cameraShakeIntensity = 5;
      setTimeout(() => {
        this.scene.cameraShakeIntensity = 0;
      }, 150);
    }

    this.isAirborne = !anyBottomCollision;
  }

  // If a dirt block is is above an empty space and has no blocks to the sides, apply gravity
  attemptToShakeLoose() {
    if (!this.isInteractable) return;
    if (this.type !== BlockType.DIRT) return;

    const belowBlock = this.scene.blocks.find(
      (block) =>
        block.position.x === this.position.x &&
        block.position.y === this.position.y + 32
    );
    if (belowBlock && belowBlock.type !== BlockType.AIR) return;

    const leftBlock = this.scene.blocks.find(
      (block) =>
        block.position.x === this.position.x - 32 &&
        block.position.y === this.position.y
    );
    const rightBlock = this.scene.blocks.find(
      (block) =>
        block.position.x === this.position.x + 32 &&
        block.position.y === this.position.y
    );
    if (
      (leftBlock && leftBlock.type !== BlockType.AIR) ||
      (rightBlock && rightBlock.type !== BlockType.AIR)
    ) {
      return;
    }

    this.shouldApplyGravity = true;
  }

  update(deltaTime: number): void {
    if (!this.isInteractable) return;

    this.isSelected =
      !this.scene.playerEntity.isAirborne &&
      checkCollisionAABB(
        this.collisionBox,
        this.scene.playerEntity.selectionCollisionBox
      );

    // Apply gravity to stone blocks
    if (this.shouldApplyGravity) {
      this.velocity.y += this.gravity * deltaTime; // Gravity acceleration
      this.position.y += this.velocity.y;

      this.resolveCollisionWithEnvironment();
    } else {
      this.attemptToShakeLoose();
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    this.scene.environmentSprite?.drawFrame(
      context,
      (this.type - 1).toString(),
      this.cameraPosition.x,
      this.cameraPosition.y
    );

    if (!this.isInteractable) return;

    const durabilityPercentage = this.durability / this.maxDurability;
    let durabilitySprite = null;
    if (
      this.isSelected &&
      this.isBeingMined &&
      this.durability === this.maxDurability
    ) {
      durabilitySprite = "0";
    }
    if (durabilityPercentage >= 0.5 && durabilityPercentage < 1) {
      durabilitySprite = "1";
    }
    if (durabilityPercentage < 0.5) {
      durabilitySprite = "2";
    }

    if (durabilitySprite !== null) {
      this.scene.iconSprite?.drawFrame(
        context,
        durabilitySprite,
        this.cameraPosition.x,
        this.cameraPosition.y
      );
    }

    if (this.isSelected && !this.isBeingMined) {
      this.scene.iconSprite?.drawFrame(
        context,
        "3",
        this.cameraPosition.x,
        this.cameraPosition.y
      );
    } else if (this.isSelected && this.isBeingMined) {
      this.scene.iconSprite?.drawFrame(
        context,
        "0",
        this.cameraPosition.x,
        this.cameraPosition.y
      );
    }
  }
}
