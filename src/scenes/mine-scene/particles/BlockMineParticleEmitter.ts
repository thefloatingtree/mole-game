import { Colors } from "../../../constants/Colors";
import { Particle, ParticleEmitter } from "../../../Particles";
import {
  checkCollisionAABB,
  resolveCollisionAABB,
} from "../../../util/collision";
import { drawPoint } from "../../../util/draw";
import { DebugColor, drawDebugPoint } from "../../../util/drawDebug";
import {
  randomAngleBetween,
  randomBetween,
  randomIntBetween,
} from "../../../util/random";

export class BlockMineParticleEmitter extends ParticleEmitter {
  readonly sparkParticleCount = randomIntBetween(3, 5);
  readonly gravity = 0.001;
  readonly angleSpread = Math.PI / 4;
  readonly sparkLifeTime = 1000;
  readonly sparkLifeTimeVariance = 300;
  readonly sparkSpeedVariance = 0.1;
  readonly friction = 0.98;

  public speed = 0.03;

  particles: Particle[] = [];
  sparkParticles: Particle[] = [];

  constructor(
    public position: { x: number; y: number },
    public collisionBoxes: {
      x: number;
      y: number;
      width: number;
      height: number;
    }[],
    speedMultiplier: number = 1,
    particleCountMultiplier: number = 1
  ) {
    super();

    this.speed *= speedMultiplier;
    this.sparkParticleCount = Math.floor(
      this.sparkParticleCount * particleCountMultiplier
    );
  }

  createSparkParticle(): void {
    const particle = this.getParticle();
    if (particle) {
      particle.life = this.sparkLifeTime + randomBetween(
        -this.sparkLifeTimeVariance,
        this.sparkLifeTimeVariance
      );
      particle.x = this.position.x;
      particle.y = this.position.y;

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

      for (const box of this.collisionBoxes) {
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
      }
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    for (const sparkParticle of this.sparkParticles) {
      if (sparkParticle.life <= 0) continue;
      drawPoint(context, sparkParticle.x, sparkParticle.y, Colors.WHITE);
      drawDebugPoint(
        { x: sparkParticle.x, y: sparkParticle.y },
        DebugColor.YELLOW
      );
    }

    drawDebugPoint(this.position, DebugColor.RED);
  }
}
