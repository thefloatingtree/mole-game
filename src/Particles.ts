import { Game } from "./Game";

export class Particles {
  private emitters: ParticleEmitter[] = [];

  constructor() {}

  reset() {
    for (const emitter of this.emitters) {
      emitter.destroy();
    }
    this.emitters = [];
  }

  getParticle(): Particle | null {
    const particle = new Particle(0, 0, 0, 0, 1, {});
    return particle;
  }

  addEmitter(emitter: ParticleEmitter) {
    emitter.init();
    this.emitters.push(emitter);
  }

  update(deltaTime: number) {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const emitter = this.emitters[i];
      emitter.update(deltaTime);
      if (emitter.shouldDestroyEmitter()) {
        emitter.destroy();
        this.emitters.splice(i, 1);
      }
    }
  }

  draw(context: CanvasRenderingContext2D, deltaTime: number) {
    for (const emitter of this.emitters) {
      emitter.draw(context, deltaTime);
    }
  }
}

// Extend this class to create specific particle emitters
// emitter controls how particles are created, updated, and drawn
export abstract class ParticleEmitter {
  abstract particles: Particle[];

  constructor() {}

  getParticle(): Particle | null {
    return Game.instance.particles.getParticle();
  }

  abstract shouldDestroyEmitter(): boolean;
  abstract init(): void;
  abstract update(deltaTime: number): void;
  abstract draw(context: CanvasRenderingContext2D, deltaTime: number): void;

  destroy() {
    this.particles = [];
  }
}

export class Particle {
  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public life: number,
    public data: any
  ) {}
}
