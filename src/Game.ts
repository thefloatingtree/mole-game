import type { IScene } from "./IScene";
import { Pinput } from "./util/Pinput";

export class Game {
  static #instance: Game | null = null;

  #context: CanvasRenderingContext2D | null = null;
  #currentScene: IScene | null = null;
  #isRunning: boolean = false;
  #lastFrameTime: number = 0;
  #pinput = new Pinput();

  constructor() {}

  public static get instance(): Game {
    if (this.#instance === null) {
      this.#instance = new Game();
    }
    return this.#instance;
  }

  public get scene(): IScene {
    if (!this.#currentScene) {
      throw new Error("No scene is currently loaded.");
    }

    return this.#currentScene;
  }

  public get context(): CanvasRenderingContext2D {
    if (Game.instance === null || Game.instance.#context === null) {
      throw new Error("Game is not initialized with a rendering context.");
    }
    return Game.instance.#context;
  }

  public get input(): Pinput {
    return this.#pinput;
  }

  init(context: CanvasRenderingContext2D) {
    this.#context = context;
    this.#context.imageSmoothingEnabled = false;
  }

  loadScene(scene: IScene | null) {
    this.#currentScene = scene;
  }

  async start() {
    this.#isRunning = true;
    this.#lastFrameTime = performance.now();
    await this.scene.load();
    this.loop();
  }

  stop() {
    this.#isRunning = false;
    this.scene.destroy();
  }

  loop() {
    requestAnimationFrame((currentTime: number) => {
      if (!this.#isRunning) return;
      
      const deltaTime = currentTime - this.#lastFrameTime;
      this.#lastFrameTime = currentTime;

      if (this.#currentScene) {
        this.#pinput.update();
        this.#currentScene.update(deltaTime);
        this.#currentScene.draw(this.context, deltaTime);
      }
      this.loop();
    });
  }
}
