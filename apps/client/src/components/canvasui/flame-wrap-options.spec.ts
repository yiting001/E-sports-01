import { describe, expect, it } from "vitest";
import {
  resolveFlameWrapFallback,
  resolveFlameWrapOptions,
} from "./flame-wrap-options";

describe("Flame Wrap 默认参数", () => {
  it("忽略 Vue 可选 prop 中的 undefined", () => {
    const options = resolveFlameWrapOptions({
      color: undefined,
      intensity: undefined,
      sparks: undefined,
    });

    expect(options.color).toEqual([0.31, 0.54, 1]);
    expect(options.intensity).toBe(0.5);
    expect(options.sparks).toBe(1.5);
  });

  it("保留显式传入的零值", () => {
    const options = resolveFlameWrapOptions({ sparks: 0, smoke: 0 });

    expect(options.sparks).toBe(0);
    expect(options.smoke).toBe(0);
  });

  it("为不支持 html-in-canvas 的浏览器生成内容热浪参数", () => {
    const fallback = resolveFlameWrapFallback({
      distortion: 6,
      turbulence: 0.4,
      turbulenceScale: 0.7,
      turbulenceReach: 18,
      speed: 0.35,
    });

    expect(fallback.enabled).toBe(true);
    expect(fallback.displacement).toBe(6);
    expect(fallback.edgeReach).toBe(18);
    expect(fallback.frequencyValues.split(";")).toHaveLength(3);
    expect(fallback.durationSeconds).toBeGreaterThan(1);
  });

  it("显式关闭扭曲时不启用内容热浪降级", () => {
    expect(resolveFlameWrapFallback({ distortion: 0 }).enabled).toBe(false);
  });
});
