/**
 * @param {HTMLElement} elem
 * @returns {boolean}
 */
function isElementHidden(elem) {
  const style = getComputedStyle(elem);
  return (
    document.hidden ||
    elem.hidden || // html hidden attr
    style.display === "none" ||
    style.visibility === "hidden" ||
    elem.getClientRects().length === 0
  );
}

/**
 * @typedef {{
 *  isResizePending: boolean;
 *  intersectionState: "not-intersecting" | "intersecting" | "unknown";
 *  isHidden: boolean;
 *  dpr: number;
 *  rect: {
 *    top: number;
 *    left: number;
 *    width: number;
 *    height: number;
 *    bottom: number;
 *    right: number;
 *    x: number;
 *    y: number;
 *  };
 * }} CanvasSettings
 */

/**
 * @param {HTMLCanvasElement} canvasElem
 * @param {{
 *  IntersectionObserverOptions?: IntersectionObserverInit | undefined
 *  onCleanup: (fn: () => void) => void;
 *  onResizeChangeEnd?: (dpr: number, canvasSettings: CanvasSettings) => void;
 *  onVisibilitychange?: (isPaused: boolean, canvasSettings: CanvasSettings) => void;
 *  onResizeChangeStart?: (entry: ResizeObserverEntry, canvasSettings: CanvasSettings) => void;
 *  onIntersectionChange?: (entry: IntersectionObserverEntry, isIntersecting: boolean, isHidden: boolean, canvasSettings: CanvasSettings) => void;
 * }} options
 *
 * @example
 *
 * ```js
 *  onResizeChangeEnd: () => {
 *    const dpr = canvasSettings.dpr;
 *    // ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
 *    ctx.setTransform(1, 0, 0, 1, 0, 0);
 *    ctx.scale(dpr, dpr);
 *  },
 * ```
 * @example
 *
 * ```js
 * if (canvasSettings.isResizePending) {
 *   handlePendingResizeCanvas();
 * }
 * ```
 */
export function initCanvasSettings(canvasElem, options) {
  canvasElem.style.setProperty("contain", "layout paint size");
  const handleVisibilitychange = () => {
    canvasSettings.isHidden = isElementHidden(canvasElem);
    options.onVisibilitychange?.(canvasSettings.isHidden, canvasSettings);
  };
  document.addEventListener("visibilitychange", handleVisibilitychange);
  canvasElem.addEventListener("visibilitychange", handleVisibilitychange);
  options.onCleanup(() => {
    document.removeEventListener("visibilitychange", handleVisibilitychange);
    canvasElem.removeEventListener("visibilitychange", handleVisibilitychange);
  });

  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      const isIntersecting =
        !!entry && entry.isIntersecting && entry.intersectionRatio > 0;

      // pause when tab is hidden OR element is not in view
      canvasSettings.isHidden = isElementHidden(canvasElem);
      canvasSettings.intersectionState = isIntersecting
        ? "intersecting"
        : "not-intersecting";

      options.onIntersectionChange?.(
        entry,
        isIntersecting,
        canvasSettings.isHidden,
        canvasSettings
      );
    },
    {
      threshold: 0, // 0 -> fires when any pixel enters/exits
      root: null,
      rootMargin: "0px", // e.g. "200px" to pause earlier when far offscreen
      ...options.IntersectionObserverOptions,
    }
  );

  io.observe(canvasElem);
  options.onCleanup(() => io.disconnect());

  const initRect = canvasElem.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvasElem.width = Math.round(initRect.width * dpr);
  canvasElem.height = Math.round(initRect.height * dpr);
  // options.handleDprChange?.(dpr,canvasSettings);

  /** @type {CanvasSettings} */
  const canvasSettings = {
    isResizePending: true,
    intersectionState: "unknown",
    dpr,
    isHidden: false,
    rect: {
      top: initRect.top,
      left: initRect.left,
      width: initRect.width,
      height: initRect.height,
      bottom: initRect.bottom,
      right: initRect.right,
      x: initRect.x,
      y: initRect.y,
    },
  };

  // Q: Is the following needed?!!
  // let mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  // const handleDprMediaQueryChange = () => {
  //   const nextDpr = window.devicePixelRatio || 1;
  //   canvasSettings.dpr = nextDpr;
  //   options.handleDprChange?.(nextDpr);
  //   mq.removeEventListener("change", handleDprMediaQueryChange);

  //   mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  //   mq.addEventListener("change", handleDprMediaQueryChange);
  //   options.onCleanup(() => {
  //     mq.removeEventListener("change", handleDprMediaQueryChange);
  //   });
  // };
  // mq.addEventListener("change", handleDprMediaQueryChange);
  // options.onCleanup(() => {
  //   mq.removeEventListener("change", handleDprMediaQueryChange);
  // });

  const canvasResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry.target !== canvasElem) return;
    // const offsetLeft = /** @type {HTMLCanvasElement} */ (entry.target)
    //   .offsetLeft;
    // const offsetTop = /** @type {HTMLCanvasElement} */ (entry.target).offsetTop;
    // canvasSettings.rect.top = offsetTop + entry.contentRect.top;
    // canvasSettings.rect.left = offsetLeft + entry.contentRect.left;
    // canvasSettings.rect.width = entry.contentRect.width;
    // canvasSettings.rect.height = entry.contentRect.height;
    // canvasSettings.rect.bottom = offsetTop + entry.contentRect.bottom;
    // canvasSettings.rect.right = offsetLeft + entry.contentRect.right;
    // canvasSettings.rect.x = offsetLeft;
    // canvasSettings.rect.y = offsetTop;

    canvasSettings.rect.width = entry.contentRect.width;
    canvasSettings.rect.height = entry.contentRect.height;

    canvasSettings.isResizePending = true;

    options.onResizeChangeStart?.(entry, canvasSettings);
  });
  canvasResizeObserver.observe(canvasElem);
  options.onCleanup(() => {
    canvasResizeObserver.disconnect();
  });

  const handlePendingResizeCanvas = () => {
    const rect = canvasElem.getBoundingClientRect();
    canvasSettings.rect.top = rect.top;
    canvasSettings.rect.left = rect.left;
    canvasSettings.rect.right = rect.right;
    canvasSettings.rect.bottom = rect.bottom;
    canvasSettings.rect.x = rect.x;
    canvasSettings.rect.y = rect.y;

    const nextDpr = window.devicePixelRatio || 1;

    const width = Math.round(canvasSettings.rect.width * nextDpr);
    const height = Math.round(canvasSettings.rect.height * nextDpr);

    if (
      canvasElem.width === width &&
      canvasElem.height === height &&
      canvasSettings.dpr === nextDpr
    ) {
      //
      canvasSettings.isResizePending = false;
      return;
    }

    canvasSettings.dpr = nextDpr;
    canvasElem.width = width;
    canvasElem.height = height;

    options.onResizeChangeEnd?.(nextDpr, canvasSettings);

    //
    canvasSettings.isResizePending = false;
  };

  return {
    canvasSettings,
    handlePendingResizeCanvas,
  };
}
