import { Colors } from "../../../constants/Colors";
import { Particle, ParticleEmitter } from "../../../Particles";
import { checkCollisionAABB } from "../../../util/collision";
import { drawPoint } from "../../../util/draw";
import {
  DebugColor,
  drawDebugPoint,
  drawDebugRect,
} from "../../../util/drawDebug";
import { randomBetween } from "../../../util/random";
import { clamp } from "../../../util/util";

export class BlockFallingParticleEmitter extends ParticleEmitter {
  readonly gravity = 0.00005;
  readonly lifeTime = 2000;
  readonly spawnInterval = 100;

  private shouldSpawnParticles = true;
  private emitterDurationElapsed = 0;

  particles: Particle[] = [];

  constructor(
    public box: { x: number; y: number; width: number; height: number }
  ) {
    super();
  }

  stopSpawning(): void {
    this.shouldSpawnParticles = false;
  }

  createParticle(): void {
    const particle = this.getParticle();
    if (particle) {
      particle.life = this.lifeTime;
      particle.x = this.box.x + randomBetween(0, this.box.width);
      particle.y = this.box.y + randomBetween(0, this.box.height);
      particle.vx = 0;
      particle.vy = 0;
      particle.data = { gravity: this.gravity * randomBetween(0.5, 1.3) };
      this.particles.push(particle);
    }
  }

  shouldDestroyEmitter(): boolean {
    // All particles are dead, emitter can be destroyed
    return this.particles.reduce(
      (allDead, particle) => allDead && particle.life <= 0,
      true
    );
  }

  init(): void {
    this.emitterDurationElapsed = 0;
    this.createParticle();
  }

  update(deltaTime: number): void {
    // Spawn 1 particle every 100ms
    this.emitterDurationElapsed += deltaTime;

    for (const particle of this.particles) {
      particle.life -= deltaTime;

      if (particle.life <= 0) continue;

      // Drift left and right slightly
      const drift = Math.sin((particle.life + particle.y) / 100) * 0.0005;
      particle.vx += drift;
      particle.vy += particle.data.gravity * deltaTime;
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;

      // Clamp x position to emitter column
      particle.x = clamp(particle.x, this.box.x, this.box.x + this.box.width);

      // Kill particle if it collides with emitter shouldSpawnParticles is false
      if (
        checkCollisionAABB(
          {
            x: particle.x,
            y: particle.y,
            width: 1,
            height: 1,
          },
          this.box
        ) &&
        !this.shouldSpawnParticles
      ) {
        particle.life = 0;
      }
    }

    if (this.emitterDurationElapsed >= this.spawnInterval && this.shouldSpawnParticles) {
      this.createParticle();
      this.emitterDurationElapsed = 0;
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      console.log(particle.x, particle.y);
      drawPoint(context, particle.x, particle.y, Colors.WHITE, 1);
      drawDebugPoint(particle, DebugColor.YELLOW);
    }

    drawDebugRect(this.box, DebugColor.RED);
  }
}
