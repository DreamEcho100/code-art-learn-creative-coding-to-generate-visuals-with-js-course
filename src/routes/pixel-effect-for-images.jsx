/** @import { CanvasSettings } from "~/libs/canvas/init-canvas-settings"; */

import { getOwner, onCleanup, onMount, runWithOwner } from "solid-js";
import { initCanvasSettings } from "~/libs/canvas/init-canvas-settings";

/** @typedef {{ x: number; y: number; radius: number; brightness: number; velocity: number; }} Particle */

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

/**
 * @param {Particle} self
 * @param {{ width: number; height: number; }} size
 * @param {number[]} brightnessArr
 * @param {number[]} brightnessArr
 */
function updateParticle(self, size, brightnessArr) {
  self.y += self.velocity;
  if (self.y >= size.height) {
    self.y = 0;
    self.x = Math.random() * size.width;
  }

  const flooredPosX = Math.floor(self.x);
  const flooredPosY = Math.floor(self.y);

  if (
    flooredPosX < 0 ||
    flooredPosX >= size.width ||
    flooredPosY < 0 ||
    flooredPosY >= size.height
  )
    return;

  self.brightness = brightnessArr[flooredPosY * size.width + flooredPosX];
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

export default function PixelEffectForImagesScreen() {
  /** @type {HTMLCanvasElement|undefined} */
  let canvasElem;
  onMount(() => {
    if (!(canvasElem instanceof HTMLCanvasElement)) return;

    const ctx = canvasElem.getContext("2d");
    if (!ctx) return;

    /** @param {() => void} fn */
    const ownedOnCleanup = (fn) => {
      runWithOwner(owner, () => {
        onCleanup(fn);
      });
    };

    const img = new Image();
    img.src = import.meta.resolve("../assets/valorant.png");
    const owner = getOwner();
    img.onload = () => {
      canvasElem.width = img.width;
      canvasElem.height = img.height;

      /** @type {number[]} */
      const brightnessArr = [];
      /** @type {Particle[]} */
      const particlesArr = [];
      /** @type {string[]} */
      const rgbArray = [];

      const imgOriginalSize = {
        width: img.width,
        height: img.height,
      };

      let scaleFactor = 1;
      const scale = { x: 1, y: 1 };
      const offset = { x: 0, y: 0 };

      canvasElem.style.aspectRatio = `${imgOriginalSize.width} / ${imgOriginalSize.height}`;

      const { canvasSettings, handlePendingResizeCanvas } = initCanvasSettings(
        canvasElem,
        {
          onCleanup: ownedOnCleanup,
          handleDprChange: (dpr) => {
            // ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
          },
          onResizeChange: (rect) => {
            // const scaleX = canvasSettings.rect.width / imgOriginalSize.width;
            // const scaleY = canvasSettings.rect.height / imgOriginalSize.height;
            // scale.x = scaleX;
            // scale.y = scaleY;

            scaleFactor = Math.min(
              canvasSettings.rect.width / imgOriginalSize.width,
              canvasSettings.rect.height / imgOriginalSize.height
            );

            scale.x = scaleFactor;
            scale.y = scaleFactor;

            offset.x =
              (canvasSettings.rect.width -
                imgOriginalSize.width * scaleFactor) *
              0.5;

            offset.y =
              (canvasSettings.rect.height -
                imgOriginalSize.height * scaleFactor) *
              0.5;
          },
        }
      );

      // --- IMAGE SPACE INITIALIZATION ---
      canvasElem.width = img.width;
      canvasElem.height = img.height;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, img.width, img.height);

      // draw 1:1 ONLY
      ctx.drawImage(img, 0, 0);

      // sample 1:1 ONLY
      const imgData = ctx.getImageData(0, 0, img.width, img.height);

      ctx.fillRect(0, 0, canvasSettings.rect.width, canvasSettings.rect.height);

      for (let i = 0; i < imgData.data.length; i += 4) {
        const red = imgData.data[i];
        const green = imgData.data[i + 1];
        const blue = imgData.data[i + 2];
        const brightness = (red + green + blue) / 3;
        brightnessArr.push(brightness);
        rgbArray.push(`rgb(${red}, ${green}, ${blue})`);
      }

      // const imageWidth = img.width;
      // const imageHeight = img.height;

      // const size = {
      //   width: imageWidth,
      //   height: imageHeight,
      // };

      //generate 10_000 particles
      for (let i = 0; i < 10_000; i++) {
        particlesArr.push(createParticle(imgOriginalSize));
      }

      /** @type {number|undefined} */
      let animateId;
      const animate = () => {
        if (canvasSettings.isResizePending) {
          handlePendingResizeCanvas();
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = "black";
        ctx.fillRect(
          0,
          0,
          canvasSettings.rect.width,
          canvasSettings.rect.height
        );

        // ctx.setTransform(scale.x, 0, 0, scale.y, 0, 0);
        ctx.setTransform(scale.x, 0, 0, scale.y, offset.x, offset.y);
        // ctx.setTransform(scaleFactor, 0, 0, scaleFactor, offsetX, offsetY);

        for (let i = 0; i < particlesArr.length; i++) {
          const particle = particlesArr[i];
          updateParticle(particle, imgOriginalSize, brightnessArr);
          ctx.globalAlpha = particle.brightness * 0.002;
          drawParticle(particle, ctx, imgOriginalSize, rgbArray);
        }

        animateId = requestAnimationFrame(animate);
      };
      ownedOnCleanup(() => {
        if (typeof animateId === "number") cancelAnimationFrame(animateId);
      });
      animate();
    };
  });

  return <canvas ref={canvasElem} />;
}
