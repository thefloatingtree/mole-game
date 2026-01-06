export interface IScene {
    load(): Promise<void>;
    update(deltaTime: number): void;
    draw(context: CanvasRenderingContext2D, deltaTime: number): void;
    destroy(): void;
}