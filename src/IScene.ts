export interface IScene {
    load(): Promise<void>;
    update(deltaTime: number): void;
    draw(context: CanvasRenderingContext2D): void;
    destroy(): void;
}