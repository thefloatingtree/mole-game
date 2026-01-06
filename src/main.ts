import { Game } from "./Game";
import { MineScene } from "./scenes/mine-scene/MineScene";

function main() {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;

  if (!context) {
    throw new Error("Failed to get 2D context");
  }

  Game.instance.init(context);
  Game.instance.loadScene(new MineScene());
  Game.instance.start();
}

main();
