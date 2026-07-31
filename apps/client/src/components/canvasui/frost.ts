import { mergeDefinedOptions } from "./canvas-options";
import { createFrostContentCapture } from "./frost-canvas";
import {
  resolveFrostOptions,
  type FrostElements,
  type FrostInstance,
  type FrostOptions,
} from "./frost-options";
import {
  createFrostGlResources,
  type FrostDoubleTarget,
  type FrostTarget,
} from "./frost-webgl";

export function createFrost(
  elements: FrostElements,
  options: FrostOptions = {}
): FrostInstance | null {
  const config = resolveFrostOptions(options);
  const { source, content, output } = elements;
  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl || gl.isContextLost()) return null;

  let contentDirty = false;
  let wake = () => {};
  const capture = createFrostContentCapture(source, content, () => {
    contentDirty = true;
    wake();
  });
  const { htmlInCanvas, paintable } = capture;
  let contentReady = !htmlInCanvas;

  const halfFloat = Boolean(gl.getExtension("EXT_color_buffer_float"));
  const resources = createFrostGlResources(gl, output);
  const {
    programs: {
      blur: blurProgram,
      pointer: pointerProgram,
      frost: frostProgram,
      output: outputProgram,
    },
    heightTarget,
    noiseTarget,
    contentTexture,
    createTarget,
    createDoubleTarget,
    releaseTarget,
    blit,
    bindTexture,
  } = resources;

  let frostTarget: FrostTarget | null = null;
  let blurA: FrostTarget | null = null;
  let blurB: FrostTarget | null = null;
  let pointer: FrostDoubleTarget | null = null;
  let blurDirty = true;
  let targetsReady = false;

  function rebuildTargets() {
    const width = Math.max(output.width, 1);
    const height = Math.max(output.height, 1);
    const blurScale = 0.35 * Math.min(Math.max(config.quality, 0.25), 1);
    const bw = Math.max(1, Math.round(width * blurScale));
    const bh = Math.max(1, Math.round(height * blurScale));
    releaseTarget(frostTarget);
    releaseTarget(blurA);
    releaseTarget(blurB);
    if (pointer) {
      releaseTarget(pointer.read);
      releaseTarget(pointer.write);
    }
    frostTarget = createTarget(width, height, false, gl!.CLAMP_TO_EDGE);
    blurA = createTarget(bw, bh, false, gl!.CLAMP_TO_EDGE);
    blurB = createTarget(bw, bh, false, gl!.CLAMP_TO_EDGE);
    pointer = createDoubleTarget(
      Math.max(1, Math.round(width * 0.5)),
      Math.max(1, Math.round(height * 0.5)),
      halfFloat
    );
    targetsReady = true;
    blurDirty = true;
  }

  function syncCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
      rebuildTargets();
    } else if (!targetsReady) {
      rebuildTargets();
    }
    if (htmlInCanvas) {
      const cssWidth = Math.max(1, Math.round(source.clientWidth));
      const cssHeight = Math.max(1, Math.round(source.clientHeight));
      if (
        source.width !== cssWidth * dpr ||
        source.height !== cssHeight * dpr
      ) {
        source.width = cssWidth * dpr;
        source.height = cssHeight * dpr;
      }
      paintable.requestPaint!();
    }
  }

  syncCanvasSize();

  if (htmlInCanvas) capture.capture();

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    blurDirty = true;
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      gl!.RGBA,
      gl!.RGBA,
      gl!.UNSIGNED_BYTE,
      source
    );
    if (!contentReady) {
      contentReady = true;
      introStart = performance.now();
    }
  }

  function renderBlur() {
    if (!blurDirty || !htmlInCanvas || !blurA || !blurB) return;
    blurDirty = false;
    gl!.useProgram(blurProgram.program);
    gl!.uniform2f(
      blurProgram.uniforms.uTexelSize,
      1 / blurA.width,
      1 / blurA.height
    );
    gl!.uniform1i(blurProgram.uniforms.uScene, bindTexture(contentTexture, 0));
    gl!.uniform2f(blurProgram.uniforms.uStep, 0, 1);
    gl!.uniform1f(blurProgram.uniforms.uFlipY, 1);
    blit(blurA);
    gl!.uniform1i(blurProgram.uniforms.uScene, bindTexture(blurA.texture, 0));
    gl!.uniform2f(blurProgram.uniforms.uStep, 1, 0);
    gl!.uniform1f(blurProgram.uniforms.uFlipY, 0);
    blit(blurB);
  }

  let pointerOn = false;
  let pointerX = 0.5;
  let pointerY = 0.5;
  let prevPointerX = 0.5;
  let prevPointerY = 0.5;
  let lastScrollX = 0;
  let lastScrollY = 0;
  let queuedMelts: Array<[number, number]> = [];

  function renderPointer() {
    if (!pointer) return;
    const cssW = Math.max(output.clientWidth, 1);
    const cssH = Math.max(output.clientHeight, 1);
    const sx = content.scrollLeft;
    const sy = content.scrollTop;
    gl!.useProgram(pointerProgram.program);
    gl!.uniform1i(
      pointerProgram.uniforms.uBack,
      bindTexture(pointer.read.texture, 0)
    );
    gl!.uniform1i(
      pointerProgram.uniforms.uNoise,
      bindTexture(noiseTarget.texture, 1)
    );
    gl!.uniform1f(
      pointerProgram.uniforms.uAspect,
      output.width / Math.max(output.height, 1)
    );
    gl!.uniform2f(
      pointerProgram.uniforms.uBackShift,
      (sx - lastScrollX) / cssW,
      -(sy - lastScrollY) / cssH
    );
    gl!.uniform2f(pointerProgram.uniforms.uScroll, sx / cssW, -sy / cssH);
    gl!.uniform1f(pointerProgram.uniforms.uTextureScale, config.textureScale);
    gl!.uniform1f(pointerProgram.uniforms.uDecay, config.refreeze * 0.001);
    gl!.uniform1f(pointerProgram.uniforms.uMeltNoise, config.meltNoise);
    gl!.uniform1f(
      pointerProgram.uniforms.uMeltStrength,
      config.meltStrength * 0.2
    );
    gl!.uniform1f(pointerProgram.uniforms.uRadius, config.meltRadius);
    gl!.uniform1f(
      pointerProgram.uniforms.uEdgeFade,
      config.meltEdges ? 0 : config.edgeFade
    );
    if (queuedMelts.length > 0) {
      for (const [mx, my] of queuedMelts) {
        gl!.uniform2f(pointerProgram.uniforms.uPoint, mx, 1 - my);
        gl!.uniform2f(pointerProgram.uniforms.uPrevPoint, mx, 1 - my);
        gl!.uniform1f(pointerProgram.uniforms.uTouching, 1);
        blit(pointer.write);
        pointer.swap();
        gl!.uniform1i(
          pointerProgram.uniforms.uBack,
          bindTexture(pointer.read.texture, 0)
        );
        gl!.uniform2f(pointerProgram.uniforms.uBackShift, 0, 0);
      }
      queuedMelts = [];
    } else {
      gl!.uniform2f(pointerProgram.uniforms.uPoint, pointerX, 1 - pointerY);
      gl!.uniform2f(
        pointerProgram.uniforms.uPrevPoint,
        prevPointerX,
        1 - prevPointerY
      );
      gl!.uniform1f(pointerProgram.uniforms.uTouching, pointerOn ? 1 : 0);
      blit(pointer.write);
      pointer.swap();
    }
    lastScrollX = sx;
    lastScrollY = sy;
    prevPointerX = pointerX;
    prevPointerY = pointerY;
  }

  function renderFrost(now: number) {
    if (!frostTarget || !pointer || !blurB) return;
    const cssW = Math.max(output.clientWidth, 1);
    const cssH = Math.max(output.clientHeight, 1);
    gl!.useProgram(frostProgram.program);
    gl!.uniform1i(
      frostProgram.uniforms.uContent,
      bindTexture(contentTexture, 0)
    );
    gl!.uniform1i(frostProgram.uniforms.uBlur, bindTexture(blurB.texture, 1));
    gl!.uniform1i(
      frostProgram.uniforms.uNoise,
      bindTexture(noiseTarget.texture, 2)
    );
    gl!.uniform1i(
      frostProgram.uniforms.uPointer,
      bindTexture(pointer.read.texture, 3)
    );
    gl!.uniform2f(
      frostProgram.uniforms.uScroll,
      content.scrollLeft / cssW,
      -content.scrollTop / cssH
    );
    gl!.uniform1f(
      frostProgram.uniforms.uAspect,
      output.width / Math.max(output.height, 1)
    );
    gl!.uniform1f(frostProgram.uniforms.uTextureScale, config.textureScale);
    gl!.uniform1f(frostProgram.uniforms.uMeltEdges, config.meltEdges ? 1 : 0);
    gl!.uniform1f(frostProgram.uniforms.uIntro, introProgress(now));
    gl!.uniform1f(frostProgram.uniforms.uHighlight, config.highlight);
    gl!.uniform1f(frostProgram.uniforms.uStrength, config.strength);
    gl!.uniform1f(frostProgram.uniforms.uFrost, config.frost);
    gl!.uniform1f(frostProgram.uniforms.uContrast, config.contrast);
    gl!.uniform1f(frostProgram.uniforms.uCrispness, config.crispness);
    gl!.uniform1f(frostProgram.uniforms.uHaze, config.haze);
    gl!.uniform3f(
      frostProgram.uniforms.uTintThin,
      config.tintThin[0],
      config.tintThin[1],
      config.tintThin[2]
    );
    gl!.uniform3f(
      frostProgram.uniforms.uTintThick,
      config.tintThick[0],
      config.tintThick[1],
      config.tintThick[2]
    );
    gl!.uniform1f(frostProgram.uniforms.uTintStrength, config.tintStrength);
    gl!.uniform1f(
      frostProgram.uniforms.uHighlightStrength,
      config.highlightStrength
    );
    gl!.uniform1f(frostProgram.uniforms.uSaturation, config.saturation);
    gl!.uniform1f(frostProgram.uniforms.uBrightness, config.brightness);
    gl!.uniform1f(frostProgram.uniforms.uShimmer, config.shimmer);
    gl!.uniform1f(frostProgram.uniforms.uTime, now / 1000);
    gl!.uniform1f(
      frostProgram.uniforms.uOpacity,
      Math.min(Math.max(config.opacity, 0), 1)
    );
    gl!.uniform1f(frostProgram.uniforms.uHasContent, htmlInCanvas ? 1 : 0);
    blit(frostTarget);
  }

  function renderOutput() {
    if (!frostTarget) return;
    const dpr = output.width / Math.max(output.clientWidth, 1);
    gl!.useProgram(outputProgram.program);
    gl!.uniform1i(
      outputProgram.uniforms.uFrost,
      bindTexture(frostTarget.texture, 0)
    );
    gl!.uniform1i(
      outputProgram.uniforms.uHeights,
      bindTexture(heightTarget.texture, 2)
    );
    gl!.uniform1f(outputProgram.uniforms.uIor, Math.max(config.ior, 1.01));
    gl!.uniform1f(outputProgram.uniforms.uRefraction, config.refraction);
    gl!.uniform1f(outputProgram.uniforms.uDetail, config.detail);
    gl!.uniform1f(outputProgram.uniforms.uTextureScale, config.textureScale);
    gl!.uniform1f(outputProgram.uniforms.uFresnel, config.fresnel);
    gl!.uniform2f(
      outputProgram.uniforms.uScrollPx,
      content.scrollLeft * dpr,
      -content.scrollTop * dpr
    );
    gl!.uniform1f(outputProgram.uniforms.uHasContent, htmlInCanvas ? 1 : 0);
    gl!.uniform1f(outputProgram.uniforms.uFallbackAlpha, 0.85);
    blit(null);
  }

  let raf = 0;
  let destroyed = false;
  let running = false;
  let visible = true;
  let activeUntil = 0;
  let introStart = performance.now();

  function introProgress(now: number) {
    const introMs = Math.max(config.introDuration, 0) * 1000;
    if (introMs <= 0 || reducedMotion) return 1;
    const t = Math.min(Math.max((now - introStart) / introMs, 0), 1);
    return t * t * (3 - 2 * t);
  }

  function refreezeDelayMs() {
    const decay = Math.max(config.refreeze * 0.001, 1e-5);
    return (1 / decay / 60) * 1000 + 500;
  }

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    gl!.disable(gl!.BLEND);
    uploadContent();
    if (!contentReady) {
      running = false;
      return;
    }
    renderBlur();
    renderPointer();
    renderFrost(now);
    renderOutput();

    const animating =
      pointerOn ||
      now < activeUntil ||
      now < introStart + Math.max(config.introDuration, 0) * 1000 + 120 ||
      contentDirty ||
      config.shimmer > 0.001;
    if (!animating) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (destroyed || running || !visible) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  wake = start;
  start();

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    if (!reducedMotion) start();
  }
  motionQuery.addEventListener("change", onMotionChange);

  function onPointerMove(event: PointerEvent) {
    if (reducedMotion) return;
    const rect = output.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / Math.max(rect.width, 1);
    pointerY = (event.clientY - rect.top) / Math.max(rect.height, 1);
    pointerOn = true;
    activeUntil = performance.now() + refreezeDelayMs();
    start();
  }

  function onPointerLeave() {
    pointerOn = false;
    activeUntil = performance.now() + refreezeDelayMs();
    start();
  }

  const listenTarget = output.parentElement ?? output;
  listenTarget.addEventListener("pointermove", onPointerMove as EventListener);
  listenTarget.addEventListener("pointerdown", onPointerMove as EventListener);
  listenTarget.addEventListener(
    "pointerleave",
    onPointerLeave as EventListener
  );
  listenTarget.addEventListener(
    "pointercancel",
    onPointerLeave as EventListener
  );

  function onScroll() {
    activeUntil = Math.max(activeUntil, performance.now() + 400);
    if (htmlInCanvas) paintable.requestPaint?.();
    start();
  }
  content.addEventListener("scroll", onScroll, { passive: true });

  const observer = new ResizeObserver(() => {
    syncCanvasSize();
    start();
  });
  observer.observe(output);

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) start();
  });
  intersection.observe(output);

  return {
    melt(x, y) {
      if (reducedMotion) return;
      queuedMelts.push([x, y]);
      activeUntil = performance.now() + refreezeDelayMs();
      start();
    },
    setOptions(next) {
      const updated = mergeDefinedOptions(config, next);
      const qualityChanged = updated.quality !== config.quality;
      Object.assign(config, updated);
      if (qualityChanged) rebuildTargets();
      activeUntil = Math.max(activeUntil, performance.now() + 100);
      start();
    },
    resize() {
      syncCanvasSize();
      start();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      releaseTarget(frostTarget);
      releaseTarget(blurA);
      releaseTarget(blurB);
      if (pointer) {
        releaseTarget(pointer.read);
        releaseTarget(pointer.write);
      }
      resources.destroy();
      capture.release();
      content.removeEventListener("scroll", onScroll);
      listenTarget.removeEventListener(
        "pointermove",
        onPointerMove as EventListener
      );
      listenTarget.removeEventListener(
        "pointerdown",
        onPointerMove as EventListener
      );
      listenTarget.removeEventListener(
        "pointerleave",
        onPointerLeave as EventListener
      );
      listenTarget.removeEventListener(
        "pointercancel",
        onPointerLeave as EventListener
      );
    },
  };
}
