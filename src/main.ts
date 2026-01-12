import { Game } from "./Game";
import { MainMenuScene } from "./scenes/main-menu-scene/MainMenuScene";
import { ShopScene } from "./scenes/shop-scene/ShopScene";
import { Sprite } from "./Sprite";

async function main() {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;

  if (!context) {
    throw new Error("Failed to get 2D context");
  }

  const defaultFontSprite = await Sprite.load(
    new URL("/assets/sprites/font-sprite.png", import.meta.url).href,
    new URL("/assets/sprites/font-sprite.json", import.meta.url).href
  );

  await Game.instance.init(context);
  Game.instance.setDefaultFontSprite(defaultFontSprite);
  Game.instance.loadScene(new MainMenuScene());
  Game.instance.start();
}

main();
