import { mergeDefinedOptions } from "./canvas-options";

export interface FlameWrapOptions {
  /** Flame color as [r, g, b] in 0-1 range. */
  color?: [number, number, number];
  /** Overall brightness of the fire (0 to 3). */
  intensity?: number;
  /** Reach of the flames above the top edge in CSS pixels. */
  height?: number;
  /** Reach of the glow on the sides and bottom in CSS pixels. */
  spread?: number;
  /** Corner radius of the burning outline in CSS pixels. Match your content. */
  radius?: number;
  /** Animation speed multiplier for the whole effect. */
  speed?: number;
  /** Flame detail from 0 (broad licks) to 1 (fine licks). */
  scale?: number;
  /** Amplitude of the turbulence waves shaping the flames (0 to 1). */
  turbulence?: number;
  /** Frequency multiplier of the turbulence waves (0.2 to 3). */
  turbulenceScale?: number;
  /** How far from the edges the heat warps the content, in CSS pixels. */
  turbulenceReach?: number;
  /** Brightness of the spark highlights (0 to 3). 0 disables them. */
  sparks?: number;
  /** Size multiplier for individual sparks (0.2 to 3). */
  sparkSize?: number;
  /** How many sparks fly at once (0.3 to 2.5). */
  sparkDensity?: number;
  /** How fast sparks rise and flicker (0.1 to 3). */
  sparkSpeed?: number;
  /** Strength of the molten glow hugging the edges (0 to 3). */
  rim?: number;
  /** How far the flames eat into the content silhouette in CSS pixels. */
  melt?: number;
  /** Heat shimmer displacement of the content near the edges in CSS pixels. */
  distortion?: number;
  /** Amount of smoke drifting off the flames (0 to 2). */
  smoke?: number;
  /** Brightness of the glowing ember line on the burnt edges (0 to 2). */
  ember?: number;
  /** Darkness of the charred band on the content edges (0 to 2). */
  scorch?: number;
}

export interface FlameWrapElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface FlameWrapInstance {
  /** Update effect options live. */
  setOptions: (options: FlameWrapOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const FLAME_WRAP_DEFAULTS: Required<FlameWrapOptions> = {
  color: [0.31, 0.54, 1],
  intensity: 0.5,
  height: 170,
  spread: 8,
  radius: 40,
  speed: 0.25,
  scale: 0.75,
  turbulence: 0.5,
  turbulenceScale: 0.5,
  turbulenceReach: 25,
  sparks: 1.5,
  sparkSize: 0.35,
  sparkDensity: 1,
  sparkSpeed: 1,
  rim: 2.5,
  melt: 4.5,
  distortion: 10,
  smoke: 1.5,
  ember: 2,
  scorch: 0,
};

export type FlameWrapConfig = Required<FlameWrapOptions>;

export interface FlameWrapFallbackConfig {
  enabled: boolean;
  displacement: number;
  edgeReach: number;
  baseFrequency: string;
  frequencyValues: string;
  durationSeconds: number;
}

export function resolveFlameWrapOptions(
  options: FlameWrapOptions = {},
): FlameWrapConfig {
  return mergeDefinedOptions(FLAME_WRAP_DEFAULTS, options);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function frequency(x: number, y: number): string {
  return `${x.toFixed(4)} ${y.toFixed(4)}`;
}

/**
 * Builds an SVG displacement fallback for browsers without html-in-canvas.
 * The filter keeps the live DOM interactive while limiting shimmer to its edges.
 */
export function resolveFlameWrapFallback(
  options: FlameWrapOptions = {},
): FlameWrapFallbackConfig {
  const config = resolveFlameWrapOptions(options);
  const displacement = clamp(config.distortion, 0, 16);
  const edgeReach = clamp(config.turbulenceReach, 4, 32);
  const turbulence = clamp(config.turbulence, 0, 1);
  const turbulenceScale = clamp(config.turbulenceScale, 0.2, 3);
  const x = 0.006 + turbulenceScale * 0.004;
  const y = 0.018 + turbulenceScale * 0.014;
  const variation = 0.0015 + turbulence * 0.0025;
  const baseFrequency = frequency(x, y);
  const alternateFrequency = frequency(
    x + variation,
    Math.max(y - variation * 1.5, 0.004),
  );

  return {
    enabled: displacement > 0,
    displacement,
    edgeReach,
    baseFrequency,
    frequencyValues: `${baseFrequency};${alternateFrequency};${baseFrequency}`,
    durationSeconds: Number(
      Math.max(1.2, 1.1 / Math.max(config.speed, 0.1)).toFixed(2),
    ),
  };
}
