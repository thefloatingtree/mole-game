import { Colors } from "../../constants/Colors";
import { Game } from "../../Game";
import type { IScene } from "../../IScene";
import { Sprite } from "../../Sprite";
import { drawRect } from "../../util/draw";
import { drawDebugPoint } from "../../util/drawDebug";
import { drawText } from "../../util/drawText";
import { ItemPrice } from "../mine-scene/constants/ItemPrice";
import { ItemType } from "../mine-scene/constants/ItemType";
import {
  UpgradePrice,
  UpgradePriceScaleFactor,
} from "../mine-scene/constants/UpgradePrice";
import { UpgradeType } from "../mine-scene/constants/UpgradeType";
import { MineScene } from "../mine-scene/MineScene";

// Three sections: Sell, Buy, Continue
// Sell: Shows player's inventory with option to sell items
// Buy: Shows items available for purchase
// Continue: Proceed to next level
// Also shows player's current gold amount at the top

export class ShopScene implements IScene {
  playersInventory: Map<ItemType, { type: ItemType; quantity: number }> =
    new Map();
  playerGold: number = 0;

  iconSprite: Sprite | null = null;
  environmentSprite: Sprite | null = null;

  selectAudio: Howl | null = null;
  acceptAudio: Howl | null = null;
  transactionAudio: Howl | null = null;
  transactionFailAudio: Howl | null = null;

  sellElement: UIElement<void> | null = null;
  buyElement: UIElement<void> | null = null;
  continueElement: UIElement<void> | null = null;

  sellCoalElement: UIElement<void> | null = null;
  sellIronElement: UIElement<void> | null = null;
  sellEmeraldElement: UIElement<void> | null = null;
  sellDiamondElement: UIElement<void> | null = null;

  buyPickaxeUpgradeElement: UIElement<void> | null = null;
  buyLanternUpgradeElement: UIElement<void> | null = null;
  buyBootsElement: UIElement<void> | null = null;
  buyLuckyCharmElement: UIElement<void> | null = null;

  sectionSelection: "sell" | "buy" | "continue" = "sell";
  sellSelection: ItemType | null = null;
  buySelection: UpgradeType | null = null;

  trySellSelectedItem() {
    if (!this.sellSelection) return;

    const item = this.playersInventory.get(this.sellSelection);

    if (item && item.quantity > 0) {
      const price = ItemPrice[this.sellSelection];
      item.quantity--;
      this.playerGold = Math.min(this.playerGold + price, 999);
      Game.instance.state.set("player-gold", this.playerGold);
      Game.instance.state.set(
        "player-inventory",
        Object.fromEntries(this.playersInventory)
      );
      this.transactionAudio?.play();
    } else {
      this.transactionFailAudio?.play();
    }
  }

  getPriceForUpgrade(upgradeType: UpgradeType): number {
    const basePrice = UpgradePrice[upgradeType];

    switch (upgradeType) {
      case "pickaxe-upgrade": {
        const currentLevel =
          Game.instance.state.get<number>("pickaxe-level") || 1;
        return Math.floor(
          basePrice * Math.pow(UpgradePriceScaleFactor, currentLevel - 1)
        );
      }
      case "lantern-upgrade": {
        const currentLevel =
          Game.instance.state.get<number>("lantern-level") || 1;
        return Math.floor(
          basePrice * Math.pow(UpgradePriceScaleFactor, currentLevel - 1)
        );
      }
      case "lucky-charm":
      case "boots":
        return basePrice;
      default:
        return basePrice;
    }
  }

  tryBuySelectedItem() {
    if (!this.buySelection) return;

    const price = this.getPriceForUpgrade(this.buySelection);

    if (this.playerGold >= price) {
      this.playerGold -= price;
      Game.instance.state.set("player-gold", this.playerGold);
      // Apply the upgrade
      switch (this.buySelection) {
        case "pickaxe-upgrade":
          {
            const currentLevel =
              Game.instance.state.get<number>("pickaxe-level") || 1;
            Game.instance.state.set("pickaxe-level", currentLevel + 1);
          }
          break;
        case "lantern-upgrade":
          {
            const currentLevel =
              Game.instance.state.get<number>("lantern-level") || 1;
            Game.instance.state.set("lantern-level", currentLevel + 1);
          }
          break;
        case "lucky-charm":
          Game.instance.state.set("has-lucky-charm", true);
          break;
        case "boots":
          Game.instance.state.set("has-boots", true);
          break;
      }

      this.transactionAudio?.play();
    } else {
      this.transactionFailAudio?.play();
    }
  }

  continueToNextLevel() {
    Game.instance.switchScene(new MineScene());
  }

  async load() {
    // Load from global game state

    this.playerGold = Math.min(
      Game.instance.state.get<number>("player-gold") || 0,
      999
    );

    const inventory =
      Game.instance.state.get<
        Record<ItemType, { type: ItemType; quantity: number }>
      >("player-inventory");

    if (inventory) {
      for (const [itemType, item] of Object.entries(inventory)) {
        this.playersInventory.set(itemType as ItemType, item);
      }
    }

    // Load assets

    this.iconSprite = await Sprite.load(
      new URL("/assets/sprites/icon-sprite.png", import.meta.url).href,
      new URL("/assets/sprites/icon-sprite.json", import.meta.url).href
    );

    this.environmentSprite = await Sprite.load(
      new URL("/assets/sprites/environment-sprite.png", import.meta.url).href,
      new URL("/assets/sprites/environment-sprite.json", import.meta.url).href
    );

    this.selectAudio = new Howl({
      src: [new URL("/assets/audio/walk.wav", import.meta.url).href],
      volume: 0.1,
    });
    this.acceptAudio = new Howl({
      src: [new URL("/assets/audio/select.wav", import.meta.url).href],
      volume: 0.5,
    });
    this.transactionAudio = new Howl({
      src: [new URL("/assets/audio/transaction.wav", import.meta.url).href],
      volume: 0.5,
    });
    this.transactionFailAudio = new Howl({
      src: [
        new URL("/assets/audio/transaction-fail.wav", import.meta.url).href,
      ],
      volume: 0.5,
    });

    // Set up UI elements

    const headerXOffset = -80;
    const headerYOffset = 12;

    this.sellElement = new UIElement<void>(
      "sell",
      Game.instance.camera.centerX - 64 + headerXOffset,
      headerYOffset,
      (_, position) => {
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          this.sectionSelection === "sell" ? "[Sell]" : "Sell",
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "5",
          position.x,
          position.y
        );
      },
      () => {
        this.sellSelection = null;
        this.sectionSelection = "sell";
        this.selectAudio?.play();
      },
      () => {}
    );
    this.sellElement.setSelected(true, false);

    this.buyElement = new UIElement<void>(
      "buy",
      Game.instance.camera.centerX + headerXOffset,
      headerYOffset,
      (_, position) => {
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          this.sectionSelection === "buy" ? "[Buy]" : "Buy",
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "5",
          position.x,
          position.y
        );
      },
      () => {
        this.sectionSelection = "buy";
        this.selectAudio?.play();
      },
      () => {}
    );

    this.continueElement = new UIElement<void>(
      "continue",
      Game.instance.camera.centerX + 64 + headerXOffset,
      headerYOffset,
      (_, position) => {
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          "Continue",
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "4",
          position.x,
          position.y
        );
      },
      (() => {
        this.sectionSelection = "continue";
        this.selectAudio?.play();
      }).bind(this),
      () => {
        this.continueToNextLevel();
      }
    );

    // UI Sell Section

    const sellSectionXOffset = 16;
    const sellSectionYOffset = 16;
    const sellItemSpacing = 16;

    this.sellCoalElement = new UIElement<void>(
      "sell-coal",
      sellSectionXOffset,
      48 + sellSectionYOffset + sellItemSpacing * 0,
      (_, position) => {
        const item = this.playersInventory.get(ItemType.COAL);
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          `Coal: ${item ? item.quantity : 0}`,
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "4",
          position.x,
          position.y
        );
      },
      () => {
        this.sellSelection = ItemType.COAL;
        this.selectAudio?.play();
      },
      () => {
        this.trySellSelectedItem();
      }
    );

    this.sellIronElement = new UIElement<void>(
      "sell-iron",
      sellSectionXOffset,
      48 + sellSectionYOffset + sellItemSpacing * 1,
      (_, position) => {
        const item = this.playersInventory.get(ItemType.IRON);
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          `Iron: ${item ? item.quantity : 0}`,
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "4",
          position.x,
          position.y
        );
      },
      () => {
        this.sellSelection = ItemType.IRON;
        this.selectAudio?.play();
      },
      () => {
        this.trySellSelectedItem();
      }
    );

    this.sellEmeraldElement = new UIElement<void>(
      "sell-emerald",
      sellSectionXOffset,
      48 + sellSectionYOffset + sellItemSpacing * 2,
      (_, position) => {
        const item = this.playersInventory.get(ItemType.EMERALD);
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          `Emerald: ${item ? item.quantity : 0}`,
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "4",
          position.x,
          position.y
        );
      },
      () => {
        this.sellSelection = ItemType.EMERALD;
        this.selectAudio?.play();
      },
      () => {
        this.trySellSelectedItem();
      }
    );

    this.sellDiamondElement = new UIElement<void>(
      "sell-diamond",
      sellSectionXOffset,
      48 + sellSectionYOffset + sellItemSpacing * 3,
      (_, position) => {
        const item = this.playersInventory.get(ItemType.DIAMOND);
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          `Diamond: ${item ? item.quantity : 0}`,
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "4",
          position.x,
          position.y
        );
      },
      () => {
        this.sellSelection = ItemType.DIAMOND;
        this.selectAudio?.play();
      },
      () => {
        this.trySellSelectedItem();
      }
    );

    // Buy Section

    const buySectionXOffset = 16;
    const buySectionYOffset = 16;
    const buyItemSpacing = 16;

    this.buyPickaxeUpgradeElement = new UIElement<void>(
      "buy-pickaxe",
      buySectionXOffset,
      48 + buySectionYOffset + buyItemSpacing * 0,
      (_, position) => {
        const currentLevel =
          Game.instance.state.get<number>("pickaxe-level") || 1;
        const price = this.getPriceForUpgrade(UpgradeType.PICKAXE_UPGRADE);
        const isMaxed = currentLevel >= 9;
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          isMaxed ? "Pickaxe: MAX" : `Pickaxe Lv.${currentLevel}: $${price}`,
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "4",
          position.x,
          position.y
        );
      },
      () => {
        this.buySelection = UpgradeType.PICKAXE_UPGRADE;
        this.selectAudio?.play();
      },
      () => {
        const currentLevel =
          Game.instance.state.get<number>("pickaxe-level") || 1;
        if (currentLevel >= 9) {
          this.transactionFailAudio?.play();
        } else {
          this.tryBuySelectedItem();
        }
      }
    );

    this.buyLanternUpgradeElement = new UIElement<void>(
      "buy-lantern",
      buySectionXOffset,
      48 + buySectionYOffset + buyItemSpacing * 1,
      (_, position) => {
        const currentLevel =
          Game.instance.state.get<number>("lantern-level") || 1;
        const price = this.getPriceForUpgrade(UpgradeType.LANTERN_UPGRADE);
        const isMaxed = currentLevel >= 9;
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          isMaxed ? "Lantern: MAX" : `Lantern Lv.${currentLevel}: $${price}`,
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "4",
          position.x,
          position.y
        );
      },
      () => {
        this.buySelection = UpgradeType.LANTERN_UPGRADE;
        this.selectAudio?.play();
      },
      () => {
        const currentLevel =
          Game.instance.state.get<number>("lantern-level") || 1;
        if (currentLevel >= 9) {
          this.transactionFailAudio?.play();
        } else {
          this.tryBuySelectedItem();
        }
      }
    );

    this.buyBootsElement = new UIElement<void>(
      "buy-boots",
      buySectionXOffset,
      48 + buySectionYOffset + buyItemSpacing * 2,
      (_, position) => {
        const hasBoots = Game.instance.state.get<boolean>("has-boots") || false;
        const price = this.getPriceForUpgrade(UpgradeType.BOOTS);
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          hasBoots ? "Boots: Owned" : `Boots: $${price}`,
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "4",
          position.x,
          position.y
        );
      },
      () => {
        this.buySelection = UpgradeType.BOOTS;
        this.selectAudio?.play();
      },
      () => {
        const hasBoots = Game.instance.state.get<boolean>("has-boots") || false;
        if (!hasBoots) {
          this.tryBuySelectedItem();
        } else {
          this.transactionFailAudio?.play();
        }
      }
    );

    this.buyLuckyCharmElement = new UIElement<void>(
      "buy-lucky-charm",
      buySectionXOffset,
      48 + buySectionYOffset + buyItemSpacing * 3,
      (_, position) => {
        const hasLuckyCharm =
          Game.instance.state.get<boolean>("has-lucky-charm") || false;
        const price = this.getPriceForUpgrade(UpgradeType.LUCKY_CHARM);
        drawText(
          Game.instance.context,
          Game.instance.defaultFontSprite,
          hasLuckyCharm ? "Lucky Charm: Owned" : `Lucky Charm: $${price}`,
          position.x,
          position.y
        );
      },
      (_, position) => {
        this.iconSprite?.drawFrame(
          Game.instance.context,
          "4",
          position.x,
          position.y
        );
      },
      () => {
        this.buySelection = UpgradeType.LUCKY_CHARM;
        this.selectAudio?.play();
      },
      () => {
        const hasLuckyCharm =
          Game.instance.state.get<boolean>("has-lucky-charm") || false;
        if (!hasLuckyCharm) {
          this.tryBuySelectedItem();
        } else {
          this.transactionFailAudio?.play();
        }
      }
    );

    // UI Navigation

    // Header Section
    {
      UIElement.createKeyboardLink({
        from: this.sellElement,
        to: this.buyElement,
        direction: "right",
      });

      UIElement.createKeyboardLink({
        from: this.buyElement,
        to: this.continueElement,
        direction: "right",
      });

      UIElement.createKeyboardLink({
        from: this.continueElement,
        to: this.sellElement,
        direction: "right",
      });
    }

    // Sell Section
    {
      UIElement.createKeyboardLink({
        from: this.sellElement,
        to: this.sellCoalElement,
        direction: "down",
      });

      UIElement.createKeyboardLink({
        from: this.sellCoalElement,
        to: this.sellIronElement,
        direction: "down",
      });

      UIElement.createKeyboardLink({
        from: this.sellIronElement,
        to: this.sellEmeraldElement,
        direction: "down",
      });

      UIElement.createKeyboardLink({
        from: this.sellEmeraldElement,
        to: this.sellDiamondElement,
        direction: "down",
      });

      UIElement.createKeyboardLink({
        from: this.sellDiamondElement,
        to: this.sellElement,
        direction: "down",
      });
    }

    // Buy Section
    {
      UIElement.createKeyboardLink({
        from: this.buyElement,
        to: this.buyPickaxeUpgradeElement,
        direction: "down",
      });

      UIElement.createKeyboardLink({
        from: this.buyPickaxeUpgradeElement,
        to: this.buyLanternUpgradeElement,
        direction: "down",
      });

      UIElement.createKeyboardLink({
        from: this.buyLanternUpgradeElement,
        to: this.buyBootsElement,
        direction: "down",
      });

      UIElement.createKeyboardLink({
        from: this.buyBootsElement,
        to: this.buyLuckyCharmElement,
        direction: "down",
      });

      UIElement.createKeyboardLink({
        from: this.buyLuckyCharmElement,
        to: this.buyElement,
        direction: "down",
      });
    }
  }

  update(_deltaTime: number): void {
    this.sellElement?.update();

    Game.instance.camera.x = 0;
    Game.instance.camera.y = 0;

    if (this.sectionSelection === "sell") {
      this.sellCoalElement?.update();
      this.sellIronElement?.update();
      this.sellEmeraldElement?.update();
      this.sellDiamondElement?.update();
    }

    this.buyElement?.update();

    if (this.sectionSelection === "buy") {
      this.buyPickaxeUpgradeElement?.update();
      this.buyLanternUpgradeElement?.update();
      this.buyBootsElement?.update();
      this.buyLuckyCharmElement?.update();
    }

    this.continueElement?.update();
  }

  draw(context: CanvasRenderingContext2D, _deltaTime: number): void {
    context.beginPath();
    context.fillStyle = Colors.BLACK;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.closePath();

    this.sellElement?.draw(undefined);

    if (this.sectionSelection === "sell") {
      this.sellCoalElement?.draw(undefined);
      this.sellIronElement?.draw(undefined);
      this.sellEmeraldElement?.draw(undefined);
      this.sellDiamondElement?.draw(undefined);

      drawText(
        context,
        Game.instance.defaultFontSprite,
        "Your Inventory\n--------------",
        28,
        40
      );

      const previewOffsetX = 86;
      const previewOffsetY = 0;

      drawText(
        context,
        Game.instance.defaultFontSprite,
        "Select an item to sell from your inventory",
        Game.instance.camera.centerX,
        context.canvas.height - 16,
        true
      );

      drawRect(
        context,
        Game.instance.camera.centerX + previewOffsetX - 40,
        Game.instance.camera.centerY + previewOffsetY - 40,
        80,
        80,
        Colors.TRANSPARENT,
        Colors.WHITE
      );

      if (this.sellSelection) {
        const iconLookup: Record<ItemType, string> = {
          [ItemType.DIRT]: "0",
          [ItemType.COAL]: "6",
          [ItemType.IRON]: "7",
          [ItemType.EMERALD]: "8",
          [ItemType.DIAMOND]: "9",
        };

        this.iconSprite?.drawFrame(
          context,
          iconLookup[this.sellSelection],
          Game.instance.camera.centerX + previewOffsetX - 16,
          Game.instance.camera.centerY + previewOffsetY - 16 - 12
        );

        drawText(
          context,
          Game.instance.defaultFontSprite,
          `Sell ${this.sellSelection}\nfor $${ItemPrice[this.sellSelection]}`,
          Game.instance.camera.centerX + previewOffsetX,
          Game.instance.camera.centerY + previewOffsetY + 4,
          true
        );
      } else {
        this.iconSprite?.drawFrame(
          context,
          "3",
          Game.instance.camera.centerX + previewOffsetX - 16,
          Game.instance.camera.centerY + previewOffsetY - 16
        );
      }
    }

    this.buyElement?.draw(undefined);

    if (this.sectionSelection === "buy") {
      this.buyPickaxeUpgradeElement?.draw(undefined);
      this.buyLanternUpgradeElement?.draw(undefined);
      this.buyBootsElement?.draw(undefined);
      this.buyLuckyCharmElement?.draw(undefined);

      drawText(
        context,
        Game.instance.defaultFontSprite,
        "Upgrades\n--------",
        28,
        40
      );

      const previewOffsetX = 86;
      const previewOffsetY = 0;

      drawText(
        context,
        Game.instance.defaultFontSprite,
        "Select an upgrade to purchase",
        Game.instance.camera.centerX,
        context.canvas.height - 16,
        true
      );

      drawRect(
        context,
        Game.instance.camera.centerX + previewOffsetX - 40,
        Game.instance.camera.centerY + previewOffsetY - 40,
        80,
        80,
        Colors.TRANSPARENT,
        Colors.WHITE
      );

      if (this.buySelection) {
        const iconLookup: Record<UpgradeType, string> = {
          [UpgradeType.PICKAXE_UPGRADE]: "10",
          [UpgradeType.LANTERN_UPGRADE]: "11",
          [UpgradeType.BOOTS]: "12",
          [UpgradeType.LUCKY_CHARM]: "13",
        };

        const descriptionLookup: Record<UpgradeType, string> = {
          [UpgradeType.PICKAXE_UPGRADE]: "Mine faster",
          [UpgradeType.LANTERN_UPGRADE]: "Mine longer",
          [UpgradeType.BOOTS]: "Move faster",
          [UpgradeType.LUCKY_CHARM]: "Chance for\n bonus gems",
        };

        this.iconSprite?.drawFrame(
          context,
          iconLookup[this.buySelection],
          Game.instance.camera.centerX + previewOffsetX - 16,
          Game.instance.camera.centerY + previewOffsetY - 16 - 12
        );

        const price = this.getPriceForUpgrade(this.buySelection);
        drawText(
          context,
          Game.instance.defaultFontSprite,
          `${descriptionLookup[this.buySelection]}
$${price}`,
          Game.instance.camera.centerX + previewOffsetX,
          Game.instance.camera.centerY + previewOffsetY + 4,
          true
        );
      } else {
        this.iconSprite?.drawFrame(
          context,
          "3",
          Game.instance.camera.centerX + previewOffsetX - 16,
          Game.instance.camera.centerY + previewOffsetY - 16
        );
      }
    }

    this.continueElement?.draw(undefined);

    if (this.sectionSelection === "continue") {
      drawText(
        context,
        Game.instance.defaultFontSprite,
        "Ready to continue to the next level?\nPress Enter to proceed.",
        Game.instance.camera.centerX,
        context.canvas.height - 32,
        true
      );

      this.environmentSprite?.drawFrame(
        context,
        "9",
        Game.instance.camera.centerX - 16,
        Game.instance.camera.centerY - 16 - 8
      );
      this.environmentSprite?.drawFrame(
        context,
        "11",
        Game.instance.camera.centerX - 16,
        Game.instance.camera.centerY + 15 - 8
      );
    }

    // Gold display in top right corner
    drawText(
      context,
      Game.instance.defaultFontSprite,
      `Gold: $${this.playerGold}`,
      Game.instance.camera.width - 80,
      12
    );
  }

  destroy(): void {}
}

class UIElement<Data> {
  public isSelected: boolean = false;
  public links: Map<string, UIElement<any>> = new Map();

  static createKeyboardLink({
    from,
    to,
    direction,
  }: {
    from: UIElement<any>;
    to: UIElement<any>;
    direction: "up" | "down" | "left" | "right";
  }) {
    switch (direction) {
      case "up":
        {
          from.addLinkedElement(to, "w");
          from.addLinkedElement(to, "arrowup");
          to.addLinkedElement(from, "s");
          to.addLinkedElement(from, "arrowdown");
        }
        break;
      case "down":
        {
          from.addLinkedElement(to, "s");
          from.addLinkedElement(to, "arrowdown");
          to.addLinkedElement(from, "w");
          to.addLinkedElement(from, "arrowup");
        }
        break;
      case "left":
        {
          from.addLinkedElement(to, "a");
          from.addLinkedElement(to, "arrowleft");
          to.addLinkedElement(from, "d");
          to.addLinkedElement(from, "arrowright");
        }
        break;
      case "right": {
        from.addLinkedElement(to, "d");
        from.addLinkedElement(to, "arrowright");
        to.addLinkedElement(from, "a");
        to.addLinkedElement(from, "arrowleft");
      }
    }
  }

  static createTabLinks(elements: UIElement<any>[]) {
    for (let i = 0; i < elements.length; i++) {
      const prev = elements[(i - 1 + elements.length) % elements.length];
      const current = elements[i];
      const next = elements[(i + 1) % elements.length];
      current.addLinkedElement(prev, "shift tab");
      current.addLinkedElement(next, "tab");
    }
  }

  constructor(
    public id: string,
    public x: number,
    public y: number,
    public drawCallback: (
      data: Data,
      position: { x: number; y: number }
    ) => void,
    public drawSelectionIndicatorCallback: (
      data: Data,
      position: { x: number; y: number }
    ) => void,
    public onSelect: () => void,
    public onAccept: () => void
  ) {}

  setSelected(selected: boolean, triggerOnSelect: boolean = true) {
    this.isSelected = selected;
    if (triggerOnSelect) {
      this.onSelect();
    }
  }

  addLinkedElement(element: UIElement<any>, key: string) {
    this.links.set(key, element);
  }

  update() {
    // Handle input and navigation between linked elements
    if (!this.isSelected) return;

    if (
      Game.instance.input.isPressed("enter") ||
      Game.instance.input.isPressed("e") ||
      Game.instance.input.isPressed("spacebar")
    ) {
      this.onAccept();
    }

    for (const [key, element] of this.links) {
      if (Game.instance.input.isPressed(key)) {
        this.setSelected(false);
        setTimeout(() => {
          element.setSelected(true);
        }, 1);
        break;
      }
    }
  }

  draw(data: Data) {
    if (this.isSelected) {
      const xOffset = Math.sin(Game.instance.timeSinceStart / 200);
      this.drawSelectionIndicatorCallback(data, {
        x: this.x - 16 + xOffset,
        y: this.y - 12,
      });
    }

    this.drawCallback(data, { x: this.x + 12, y: this.y });

    drawDebugPoint({
      x: this.x,
      y: this.y,
    });
  }
}
