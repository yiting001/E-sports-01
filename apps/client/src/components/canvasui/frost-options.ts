import { mergeDefinedOptions } from "./canvas-options";

export interface FrostOptions {
  /** Base frozen coverage added on top of the frost pattern (0-1). */
  frost?: number;
  /** Multiplier on the frost noise pattern. Higher freezes more of the pane. */
  strength?: number;
  /** Contrast of the frost noise pattern. */
  contrast?: number;
  /** Contrast of the final frost mask. Higher gives crisper frost edges. */
  crispness?: number;
  /** How much sparkling highlight grain mixes into the frost (0-1). */
  highlight?: number;
  /** How strongly highlights tint toward white (0-1). */
  highlightStrength?: number;
  /** Base blur haze mixed over the content, even outside thick frost (0-1). */
  haze?: number;
  /** Frost color where the layer is thin, as [r, g, b] in 0-1 range. */
  tintThin?: [number, number, number];
  /** Frost color where the layer is thick, as [r, g, b] in 0-1 range. */
  tintThick?: [number, number, number];
  /** How much the frost tint colors the frozen areas (0-1). */
  tintStrength?: number;
  /** Saturation multiplier applied to the frosted content. */
  saturation?: number;
  /** Brightness multiplier applied to the frosted content. */
  brightness?: number;
  /** How far the icy surface bends light. 0 disables refraction. */
  refraction?: number;
  /** Index of refraction of the ice. Water ice is about 1.31. */
  ior?: number;
  /** Strength of the fine surface detail in the refraction. */
  detail?: number;
  /** Scale of the icy relief pattern. Higher is larger features. */
  textureScale?: number;
  /** Fresnel boost at grazing angles (0-2). */
  fresnel?: number;
  /** Radius of the melt spot under the cursor (0-1, fraction of height). */
  meltRadius?: number;
  /** Irregularity of the melt edge. 0 is a clean circle. */
  meltNoise?: number;
  /** How quickly hovering melts the frost (0-1). */
  meltStrength?: number;
  /** How fast melted areas freeze back over. 0 never refreezes. */
  refreeze?: number;
  /** Keeps the edges of the pane frozen. 0 lets everything melt. */
  edgeFade?: number;
  /** Lets the frozen borders of the pane melt too. */
  meltEdges?: boolean;
  /** Seconds for the frost to grow in from the edges on load. 0 disables. */
  introDuration?: number;
  /** Overall opacity of the frost layer (0-1). Lower shows more content. */
  opacity?: number;
  /** Animated twinkle of the highlight grain (0-1). 0 is static. */
  shimmer?: number;
  /** Resolution multiplier for the blur passes (0.25-1). */
  quality?: number;
}

export interface FrostElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface FrostInstance {
  /** Melt a spot at (x, y) in [0,1] space, top-left origin. */
  melt: (x: number, y: number) => void;
  /** Update options live. */
  setOptions: (options: FrostOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

export type FrostConfig = Required<FrostOptions>;

const FROST_DEFAULTS: FrostConfig = {
  frost: 0.05,
  strength: 0.7,
  contrast: 3,
  crispness: 1,
  highlight: 0.3,
  highlightStrength: 0.8,
  haze: 0.5,
  tintThin: [0.82, 0.86, 1.05],
  tintThick: [0.92, 0.96, 1.1],
  tintStrength: 0.3,
  saturation: 1.2,
  brightness: 0.85,
  refraction: 1,
  ior: 1.31,
  detail: 2,
  textureScale: 2,
  fresnel: 0.8,
  meltRadius: 0.25,
  meltNoise: 0.25,
  meltStrength: 0.75,
  refreeze: 2,
  edgeFade: 0.1,
  meltEdges: true,
  introDuration: 2.5,
  opacity: 0.6,
  shimmer: 0,
  quality: 1,
};

export function resolveFrostOptions(options: FrostOptions = {}): FrostConfig {
  return mergeDefinedOptions(FROST_DEFAULTS, options);
}
