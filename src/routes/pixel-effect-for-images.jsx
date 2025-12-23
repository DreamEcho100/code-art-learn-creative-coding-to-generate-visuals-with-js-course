import { onCleanup, onMount } from "solid-js";
import { initCanvasSettings } from "~/libs/canvas/init-canvas-settings";

export default function PixelEffectForImagesScreen() {
  /** @type {HTMLCanvasElement|undefined} */
  let canvasElem;
  /** @typedef {{ x: number; y: number; speedX: number; speedY: number; radius: number }} Particle */

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

    /** @type {number|undefined} */
    let animateId;
    const animate = () => {
      if (canvasSettings.isResizePending) {
        handlePendingResizeCanvas();
      }

      // ctx.fillStyle = "black";
      ctx.fillStyle = "rgba(0,0,0,0.05)"; // small alpha for trails
      ctx.fillRect(0, 0, canvasSettings.rect.width, canvasSettings.rect.height);

      animateId = requestAnimationFrame(animate);
    };

    onCleanup(() => {
      if (typeof animateId === "number") cancelAnimationFrame(animateId);
    });
    // animate();
  });

  return <canvas ref={canvasElem} class="w-full h-full grow" />;
}
