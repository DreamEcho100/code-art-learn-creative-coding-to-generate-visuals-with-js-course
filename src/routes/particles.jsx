import { createEffect, onCleanup } from "solid-js";

export default function ParticlesScreen() {
  /** @type {HTMLCanvasElement|undefined} */
  let canvasElem;
  /** @typedef {{ x: number; y: number; speedX: number; speedY: number; radius: number }} Particle */
  /** @type {Particle[]} */
  let atoms = [];

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

  createEffect(() => {
    if (!(canvasElem instanceof HTMLCanvasElement)) return;

    const ctx = canvasElem.getContext("2d");
    if (!ctx) return;

    const initRect = canvasElem.getBoundingClientRect();
    /**
     * @type {{
     *    rect: {
     *      top: number;
     *      left: number;
     *      width: number;
     *      height: number;
     *      bottom: number;
     *      right: number;
     *      x: number;
     *      y: number;
     *    };
     *    scale: {
     *      x: number;
     *      y: number;
     *    };
     *}}
     */
    const canvasConfig = {
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
      scale: {
        x: initRect.width / canvasElem.width,
        y: initRect.height / canvasElem.height,
      },
    };

    // let dpr = window.devicePixelRatio || 1;

    // console.log("___ dpr", dpr);

    canvasElem.width = canvasConfig.rect.width;
    canvasElem.height = canvasConfig.rect.height;

    // canvasElem.width = canvasConfig.rect.width * dpr;
    // canvasElem.height = canvasConfig.rect.height * dpr;

    // ctx.scale(dpr, dpr);

    // Debounce resize to avoid ResizeObserver loop errors
    /** @type {number} */
    let resizeTimeout;
    const resizeCanvas = () => {
      const rect = canvasElem.getBoundingClientRect();

      canvasConfig.rect.top = rect.top;
      canvasConfig.rect.left = rect.left;
      canvasConfig.rect.width = rect.width;
      canvasConfig.rect.height = rect.height;
      canvasConfig.rect.bottom = rect.bottom;
      canvasConfig.rect.right = rect.right;
      canvasConfig.rect.x = rect.x;
      canvasConfig.rect.y = rect.y;

      // dpr = window.devicePixelRatio || 1;

      canvasElem.width = canvasConfig.rect.width; // * dpr;
      canvasElem.height = canvasConfig.rect.height; // * dpr;

      canvasConfig.scale.x = canvasElem.width / canvasConfig.rect.width;
      canvasConfig.scale.y = canvasElem.height / canvasConfig.rect.height;

      // ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const debouncedResizeCanvas = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 50);
    };

    // const canvasResizeObserver = new ResizeObserver(debouncedResizeCanvas);
    // canvasResizeObserver.observe(canvasElem);
    // onCleanup(() => {
    //   canvasResizeObserver.disconnect();
    //   clearTimeout(resizeTimeout);
    // });

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
      // ctx.fillStyle = "black";
      ctx.fillStyle = "rgba(0,0,0,0.05)"; // small alpha for trails
      ctx.fillRect(0, 0, canvasElem.width, canvasElem.height);

      // point.x = Math.sin(degree / 180) * Math.PI;
      // point.y = Math.cos(point.x) * Math.cos(point.x);
      // const newAtom = createAtom(
      //   canvasElem.width * 0.5 + point.x * (canvasElem.width * 0.15),
      //   canvasElem.height * 0.25 + point.y * (canvasElem.height * 0.025)
      // );

      // Infinity (lemniscate) path parametric equations
      // x = cos(t), y = sin(t) * cos(t)
      const t = degree * (Math.PI / 180);
      point.x = Math.cos(t);
      point.y = Math.sin(t) * Math.cos(t);
      const newAtom = createAtom(
        canvasElem.width * 0.5 + point.x * (canvasElem.width * 0.25),
        canvasElem.height * 0.5 + point.y * (canvasElem.height * 0.25)
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
      if (typeof animateId !== "number") return;

      cancelAnimationFrame(animateId);
    });
    // animate();

    // sierpinski triangle
    /**
     * @param {Particle} prevAtom
     * @param {number} atomsCount
     * @param {number} atomRadius
     */
    const drawSierpinskiTriangleSetup = (prevAtom, atomsCount, atomRadius) => {
      const topCenterAtom = createAtom(canvasElem.width / 2, 50, atomRadius);
      const leftBottomAtom = createAtom(50, canvasElem.height - 50, atomRadius);
      const rightBottomAtom = createAtom(
        canvasElem.width - 50,
        canvasElem.height - 50,
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
      resizeCanvas();
      ctx.fillStyle = "rgba(0,0,0)";
      ctx.fillRect(0, 0, canvasElem.width, canvasElem.height);

      // PROPLEM: Will, it's like still a few pixels different on the x and y
      const firstAtomRadius = 20;
      const x = (event.clientX - canvasConfig.rect.left) * canvasConfig.scale.x;
      const y = (event.clientY - canvasConfig.rect.top) * canvasConfig.scale.y;
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
