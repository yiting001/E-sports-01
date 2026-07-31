import {
  BLUR_KERNEL,
  FRAG_BLUR,
  FRAG_FROST,
  FRAG_HEIGHT,
  FRAG_NOISE,
  FRAG_OUTPUT,
  FRAG_POINTER,
  HEIGHT_RES,
  NOISE_RES,
  VERT,
  buildBlurWeights,
} from "./frost-shaders";

export interface FrostTarget {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

export interface FrostDoubleTarget {
  readonly read: FrostTarget;
  readonly write: FrostTarget;
  swap: () => void;
}

export interface FrostProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
}

interface FrostPrograms {
  blur: FrostProgram;
  pointer: FrostProgram;
  frost: FrostProgram;
  output: FrostProgram;
}

export interface FrostGlResources {
  programs: FrostPrograms;
  heightTarget: FrostTarget;
  noiseTarget: FrostTarget;
  contentTexture: WebGLTexture;
  createTarget: (
    width: number,
    height: number,
    useHalfFloat: boolean,
    wrap: number
  ) => FrostTarget;
  createDoubleTarget: (
    width: number,
    height: number,
    useHalfFloat: boolean
  ) => FrostDoubleTarget;
  releaseTarget: (target: FrostTarget | null) => void;
  blit: (target: FrostTarget | null) => void;
  bindTexture: (texture: WebGLTexture, unit: number) => number;
  destroy: () => void;
}

export function createFrostGlResources(
  gl: WebGL2RenderingContext,
  output: HTMLCanvasElement
): FrostGlResources {
  const shaders: WebGLShader[] = [];
  const linkedPrograms: WebGLProgram[] = [];

  function compile(type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Frost shader error:", gl.getShaderInfoLog(shader));
    }
    shaders.push(shader);
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, VERT);

  function createProgram(fragmentSource: string): FrostProgram {
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    linkedPrograms.push(program);
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let index = 0; index < count; index += 1) {
      const info = gl.getActiveUniform(program, index)!;
      uniforms[info.name] = gl.getUniformLocation(program, info.name)!;
    }
    return { program, uniforms };
  }

  const noiseProgram = createProgram(FRAG_NOISE);
  const heightProgram = createProgram(FRAG_HEIGHT);
  const programs: FrostPrograms = {
    blur: createProgram(
      FRAG_BLUR.replace("WEIGHTS_PLACEHOLDER", buildBlurWeights(BLUR_KERNEL))
    ),
    pointer: createProgram(FRAG_POINTER),
    frost: createProgram(FRAG_FROST),
    output: createProgram(FRAG_OUTPUT),
  };

  const quad = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function createTarget(
    width: number,
    height: number,
    useHalfFloat: boolean,
    wrap: number
  ): FrostTarget {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      useHalfFloat ? gl.RGBA16F : gl.RGBA8,
      width,
      height,
      0,
      gl.RGBA,
      useHalfFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
      null
    );
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { fbo, texture, width, height };
  }

  function releaseTarget(target: FrostTarget | null): void {
    if (!target) return;
    gl.deleteFramebuffer(target.fbo);
    gl.deleteTexture(target.texture);
  }

  function createDoubleTarget(
    width: number,
    height: number,
    useHalfFloat: boolean
  ): FrostDoubleTarget {
    let read = createTarget(width, height, useHalfFloat, gl.CLAMP_TO_EDGE);
    let write = createTarget(width, height, useHalfFloat, gl.CLAMP_TO_EDGE);
    return {
      get read() {
        return read;
      },
      get write() {
        return write;
      },
      swap() {
        const current = read;
        read = write;
        write = current;
      },
    };
  }

  function blit(target: FrostTarget | null): void {
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.width, target.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, output.width, output.height);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function bindTexture(texture: WebGLTexture, unit: number): number {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    return unit;
  }

  const heightTarget = createTarget(HEIGHT_RES, HEIGHT_RES, false, gl.REPEAT);
  const noiseTarget = createTarget(NOISE_RES, NOISE_RES, false, gl.REPEAT);
  gl.useProgram(heightProgram.program);
  blit(heightTarget);
  gl.useProgram(noiseProgram.program);
  blit(noiseTarget);

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
    new Uint8Array([0, 0, 0, 0])
  );

  return {
    programs,
    heightTarget,
    noiseTarget,
    contentTexture,
    createTarget,
    createDoubleTarget,
    releaseTarget,
    blit,
    bindTexture,
    destroy() {
      releaseTarget(noiseTarget);
      releaseTarget(heightTarget);
      gl.deleteTexture(contentTexture);
      linkedPrograms.forEach((program) => gl.deleteProgram(program));
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteBuffer(quad);
    },
  };
}
