export const ItemType = {
    DIRT: 'dirt',
    COAL: 'coal',
    IRON: 'iron',
    EMERALD: 'emerald',
    DIAMOND: 'diamond',
} as const;
export type ItemType = typeof ItemType[keyof typeof ItemType];