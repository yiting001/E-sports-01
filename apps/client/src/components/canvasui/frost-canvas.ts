export type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

export interface FrostContentCapture {
  htmlInCanvas: boolean;
  paintable: PaintableCanvas;
  capture: () => void;
  release: () => void;
}

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("canvas") as PaintableCanvas;
  const context = probe.getContext("2d") as ElementImageContext | null;
  return Boolean(
    context &&
      typeof context.drawElementImage === "function" &&
      typeof probe.requestPaint === "function"
  );
}

export function createFrostContentCapture(
  source: HTMLCanvasElement,
  content: HTMLElement,
  onCapture: () => void
): FrostContentCapture {
  const context = source.getContext("2d") as ElementImageContext | null;
  const paintable = source as PaintableCanvas;
  const htmlInCanvas = Boolean(
    context &&
      typeof context.drawElementImage === "function" &&
      typeof paintable.requestPaint === "function"
  );
  const capture = (): void => {
    try {
      context!.reset();
      context!.drawElementImage!(content, 0, 0);
      onCapture();
    } catch {}
  };
  if (htmlInCanvas) paintable.onpaint = capture;

  return {
    htmlInCanvas,
    paintable,
    capture,
    release: () => {
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}
