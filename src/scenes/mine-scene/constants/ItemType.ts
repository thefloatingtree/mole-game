export const ItemType = {
    DIRT: 'dirt',
} as const;
export type ItemType = typeof ItemType[keyof typeof ItemType];