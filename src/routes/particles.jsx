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
   * @returns {Particle}
   */
  function createAtom(x, y) {
    const randRadiusBaseDecider = Math.random();
    return {
      x,
      y,
      radius:
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
   */
  function drawAtom(atom, ctx) {
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(atom.x, atom.y, atom.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  createEffect(() => {
    if (!(canvasElem instanceof HTMLCanvasElement)) return;

    const ctx = canvasElem.getContext("2d");
    if (!ctx) return;

    canvasElem.width = window.innerWidth;
    canvasElem.height = window.innerHeight;

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
    animate();
  });

  return (
    <canvas id="my-canvas" ref={canvasElem} class="w-full h-full grow"></canvas>
  );
}
