export interface IEntity {
    update(deltaTime: number): void;
    draw(context: CanvasRenderingContext2D, deltaTime: number): void;
}