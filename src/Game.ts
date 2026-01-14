import { Animator } from "./Animator";
import { Colors } from "./constants/Colors";
import { Events } from "./Events";
import type { IScene } from "./IScene";
import { Particles } from "./Particles";
import { Sprite } from "./Sprite";
import { State } from "./State";
import { drawDebugTextOverlay } from "./util/drawDebug";
import { Pinput } from "./util/Pinput";

export class Game {
  public static readonly drawDebugInfo = false;

  static #instance: Game | null = null;

  #context: CanvasRenderingContext2D | null = null;
  #currentScene: IScene | null = null;
  #isRunning: boolean = false;
  #lastFrameTime: number = 0;
  #pinput = new Pinput();
  #animator = new Animator();
  #events = new Events();
  #state = new State();
  #particles = new Particles();
  #defaultFontSprite: Sprite | null = null;
  #deferDrawRequests: { callback: () => void; isDebugDraw: boolean }[] = [];
  #isSwitchingScene: boolean = false;

  public camera = {
    x: 0,
    y: 0,
    xOffset: 0,
    yOffset: 0,
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0,
  };
  public frameCounter = 0;
  public timeSinceStart: number = 0;
  public frameTimeSamples: number[] = [];
  public leftOverDeltaTime: number = 0;

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

  public get animator(): Animator {
    return this.#animator;
  }

  public get events(): Events {
    return this.#events;
  }

  public get state(): State {
    return this.#state;
  }

  public get particles(): Particles {
    return this.#particles;
  }

  public get defaultFontSprite(): Sprite {
    if (this.#defaultFontSprite === null) {
      throw new Error("Default font sprite is not loaded yet.");
    }
    return this.#defaultFontSprite;
  }

  async init(context: CanvasRenderingContext2D) {
    this.#context = context;
    this.#context.imageSmoothingEnabled = false;

    this.camera.width = context.canvas.width;
    this.camera.height = context.canvas.height;
    this.camera.centerX = this.camera.width / 2;
    this.camera.centerY = this.camera.height / 2;

    Howler.volume(0.4);
  }

  setDefaultFontSprite(fontSprite: Sprite) {
    this.#defaultFontSprite = fontSprite;
  }

  switchScene(scene: IScene) {
    if (this.#isSwitchingScene) return;
    this.#isSwitchingScene = true;

    Howler.unload();
    this.camera.x = 0;
    this.camera.y = 0;
    this.camera.xOffset = 0;
    this.camera.yOffset = 0;
    this.#currentScene?.destroy();
    this.#currentScene = null;
    this.#particles.reset();
    this.#events.reset();
    scene.load().then(() => {
      this.loadScene(scene);
      this.#isSwitchingScene = false;
    });
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
    requestAnimationFrame(() => {
      if (!this.#isRunning) return;
      this.frameCounter++;

      const currentTime = performance.now();
      let frameTime = currentTime - this.#lastFrameTime;
      this.#lastFrameTime = currentTime;

      this.frameTimeSamples.push(frameTime);
      if (this.frameTimeSamples.length > 20) {
        this.frameTimeSamples.shift();
      }
      const averageFrameTime =
        this.frameTimeSamples.reduce((a, b) => a + b, 0) /
        this.frameTimeSamples.length;
      const fps = Math.round(1000 / averageFrameTime);

      if (!this.#currentScene) {
        this.loop();
        return;
      }

      // Fixed timestep updates
      while (frameTime > 0) {
        const deltaTime = Math.min(frameTime, (1 / 60) * 1000);

        this.#pinput.update();
        this.#animator.update(deltaTime);
        this.#particles.update(deltaTime);
        this.#currentScene?.update(deltaTime);

        frameTime -= deltaTime;
        this.timeSinceStart += deltaTime;
      }

      // Clear canvas
      this.context.fillStyle = Colors.BLACK;
      this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);

      this.#currentScene?.draw(this.context, averageFrameTime);
      this.#particles.draw(this.context, averageFrameTime);

      drawDebugTextOverlay(
        fps.toString() + " FPS",
        this.camera.centerX - 22,
        10
      );

      // Sort debug draw requests to the end
      const debugDraws = this.#deferDrawRequests.filter(
        (req) => req.isDebugDraw
      );
      const normalDraws = this.#deferDrawRequests.filter(
        (req) => !req.isDebugDraw
      );
      for (const drawRequest of [...normalDraws, ...debugDraws]) {
        drawRequest.callback();
      }
      this.#deferDrawRequests = [];

      this.loop();
    });
  }

  deferDraw(drawFunction: () => void, isDebugDraw: boolean = false) {
    this.#deferDrawRequests.push({
      callback: drawFunction,
      isDebugDraw: isDebugDraw,
    });
  }
}
