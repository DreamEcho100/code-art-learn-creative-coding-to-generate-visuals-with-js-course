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
    return {
      x, y,
      radius: Math.random() * 8 + 2,
      speedX: Math.random() * 4 - 2, //-2 +2
      speedY: Math.random() * 4 - 2, //-2 +2
    }
  }

  /** @param {Particle} atom */
  function updateAtomSpeed(atom) {
    atom.x += atom.speedX;
    atom.y += atom.speedY;
  }

  /** @param {Particle} atom */
  function updateAtomSize(atom) {
    atom.radius -= 0.2;
  }

  /**
   * @param {Particle} atom 
   * @param {CanvasRenderingContext2D} ctx 
   */
  function drawAtom(atom, ctx) {
    ctx.beginPath();
    ctx.arc(atom.x, atom.y, atom.radius, 0, Math.PI * 2);
    ctx.fill();
  }



  createEffect(() => {
    console.log("___ canvasElem", canvasElem);
    if (!(canvasElem instanceof HTMLCanvasElement)) return;

    const ctx = canvasElem.getContext('2d');
    if (!ctx) return;

    canvasElem.width = window.innerWidth;
    canvasElem.height = window.innerHeight;

    /** @param {MouseEvent} e  */
    function handleCanvasMouseMove(e) {
      if (atoms.length >= 50_000) return;

      for (let i = 0; i < 50; i++) {
        atoms.push(createAtom(e.x, e.y));
      }
    }

    canvasElem.addEventListener('mousemove', handleCanvasMouseMove);
    onCleanup(() => {
      canvasElem.removeEventListener('mousemove', handleCanvasMouseMove);
    })


    /** @type {number|undefined} */
    let animateId;
    const animate = () => {
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
      };

      for (let i = atomsIndexesToCleanup.length - 1; i > -1; i--) {
        const index = atomsIndexesToCleanup[i];
        atoms[index] = atoms[atoms.length - 1];
        atoms.pop();
      }

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(0, 0, canvasElem.width, canvasElem.height);
      ctx.restore();
      animateId = requestAnimationFrame(animate);
    }

    onCleanup(() => {
      if (typeof animateId !== 'number') return;

      cancelAnimationFrame(animateId);
    })
    animate();

  });

  return <canvas id="my-canvas" ref={canvasElem} class="w-full h-full grow"></canvas>;
}
