type AsepriteFrameData = {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  duration: number;
};

type AsepriteData = {
  frames: Record<string, AsepriteFrameData>;
  meta: {
    app: string;
    version: string;
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: string;
    frameTags: Array<{
      name: string;
      from: number;
      to: number;
    }>;
  };
};

export class Sprite {
  currentTagBeingPlayed: string | null = null;
  currentFrameIndex: number = 0;
  currentFrameRunningDuration: number = 0;

  constructor(
    public spriteImage: HTMLImageElement,
    public spriteData: AsepriteData
  ) {}

  static async load(imagePath: string, dataPath: string): Promise<Sprite> {
    const imagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = imagePath;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
    const dataPromise = fetch(dataPath).then((res) => res.json());

    const [spriteImage, spriteData] = await Promise.all([
      imagePromise,
      dataPromise,
    ]);
    return new Sprite(spriteImage, spriteData);
  }

  public get height(): number {
    // Assuming all frames have the same height, return the height of the first frame
    const firstFrameKey = Object.keys(this.spriteData.frames)[0];
    return this.spriteData.frames[firstFrameKey].frame.h;
  }

  public get width(): number {
    // Assuming all frames have the same width, return the width of the first frame
    const firstFrameKey = Object.keys(this.spriteData.frames)[0];
    return this.spriteData.frames[firstFrameKey].frame.w;
  }

  drawFrame(
    ctx: CanvasRenderingContext2D,
    frameName: string,
    x: number,
    y: number
  ) {
    const frameData = this.spriteData.frames[frameName];
    if (!frameData) {
      console.warn(`Frame ${frameName} not found in sprite data.`);
      return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      this.spriteImage,
      frameData.frame.x,
      frameData.frame.y,
      frameData.frame.w,
      frameData.frame.h,
      Math.round(x),
      Math.round(y),
      frameData.frame.w,
      frameData.frame.h
    );
  }

  drawAnimation(
    ctx: CanvasRenderingContext2D,
    tagName: string,
    x: number,
    y: number,
    deltaTime: number,
    repeat: boolean = true
  ) {
    const tag = this.spriteData.meta.frameTags.find((t) => t.name === tagName);
    if (!tag) {
      console.warn(`Animation tag ${tagName} not found in sprite data.`);
      return;
    }

    if (this.currentTagBeingPlayed !== tagName) {
      this.currentTagBeingPlayed = tagName;
      this.currentFrameIndex = tag.from;
      this.currentFrameRunningDuration = 0;
    }

    const currentFrameData =
      this.spriteData.frames[this.currentFrameIndex.toString()];

    // Increment the running duration of the current frame, once it exceeds the duration, move to the next frame
    this.currentFrameRunningDuration += deltaTime;

    if (this.currentFrameRunningDuration >= currentFrameData.duration) {
      this.currentFrameRunningDuration = 0;
      this.currentFrameIndex++;

      if (this.currentFrameIndex > tag.to) {
        if (repeat) {
          this.currentFrameIndex = tag.from;
        } else {
          this.currentFrameIndex = tag.to; // Stay on the last frame
        }
      }
    }

    this.drawFrame(ctx, this.currentFrameIndex.toString(), x, y);
  }

  drawTiledAnimation(
    ctx: CanvasRenderingContext2D,
    tagName: string,
    x: number,
    y: number,
    tilesX: number,
    tilesY: number,
    deltaTime: number,
    repeat: boolean = true,
    speed: number = 1
  ) {
    const tag = this.spriteData.meta.frameTags.find((t) => t.name === tagName);
    if (!tag) {
      console.warn(`Animation tag ${tagName} not found in sprite data.`);
      return;
    }

    if (this.currentTagBeingPlayed !== tagName) {
      this.currentTagBeingPlayed = tagName;
      this.currentFrameIndex = tag.from;
      this.currentFrameRunningDuration = 0;
    }

    const currentFrameData =
      this.spriteData.frames[this.currentFrameIndex.toString()];

    // Increment the running duration of the current frame, once it exceeds the duration, move to the next frame
    this.currentFrameRunningDuration += deltaTime * speed;

    if (this.currentFrameRunningDuration >= currentFrameData.duration) {
      this.currentFrameRunningDuration = 0;
      this.currentFrameIndex++;

      if (this.currentFrameIndex > tag.to) {
        if (repeat) {
          this.currentFrameIndex = tag.from;
        } else {
          this.currentFrameIndex = tag.to; // Stay on the last frame
        }
      }
    }


    // Draw sprites to tile count
    const canvas = document.createElement('canvas');
    canvas.width = currentFrameData.frame.w;
    canvas.height = currentFrameData.frame.h;
    const canvasCtx = canvas.getContext('2d')!;
    canvasCtx.imageSmoothingEnabled = false;
    canvasCtx.drawImage(
      this.spriteImage,
      currentFrameData.frame.x,
      currentFrameData.frame.y,
      currentFrameData.frame.w,
      currentFrameData.frame.h,
      0,
      0,
      currentFrameData.frame.w,
      currentFrameData.frame.h
    );
    const pattern = ctx.createPattern(canvas, "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(
      Math.round(x),
      Math.round(y),
      tilesX * currentFrameData.frame.w,
      tilesY * currentFrameData.frame.h
      );
    }
  }
}
