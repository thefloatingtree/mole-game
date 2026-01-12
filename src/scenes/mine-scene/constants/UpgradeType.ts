export const UpgradeType = {
  PICKAXE_UPGRADE: "pickaxe-upgrade",
  LANTERN_UPGRADE: "lantern-upgrade",
  BOOTS: "boots",
  LUCKY_CHARM: "lucky-charm",
} as const;
export type UpgradeType = typeof UpgradeType[keyof typeof UpgradeType];