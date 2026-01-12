import { ItemType } from "./ItemType";

export const ItemPrice: Record<ItemType, number> = {
  [ItemType.DIRT]: 0,
  [ItemType.COAL]: 1,
  [ItemType.IRON]: 3,
  [ItemType.EMERALD]: 5,
  [ItemType.DIAMOND]: 10,
};
