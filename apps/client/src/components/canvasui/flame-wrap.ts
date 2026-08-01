import { mergeDefinedOptions } from "./canvas-options";
import {
  resolveFlameWrapOptions,
  type FlameWrapElements,
  type FlameWrapInstance,
  type FlameWrapOptions,
} from "./flame-wrap-options";
import {
  FLAME_WRAP_FRAGMENT_SHADER,
  FLAME_WRAP_VERTEX_SHADER,
} from "./flame-wrap-shaders";

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};
export function supportsHtmlInCanvas(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("canvas") as PaintableCanvas;
  const ctx = probe.getContext("2d") as ElementImageContext | null;
  return Boolean(
    ctx &&
    typeof ctx.drawElementImage === "function" &&
    typeof probe.requestPaint === "function",
  );
}

export function createFlameWrap(
  elements: FlameWrapElements,
  options: FlameWrapOptions = {},
): FlameWrapInstance | null {
  const config = resolveFlameWrapOptions(options);
  const { source, content, output } = elements;

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl || gl.isContextLost()) return null;

  const sourceCtx = source.getContext("2d") as ElementImageContext | null;
  const paintable = source as PaintableCanvas;
  const htmlInCanvas = Boolean(
    sourceCtx &&
    typeof sourceCtx.drawElementImage === "function" &&
    typeof paintable.requestPaint === "function",
  );

  let contentDirty = false;
  let wake = () => {};

  if (htmlInCanvas) {
    paintable.onpaint = () => {
      try {
        sourceCtx!.reset();
        sourceCtx!.drawElementImage!(content, 0, 0);
        contentDirty = true;
        wake();
      } catch {}
    };
  }

  function compile(type: number, text: string): WebGLShader {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, text);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error("FlameWrap shader error:", gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, FLAME_WRAP_VERTEX_SHADER);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, FLAME_WRAP_FRAGMENT_SHADER);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const uniforms: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)!;
    uniforms[info.name] = gl.getUniformLocation(program, info.name)!;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const contentTexture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, contentTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );

  const rect = { cx: 0, cy: 0, hx: 1, hy: 1 };
  let dpr = 1;

  function syncCanvasSize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    const box = htmlInCanvas ? source : content;
    const outRect = output.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    if (outRect.width > 0 && boxRect.width > 0) {
      rect.cx = (boxRect.left + boxRect.right) / 2 - outRect.left;
      rect.cy = outRect.bottom - (boxRect.top + boxRect.bottom) / 2;
      rect.hx = boxRect.width / 2;
      rect.hy = boxRect.height / 2;
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

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      gl!.RGBA,
      gl!.RGBA,
      gl!.UNSIGNED_BYTE,
      source,
    );
    sourceCtx!.clearRect(0, 0, source.width, source.height);
  }

  let time = 0;

  function render() {
    uploadContent();
    gl!.useProgram(program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(uniforms.uContent, 0);
    gl!.uniform2f(uniforms.uResolution, output.width, output.height);
    gl!.uniform1f(uniforms.uTime, time);
    gl!.uniform2f(uniforms.uRectCenter, rect.cx * dpr, rect.cy * dpr);
    gl!.uniform2f(
      uniforms.uRectHalf,
      Math.max(rect.hx * dpr, 1),
      Math.max(rect.hy * dpr, 1),
    );
    gl!.uniform1f(uniforms.uCorner, Math.max(config.radius, 0) * dpr);
    gl!.uniform3f(
      uniforms.uColor,
      config.color[0],
      config.color[1],
      config.color[2],
    );
    gl!.uniform1f(uniforms.uIntensity, Math.max(config.intensity, 0));
    gl!.uniform1f(uniforms.uHeight, Math.max(config.height, 24) * dpr);
    gl!.uniform1f(uniforms.uSpread, Math.max(config.spread, 8) * dpr);
    gl!.uniform1f(uniforms.uScale, Math.max(config.scale, 0.05));
    gl!.uniform1f(uniforms.uTurbulence, Math.max(config.turbulence, 0));
    gl!.uniform1f(uniforms.uTurbScale, Math.max(config.turbulenceScale, 0.2));
    gl!.uniform1f(
      uniforms.uTurbReach,
      Math.max(config.turbulenceReach, 4) * dpr,
    );
    gl!.uniform1f(uniforms.uSparks, Math.max(config.sparks, 0));
    gl!.uniform1f(uniforms.uSparkSize, Math.max(config.sparkSize, 0.2));
    gl!.uniform1f(uniforms.uSparkDensity, Math.max(config.sparkDensity, 0.3));
    gl!.uniform1f(uniforms.uSparkSpeed, Math.max(config.sparkSpeed, 0.05));
    gl!.uniform1f(uniforms.uRim, Math.max(config.rim, 0));
    gl!.uniform1f(uniforms.uMelt, Math.max(config.melt, 0) * dpr);
    gl!.uniform1f(uniforms.uDistortion, Math.max(config.distortion, 0) * dpr);
    gl!.uniform1f(uniforms.uSmoke, Math.max(config.smoke, 0));
    gl!.uniform1f(uniforms.uEmber, Math.max(config.ember, 0));
    gl!.uniform1f(uniforms.uScorch, Math.max(config.scorch, 0));
    gl!.uniform1f(uniforms.uHasContent, htmlInCanvas ? 1 : 0);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  let raf = 0;
  let lastTime = performance.now();
  let destroyed = false;
  let running = false;
  let visible = true;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    if (!reducedMotion) time += delta * config.speed;
    render();
    if (reducedMotion && !contentDirty) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (destroyed || running || !visible) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  wake = start;
  start();

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    start();
  }
  motionQuery.addEventListener("change", onMotionChange);

  const observer = new ResizeObserver(() => {
    syncCanvasSize();
    start();
  });
  observer.observe(output);
  observer.observe(content);

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) start();
  });
  intersection.observe(output);

  return {
    setOptions(next) {
      const updated = mergeDefinedOptions(config, next);
      let changed = false;
      for (const key of Object.keys(updated) as Array<keyof typeof config>) {
        const previous = config[key];
        const value = updated[key];
        if (Array.isArray(value) && Array.isArray(previous)) {
          if (
            value.length !== previous.length ||
            value.some((item, index) => item !== previous[index])
          ) {
            changed = true;
            break;
          }
        } else if (previous !== value) {
          changed = true;
          break;
        }
      }
      Object.assign(config, updated);
      if (!changed) return;
      syncCanvasSize();
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
      gl!.deleteTexture(contentTexture);
      gl!.deleteProgram(program);
      gl!.deleteShader(vertexShader);
      gl!.deleteShader(fragmentShader);
      gl!.deleteBuffer(quad);
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}
