export const Colors = {
  WHITE: "#FFFFFF",
  BLACK: "#222034",
} as const;
export type Color = typeof Colors[keyof typeof Colors];