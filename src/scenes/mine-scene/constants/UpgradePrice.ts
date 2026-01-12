import type { UpgradeType } from "./UpgradeType";

export const UpgradePrice: Record<UpgradeType, number> = {
  "pickaxe-upgrade": 5,
  "lucky-charm": 20,
  "lantern-upgrade": 30,
  "boots": 50,
};

export const UpgradePriceScaleFactor = 1.5;
