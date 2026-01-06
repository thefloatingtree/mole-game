import { Colors } from "../../constants/Colors";
import type { IEntity } from "../../IEntity";

export class Block implements IEntity {
    constructor(public position: { x: number, y: number }) {}
    
    update(deltaTime: number): void {
        
    }

    draw(context: CanvasRenderingContext2D): void {
        context.rect(
            this.position.x,
            this.position.y,
            32,
            32
        );
        context.fillStyle = Colors.WHITE;
        context.fill();
    }
}