import { lerp } from "./util/lerp";

export class Animator {
  activeAnimations: Animation<any>[] = [];

  animate<T>(animation: Omit<Animation<T>, "elapsed">) {
    // Check for existing animation on the same target and key
    const existingAnimationIndex = this.activeAnimations.findIndex(
      (anim) => anim.target === animation.target && anim.key === animation.key
    );
    if (existingAnimationIndex !== -1) {
      this.activeAnimations.splice(existingAnimationIndex, 1);
    }
    this.activeAnimations.push({ ...animation, elapsed: 0 });
  }

  update(deltaTime: number) {
    for (const animation of this.activeAnimations) {
      animation.elapsed += deltaTime;
      const newValue = lerp(
        animation.from,
        animation.to,
        Math.min(animation.easing(animation.elapsed / animation.duration), 1)
      );
      animation.target[animation.key] = newValue;
    }

    this.activeAnimations = this.activeAnimations.filter((animation) => {
      if (animation.elapsed <= animation.duration) return true;

      animation.target[animation.key] = animation.to; // Ensure final value is set
      if (animation.onComplete) {
        animation.onComplete();
      }
      return false;
    });
  }

  reset() {
    this.activeAnimations = [];
  }
}

type Animation<T> = {
  target: T;
  key: keyof T;
  from: number;
  to: number;
  duration: number;
  elapsed: number;
  easing: EasingFunction;
  onComplete?: () => void;
};

type EasingFunction = (x: number) => number;

export const Easing = {
  linear: (x: number) => x,
  easeInQuad: (x: number) => x * x,
  easeOutQuad: (x: number) => 1 - (1 - x) * (1 - x),
  easeInOutQuad: (x: number) =>
    x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
  easeInCubic: (x: number) => x * x * x,
  easeOutCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  easeInOutCubic: (x: number) =>
    x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  easeInQuart: (x: number) => x * x * x * x,
  easeOutQuart: (x: number) => 1 - Math.pow(1 - x, 4),
  easeInOutQuart: (x: number) =>
    x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2,
  easeInBack: (x: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * x * x * x - c1 * x * x;
  },
  easeOutBack: (x: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  easeInOutBack: (x: number) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return x < 0.5
      ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
      : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
  },
} as const;
