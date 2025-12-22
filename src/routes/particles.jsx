import { onCleanup, onMount } from "solid-js";

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
 *  handleDprChange?: (dpr: number) => void;
 *  onVisibilitychange?: (isPaused: boolean) => void;
 *  onResizeChange?: (entry: ResizeObserverEntry) => void;
 *  onIntersectionChange?: (entry: IntersectionObserverEntry, isIntersecting: boolean, isHidden: boolean) => void;
 * }} options
 */
function initCanvasSettings(canvasElem, options) {
  canvasElem.style.setProperty("contain", "layout paint size");
  const handleVisibilitychange = () => {
    canvasSettings.isHidden = isElementHidden(canvasElem);
    options.onVisibilitychange?.(canvasSettings.isHidden);
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
        canvasSettings.isHidden
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
  options.handleDprChange?.(dpr);

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

    options.onResizeChange?.(entry);
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

    options.handleDprChange?.(nextDpr);

    //
    canvasSettings.isResizePending = false;
  };

  return {
    canvasSettings,
    handlePendingResizeCanvas,
  };
}

export default function ParticlesScreen() {
  /** @type {HTMLCanvasElement|undefined} */
  let canvasElem;
  /** @typedef {{ x: number; y: number; speedX: number; speedY: number; radius: number }} Particle */
  /** @type {Particle[]} */
  const atoms = [];

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} [radius]
   * @returns {Particle}
   */
  function createAtom(x, y, radius) {
    const randRadiusBaseDecider = Math.random();
    return {
      x,
      y,
      radius:
        radius ??
        randRadiusBaseDecider * 8 +
          (randRadiusBaseDecider < 0.3
            ? 2
            : randRadiusBaseDecider < 0.6
            ? 4
            : randRadiusBaseDecider < 0.99
            ? 6
            : 18), // 2~10, 4~14, 6~16, 18~26
      speedX: Math.random() * 6 - 2, //-2 +2
      speedY: Math.random() * 6 - 2, //-2 +2
    };
  }

  /** @param {Particle} atom */
  function updateAtomSpeed(atom) {
    atom.x += atom.speedX;
    atom.y += atom.speedY;
  }

  /** @param {Particle} atom */
  function updateAtomSize(atom) {
    atom.radius -= 0.1;
  }

  /**
   * @param {Particle} atom
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} [color]
   */
  function drawAtom(atom, ctx, color) {
    ctx.beginPath();
    ctx.fillStyle = color ?? "white";
    ctx.arc(atom.x, atom.y, atom.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  onMount(() => {
    if (!(canvasElem instanceof HTMLCanvasElement)) return;

    const ctx = canvasElem.getContext("2d");
    if (!ctx) return;

    const { canvasSettings, handlePendingResizeCanvas } = initCanvasSettings(
      canvasElem,
      {
        onCleanup,
        handleDprChange: (dpr) => {
          // ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
        },
      }
    );

    // /** @param {MouseEvent} e  */
    // function handleCanvasMouseMove(e) {
    //   if (atoms.length >= 50_000) return;

    //   for (let i = 0; i < 50; i++) {
    //     atoms.push(createAtom(e.x, e.y));
    //   }
    // }

    // canvasElem.addEventListener("mousemove", handleCanvasMouseMove);
    // onCleanup(() => {
    //   canvasElem.removeEventListener("mousemove", handleCanvasMouseMove);
    // });

    const point = {
      x: 0,
      y: 0,
    };
    let degree = 0;

    /** @type {number|undefined} */
    let animateId;
    const animate = () => {
      if (canvasSettings.isResizePending) {
        handlePendingResizeCanvas();
      }

      // ctx.fillStyle = "black";
      ctx.fillStyle = "rgba(0,0,0,0.05)"; // small alpha for trails
      ctx.fillRect(0, 0, canvasSettings.rect.width, canvasSettings.rect.height);

      // point.x = Math.sin(degree / 180) * Math.PI;
      // point.y = Math.cos(point.x) * Math.cos(point.x);
      // const newAtom = createAtom(
      //   canvasSettings.rect.width * 0.5 + point.x * (canvasSettings.rect.width * 0.15),
      //   canvasSettings.rect.height * 0.25 + point.y * (canvasSettings.rect.height * 0.025)
      // );

      // Infinity (lemniscate) path parametric equations
      // x = cos(t), y = sin(t) * cos(t)
      const t = degree * (Math.PI / 180);
      point.x = Math.cos(t);
      point.y = Math.sin(t) * Math.cos(t);
      const newAtom = createAtom(
        canvasSettings.rect.width * 0.5 +
          point.x * (canvasSettings.rect.width * 0.25),
        canvasSettings.rect.height * 0.5 +
          point.y * (canvasSettings.rect.height * 0.25)
      );

      degree += 4;

      atoms.push(newAtom);

      const atomsIndexesToCleanup = [];
      for (let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];
        drawAtom(atom, ctx);
        updateAtomSpeed(atom);
        updateAtomSize(atom);

        if (atom.radius < 0.3) {
          // atoms.splice(i, 1);
          atomsIndexesToCleanup.push(i);
        }
      }

      for (let i = atomsIndexesToCleanup.length - 1; i > -1; i--) {
        const index = atomsIndexesToCleanup[i];
        atoms[index] = atoms[atoms.length - 1];
        atoms.pop();
      }

      animateId = requestAnimationFrame(animate);
    };

    onCleanup(() => {
      if (typeof animateId === "number") cancelAnimationFrame(animateId);
    });
    // animate();

    // sierpinski triangle
    /**
     * @param {Particle} prevAtom
     * @param {number} atomsCount
     * @param {number} atomRadius
     */
    const drawSierpinskiTriangleSetup = (prevAtom, atomsCount, atomRadius) => {
      const topCenterAtom = createAtom(
        canvasSettings.rect.width / 2,
        50,
        atomRadius
      );
      const leftBottomAtom = createAtom(
        50,
        canvasSettings.rect.height - 50,
        atomRadius
      );
      const rightBottomAtom = createAtom(
        canvasSettings.rect.width - 50,
        canvasSettings.rect.height - 50,
        atomRadius
      );
      const triangleCorners = /** @type {const} */ ([
        topCenterAtom,
        leftBottomAtom,
        rightBottomAtom,
      ]);

      for (const atom of triangleCorners) {
        drawAtom(atom, ctx);
      }
      /** @type {Particle} */
      let randomAtomCornor;
      /** @type {Particle} */
      let middleAtom;

      for (let i = 0; i < atomsCount; i++) {
        randomAtomCornor =
          triangleCorners[Math.floor(Math.random() * triangleCorners.length)];

        middleAtom = createAtom(
          (prevAtom.x + randomAtomCornor.x) * 0.5,
          (prevAtom.y + randomAtomCornor.y) * 0.5,
          atomRadius
        );
        drawAtom(middleAtom, ctx);
        prevAtom = middleAtom;
      }
    };

    /** @param {PointerEvent} event */
    const handleDrawSierpinskiTriangle = (event) => {
      if (canvasSettings.isResizePending) {
        handlePendingResizeCanvas();
      }

      ctx.fillStyle = "rgba(0,0,0)";
      ctx.fillRect(0, 0, canvasSettings.rect.width, canvasSettings.rect.height);

      // PROPLEM: Will, it's like still a few pixels different on the x and y
      const firstAtomRadius = 20;
      // const x = (event.clientX - canvasSettings.rect.left) * canvasSettings.scale.x;
      // const y = (event.clientY - canvasSettings.rect.top) * canvasSettings.scale.y;
      const x = event.clientX - canvasSettings.rect.left;
      const y = event.clientY - canvasSettings.rect.top;
      const firstAtom = createAtom(x, y, firstAtomRadius);
      drawAtom(firstAtom, ctx);

      // Draw red center dot at the SAME coordinates (x, y)
      const firstAtomRadiusCenter = firstAtomRadius * 0.1;
      const centerAtom = createAtom(x, y, firstAtomRadiusCenter);
      drawAtom(centerAtom, ctx, "red");

      // Draw crosshair for debugging
      const crosshairPadding = firstAtomRadius * 0.8;
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - crosshairPadding, y);
      ctx.lineTo(x + crosshairPadding, y);
      ctx.moveTo(x, y - crosshairPadding);
      ctx.lineTo(x, y + crosshairPadding);
      ctx.stroke();

      drawSierpinskiTriangleSetup(firstAtom, 100_000, 1);
    };

    canvasElem.addEventListener("pointerdown", handleDrawSierpinskiTriangle, {
      capture: false,
    });

    onCleanup(() => {
      canvasElem.removeEventListener(
        "pointerdown",
        handleDrawSierpinskiTriangle,
        { capture: false }
      );
    });
  });

  return (
    <canvas id="my-canvas" ref={canvasElem} class="w-full h-full grow"></canvas>
  );
}
