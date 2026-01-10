import { Colors } from "../../../constants/Colors";
import { Particle, ParticleEmitter } from "../../../Particles";
import {
  checkCollisionAABB,
  resolveCollisionAABB,
} from "../../../util/collision";
import { drawCircle } from "../../../util/draw";
import {
  DebugColor,
  drawDebugPoint,
  drawDebugRect,
} from "../../../util/drawDebug";
import {
  randomAngleBetween,
  randomAtRate,
  randomBetween,
  randomIntBetween,
} from "../../../util/random";
import type { Block } from "../Block";

export class BlockDestroyParticleEmitter extends ParticleEmitter {
  readonly sparkParticleCount = randomIntBetween(4, 5);
  readonly gravity = 0.001;
  readonly sparkLifeTime = 3000;
  readonly sparkLifeTimeVariance = 500;
  readonly sparkSpeedVariance = 0.05;
  readonly friction = 0.97;

  public speed = 0.02;

  particles: Particle[] = [];
  sparkParticles: Particle[] = [];

  constructor(
    public box: { x: number; y: number; width: number; height: number },
    public blocks: Block[],
    public fillParticles: boolean = true
  ) {
    super();
  }

  createSparkParticle(): void {
    const particle = this.getParticle();
    if (particle) {
      particle.life =
        this.sparkLifeTime +
        randomBetween(-this.sparkLifeTimeVariance, this.sparkLifeTimeVariance);
      particle.x = randomIntBetween(this.box.x, this.box.x + this.box.width);
      particle.y = randomIntBetween(this.box.y, this.box.y + this.box.height);

      // Random angle pointing top half-circle
      const angle = randomAngleBetween(0, 360);

      // If angle is pointing upwards, scale speed higher to overcome gravity
      angle > Math.PI / 2 || angle < (3 * Math.PI) / 2
        ? (this.speed *= 1.5)
        : (this.speed *= 1);

      const speed =
        this.speed +
        randomBetween(-this.sparkSpeedVariance, this.sparkSpeedVariance);
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.data.radius = randomAtRate([
        { value: 2, rate: 1 },
        { value: 3, rate: 2 },
        { value: 4, rate: 1 },
      ]);

      this.sparkParticles.push(particle);
    }
  }

  shouldDestroyEmitter(): boolean {
    // All particles are dead, emitter can be destroyed
    return [...this.particles, ...this.sparkParticles].reduce(
      (allDead, particle) => allDead && particle.life <= 0,
      true
    );
  }

  init(): void {
    // Create spark particles
    for (let i = 0; i < this.sparkParticleCount; i++) {
      this.createSparkParticle();
    }
  }

  update(deltaTime: number): void {
    for (const particle of this.sparkParticles) {
      particle.life -= deltaTime;
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vy += this.gravity * deltaTime;
      particle.vx *= this.friction;
      particle.vy *= this.friction;

      if (particle.life <= 0) continue;

      for (const block of this.blocks) {
        const box = block.collisionBox;
        if (
          checkCollisionAABB(
            { x: particle.x, y: particle.y, width: 1, height: 1 },
            box
          )
        ) {
          const { side, x, y } = resolveCollisionAABB(
            {
              x: particle.x,
              y: particle.y,
              width: 1,
              height: 1,
              vx: particle.vx,
              vy: particle.vy,
            },
            box
          );

          particle.x = x;
          particle.y = y;

          if (side === "bottom" || side === "top") {
            particle.vy *= -0.3;
          } else if (side === "left" || side === "right") {
            particle.vx *= -0.3;
          }
        }

        const deathBox = block.deathCollisionBox;
        if (
          deathBox &&
          checkCollisionAABB(
            { x: particle.x, y: particle.y, width: 1, height: 1 },
            deathBox
          )
        ) {
          particle.life = 0;
        }
      }
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    for (const sparkParticle of this.sparkParticles) {
      if (sparkParticle.life <= 0) continue;
      console.log(sparkParticle.data);
      drawCircle(
        context,
        sparkParticle.x,
        sparkParticle.y,
        sparkParticle.data.radius,
        this.fillParticles ? Colors.WHITE : Colors.BLACK,
        Colors.WHITE
      );
      drawDebugPoint(
        { x: sparkParticle.x, y: sparkParticle.y },
        DebugColor.YELLOW
      );
    }

    drawDebugRect(this.box, DebugColor.RED);
  }
}
