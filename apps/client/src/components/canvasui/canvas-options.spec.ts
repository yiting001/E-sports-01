import { describe, expect, it } from "vitest";
import { resolveBlazeOptions } from "./Blaze.vue";
import { resolveCloudsOptions } from "./Clouds.vue";
import { resolveFrostOptions } from "./Frost.vue";
import { resolveGridOptions } from "./Grid.vue";
import { resolveLaserOptions } from "./Laser.vue";
import { mergeDefinedOptions } from "./canvas-options";

describe("Canvas UI 特效默认参数", () => {
  it("Clouds 忽略 undefined 颜色并保留默认值", () => {
    expect(resolveCloudsOptions().color).toBe("auto");
    expect(resolveCloudsOptions({ color: undefined }).color).toBe("auto");
  });

  it("Blaze 忽略 undefined 颜色并保留默认值", () => {
    const defaults = resolveBlazeOptions();
    const options = resolveBlazeOptions({
      sparkColor: undefined,
      smokeColor: undefined,
    });

    expect(defaults.sparkColor).toEqual([1, 0.4, 0.05]);
    expect(defaults.smokeColor).toEqual([1, 0.43, 0.1]);
    expect(options.sparkColor).toEqual([1, 0.4, 0.05]);
    expect(options.smokeColor).toEqual([1, 0.43, 0.1]);
  });

  it("Laser 忽略 undefined 颜色并保留默认值", () => {
    expect(resolveLaserOptions().color).toEqual([0.05, 0.35, 1]);
    expect(resolveLaserOptions({ color: undefined }).color).toEqual([
      0.05, 0.35, 1,
    ]);
  });

  it("Grid 忽略 undefined 色调并保留默认值", () => {
    expect(resolveGridOptions().tint).toEqual([0, 0.33, 1]);
    expect(resolveGridOptions({ tint: undefined }).tint).toEqual([0, 0.33, 1]);
  });

  it("Frost 忽略 undefined 色调并保留默认值", () => {
    const defaults = resolveFrostOptions();
    const options = resolveFrostOptions({
      tintThin: undefined,
      tintThick: undefined,
    });

    expect(defaults.tintThin).toEqual([0.82, 0.86, 1.05]);
    expect(defaults.tintThick).toEqual([0.92, 0.96, 1.1]);
    expect(options.tintThin).toEqual(defaults.tintThin);
    expect(options.tintThick).toEqual(defaults.tintThick);
  });

  it("保留显式传入的零值", () => {
    expect(resolveBlazeOptions({ sparks: 0 }).sparks).toBe(0);
    expect(resolveFrostOptions({ frost: 0 }).frost).toBe(0);
    expect(resolveGridOptions({ idleRipples: 0 }).idleRipples).toBe(0);
  });

  it("运行时更新忽略 undefined 并保留当前值", () => {
    expect(
      mergeDefinedOptions(
        { color: "custom", strength: 1 },
        { color: undefined, strength: 0 }
      )
    ).toEqual({ color: "custom", strength: 0 });
  });
});
