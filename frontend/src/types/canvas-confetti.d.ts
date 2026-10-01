declare module "canvas-confetti" {
  export interface ConfettiOptions {
    particleCount?: number;
    spread?: number;
    startVelocity?: number;
    gravity?: number;
    scalar?: number;
    ticks?: number;
    colors?: string[];
    origin?: { x?: number; y?: number };
  }

  export default function confetti(options?: ConfettiOptions): Promise<null> | null;
}
