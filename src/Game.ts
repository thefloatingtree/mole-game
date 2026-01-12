import { Animator } from "./Animator";
import { Events } from "./Events";
import type { IScene } from "./IScene";
import { Particles } from "./Particles";
import { Sprite } from "./Sprite";
import { State } from "./State";
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
  public idealRefreshRate: number = 60;
  public timeSinceStart: number = 0;

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

    this.idealRefreshRate = await this.measureIdealRefreshRate();

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
    requestAnimationFrame((currentTime: number) => {
      if (!this.#isRunning) return;

      this.frameCounter++;

      let deltaTime = currentTime - this.#lastFrameTime;

      this.timeSinceStart += deltaTime;

      // If deltaTime is too high, set it to ideal frame time to avoid large jumps
      // Happens when the tab is inactive, etc.
      if (deltaTime > 100) deltaTime = 1000 / this.idealRefreshRate;

      this.#lastFrameTime = currentTime;

      if (this.#currentScene) {
        this.#pinput.update();
        this.#animator.update(deltaTime);
        this.#particles.update(deltaTime);
        this.#currentScene.update(deltaTime);
        this.#currentScene?.draw(this.context, deltaTime);
        this.#particles.draw(this.context, deltaTime);
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
      }
      this.loop();
    });
  }

  deferDraw(drawFunction: () => void, isDebugDraw: boolean = false) {
    this.#deferDrawRequests.push({
      callback: drawFunction,
      isDebugDraw: isDebugDraw,
    });
  }

  private async measureIdealRefreshRate() {
    return new Promise<number>((resolve) => {
      // Request a couple of animation frames and measure the time between them
      let frameTimes: number[] = [];
      let lastTime: number | null = null;
      const measureFrame = (time: number) => {
        if (lastTime !== null) {
          frameTimes.push(time - lastTime);
        }
        lastTime = time;
        if (frameTimes.length < 3) {
          requestAnimationFrame(measureFrame);
        } else {
          const averageFrameTime =
            frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          const idealRefreshRate = 1000 / averageFrameTime;
          resolve(idealRefreshRate);
        }
      };
      requestAnimationFrame(measureFrame);
    });
  }
}
