export const BlockType = {
    PLAYER_START: -1,
    AIR: 0,
    DIRT: 1,
    STONE: 2,
} as const;
export type BlockType = typeof BlockType[keyof typeof BlockType];