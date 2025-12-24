/** @import { CanvasSettings } from "~/libs/canvas/init-canvas-settings"; */

import { getOwner, onCleanup, onMount, runWithOwner } from "solid-js";
import { initCanvasSettings } from "~/libs/canvas/init-canvas-settings";

// Particle model (unchanged behavior, typed)
/**
 * @typedef {{
 *   x: number;
 *   y: number;
 *   radius: number;
 *   brightness: number;
 *   velocity: number;
 * }} Particle
 */

/**
 * @param {{ width: number; height: number; }} size
 * @param {number} [x]
 * @param {number} [y]
 * @param {number} [radius]
 * @param {number} [brightness]
 * @param {number} [velocity]
 * @returns {Particle}
 */
function createParticle(size, x, y, radius, brightness, velocity) {
  return {
    x: x ?? Math.random() * size.width,
    y: y ?? 0,
    radius: radius ?? Math.random() * 1.5 + 1,
    brightness: brightness ?? 0,
    velocity: velocity ?? Math.random() * 3 + 0.1,
  };
}

// /**
//  * @param {Particle} self
//  * @param {{ width: number; height: number; }} size
//  * @param {number[]} brightnessArr
//  * @param {number[]} brightnessArr
//  */
// function updateParticle(self, size, brightnessArr) {
//   self.y += self.velocity;
//   if (self.y >= size.height) {
//     self.y = 0;
//     self.x = Math.random() * size.width;
//   }

//   const flooredPosX = Math.floor(self.x);
//   const flooredPosY = Math.floor(self.y);

//   if (
//     flooredPosX < 0 ||
//     flooredPosX >= size.width ||
//     flooredPosY < 0 ||
//     flooredPosY >= size.height
//   )
//     return;

//   self.brightness = brightnessArr[flooredPosY * size.width + flooredPosX];
// }

/**
 * Updates a particle's position and samples color from the image.
 *
 * @param {Particle} p - The particle to update
 * @param {ImageSampler} sampler - The image data sampler
 */
function updateParticle(p, sampler) {
  // Move the particle downward by its velocity
  // Each particle falls at a different speed (0.1 to 3.1 pixels/frame)
  p.y += p.velocity;

  // Wrap particle to top if it falls off the bottom
  // This creates an infinite "rain" effect
  if (p.y >= sampler.height) {
    p.y = 0; // Reset to top
    p.x = Math.random() * sampler.width; // Randomize horizontal position
  }

  // Convert particle's float position to integer pixel coordinates
  // The bitwise OR (| 0) is a fast way to floor the number
  // Clamp values to prevent out-of-bounds array access
  const ix = Math.max(0, Math.min(sampler.width - 1, p.x | 0));
  const iy = Math.max(0, Math.min(sampler.height - 1, p.y | 0));

  // Convert 2D coordinates (x, y) to 1D array index
  // Formula: row * width + column
  // Example: pixel at (5, 3) in 100-wide image = 3 * 100 + 5 = 305
  const idx = iy * sampler.width + ix;

  // Sample the image pixel data at this position
  // The particle adopts the color/brightness of whatever pixel it's over
  p.brightness = sampler.brightness[idx]; // Grayscale value (0-255)
}

/**
 * @param {Particle} self
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ width: number; height: number; }} size
 * @param {string[]} rgbArr
 */
function drawParticle(self, ctx, size, rgbArr) {
  const flooredPosX = Math.floor(self.x);
  const flooredPosY = Math.floor(self.y);

  if (
    flooredPosX < 0 ||
    flooredPosX >= size.width ||
    flooredPosY < 0 ||
    flooredPosY >= size.height
  )
    return;

  ctx.beginPath();
  ctx.fillStyle = rgbArr[flooredPosY * size.width + flooredPosX];
  ctx.arc(self.x, self.y, self.radius, 0, Math.PI * 2);
  ctx.fill();
}

// ImageSampler utility (typed, cheap, explicit)
/**
 * @typedef {{
 *  width: number;
 *  height: number;
 *  brightness: Float32Array;
 *  r: Uint8Array;
 *  g: Uint8Array;
 *  b: Uint8Array;
 *  rgbStrArr: string[];
 *  scale: number;
 *  offset: { x: number; y: number };
 * }} ImageSampler
 */

/**
 * Recalculates canvas dimensions and image positioning based on DPR and container size.
 * This ensures the image scales properly when the browser is zoomed or the window is resized.
 *
 * @param {HTMLCanvasElement} canvasElem - The canvas element to resize
 * @param {CanvasSettings} canvasSettings - Settings containing DPR and dimensions
 * @param {ImageSampler} sampler - Image sampler to update with new scale/offset
 */
function recalculateSamplerOffsetAndScale(canvasElem, canvasSettings, sampler) {
  // Get the device pixel ratio (changes when user zooms browser)
  // DPR = 1 at 100% zoom, 2 at 200% zoom, 0.5 at 50% zoom, etc.
  const dpr = canvasSettings.dpr;

  // Get the canvas container's dimensions (in CSS pixels)
  const canvasRect = canvasSettings.rect;

  // Set the canvas drawing buffer size (in physical pixels)
  // Multiply by DPR to get enough pixels for crisp rendering at current zoom
  // Example: 800px wide container at 2x DPR = 1600 physical pixels
  canvasElem.width = canvasRect.width * dpr;
  canvasElem.height = canvasRect.height * dpr;

  // Calculate uniform scale to fit image inside canvas
  // Uses "contain" logic - scale to fit width OR height (whichever is smaller)
  // This maintains the image's aspect ratio
  sampler.scale = Math.min(
    (canvasRect.width * dpr) / sampler.width, // Scale to fit width
    (canvasRect.height * dpr) / sampler.height // Scale to fit height
  );

  // Center the scaled image within the canvas
  // Calculate how much space is left over after scaling, then divide by 2
  // offset.x = horizontal centering offset
  sampler.offset.x =
    (canvasRect.width * dpr - sampler.width * sampler.scale) * 0.5;

  // offset.y = vertical centering offset
  sampler.offset.y =
    (canvasRect.height * dpr - sampler.height * sampler.scale) * 0.5;
}

/**
 * Samples an image into typed arrays (1:1 image space).
 *
 * @param {HTMLImageElement} img
 * @returns {ImageSampler}
 */
function createImageSampler(img) {
  const { width, height } = img;

  // Create a temporary canvas for sampling
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");

  if (!tempCtx) throw new Error("Failed to get temp context");

  tempCtx.drawImage(img, 0, 0);
  const imgData = tempCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const brightness = new Float32Array(width * height);
  const r = new Uint8Array(width * height);
  const g = new Uint8Array(width * height);
  const b = new Uint8Array(width * height);
  const rgbStrArr = new Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];

    r[p] = red;
    g[p] = green;
    b[p] = blue;
    rgbStrArr[p] = `rgb(${red},${green},${blue})`;
    brightness[p] = (red + green + blue) / 3;
  }

  return {
    width,
    height,
    brightness,
    r,
    g,
    b,
    rgbStrArr,
    scale: 1,
    offset: { x: 0, y: 0 },
  };
}

export default function PixelEffectForImagesScreen() {
  /** @type {HTMLCanvasElement|undefined} */
  let canvasElem;
  onMount(() => {
    if (!(canvasElem instanceof HTMLCanvasElement)) {
      console.error("Canvas element is not available");
      return;
    }

    const ctx = canvasElem.getContext("2d");
    if (!ctx) {
      console.error("Failed to get canvas context");
      return;
    }

    const owner = getOwner();
    /** @param {() => void} fn */
    const ownedOnCleanup = (fn) => runWithOwner(owner, () => onCleanup(fn));

    const img = new Image();
    // You can visit https://squoosh.app/ to optimize images
    img.src = import.meta.resolve("../assets/ColorWall-1qq7r9.jpg");

    img.onload = () => {
      // Check image dimensions before processing
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      const MAX_PIXELS = MAX_WIDTH * MAX_HEIGHT;

      if (img.width > MAX_WIDTH || img.height > MAX_HEIGHT) {
        console.warn(
          `Image too large (${img.width}×${img.height}). Maximum recommended: ${MAX_WIDTH}×${MAX_HEIGHT}`
        );
      }

      const totalPixels = img.width * img.height;
      if (totalPixels > MAX_PIXELS) {
        const errorMsg = `Image has ${totalPixels.toLocaleString()} pixels. Maximum recommended: ${MAX_PIXELS.toLocaleString()}`;

        console.error(errorMsg);
        alert(errorMsg);
        // return early to prevent processing
        return;
      }

      const sampler = createImageSampler(img);

      canvasElem.width = sampler.width;
      canvasElem.height = sampler.height;
      canvasElem.style.aspectRatio = `${sampler.width} / ${sampler.height}`;

      const { canvasSettings, handlePendingResizeCanvas } = initCanvasSettings(
        canvasElem,
        {
          onCleanup: ownedOnCleanup,
          onResizeChangeEnd() {
            recalculateSamplerOffsetAndScale(
              canvasElem,
              canvasSettings,
              sampler
            );
          },
        }
      );

      recalculateSamplerOffsetAndScale(canvasElem, canvasSettings, sampler);

      // const particleCount = 10_000;
      // Calculate particle count based on image size
      // Target density: ~7 particles per 1000 pixels
      // Min: 5,000 particles, Max: 40,000 particles
      const targetDensity = 0.007; // 7 particles per 1000 pixels
      const calculatedParticles = Math.floor(totalPixels * targetDensity);
      const particleCount = Math.max(
        5000,
        Math.min(40000, calculatedParticles)
      );

      console.log(
        `Image: ${img.width}×${
          img.height
        } (${totalPixels.toLocaleString()} pixels) - Using ${particleCount.toLocaleString()} particles`
      );
      const particlesArr = new Array(particleCount);
      //generate particleCount particles
      for (let i = 0; i < particleCount; i++) {
        particlesArr[i] = createParticle(sampler);
      }

      /** @type {number|undefined} */
      let animateId;
      const animate = () => {
        if (canvasSettings.isResizePending) {
          handlePendingResizeCanvas();
        }

        // Clear in screen space
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvasElem.width, canvasElem.height);

        // Enter image space
        ctx.setTransform(
          sampler.scale,
          0,
          0,
          sampler.scale,
          sampler.offset.x,
          sampler.offset.y
        );

        for (let i = 0; i < particlesArr.length; i++) {
          const particle = particlesArr[i];
          updateParticle(particle, sampler);

          const ix = Math.max(0, Math.min(sampler.width - 1, particle.x | 0));
          const iy = Math.max(0, Math.min(sampler.height - 1, particle.y | 0));
          const idx = iy * sampler.width + ix;

          ctx.globalAlpha = Math.min(sampler.brightness[idx] * 0.008, 1);
          ctx.fillStyle = sampler.rgbStrArr[idx];

          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        animateId = requestAnimationFrame(animate);
      };
      ownedOnCleanup(() => {
        if (typeof animateId === "number") cancelAnimationFrame(animateId);
      });
      animate();
    };
  });

  return <canvas ref={canvasElem} class="w-full h-full max-w-full" />;
}
