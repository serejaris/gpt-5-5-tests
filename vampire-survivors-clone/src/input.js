(() => {
  const { clamp } = window.Nightbound.Math;

  const createInput = (canvas, actions) => {
    const input = {
      keys: new Set(),
      pointerDown: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      dx: 0,
      dy: 0
    };

    const movementVector = () => {
      let x = 0;
      let y = 0;
      if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) x -= 1;
      if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) x += 1;
      if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) y -= 1;
      if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) y += 1;

      if (input.pointerDown) {
        const len = Math.hypot(input.dx, input.dy);
        if (len > 8) {
          x += input.dx / Math.max(60, len);
          y += input.dy / Math.max(60, len);
        }
      }

      const len = Math.hypot(x, y);
      return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
    };

    window.addEventListener("keydown", (event) => {
      input.keys.add(event.code);
      if (event.code === "Enter") actions.startFromMenu();
      if (event.code === "KeyP" || event.code === "Escape") actions.togglePause();
      if (event.code === "Space") actions.restartFromGameOver();
    });

    window.addEventListener("keyup", (event) => {
      input.keys.delete(event.code);
    });

    canvas.addEventListener("pointerdown", (event) => {
      if (!actions.canUsePointer()) return;
      input.pointerDown = true;
      input.pointerId = event.pointerId;
      input.startX = event.clientX;
      input.startY = event.clientY;
      input.dx = 0;
      input.dy = 0;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!input.pointerDown || input.pointerId !== event.pointerId) return;
      input.dx = clamp(event.clientX - input.startX, -72, 72);
      input.dy = clamp(event.clientY - input.startY, -72, 72);
    });

    const releasePointer = (event) => {
      if (event && input.pointerId !== event.pointerId) return;
      input.pointerDown = false;
      input.pointerId = null;
      input.dx = 0;
      input.dy = 0;
    };

    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);

    return { state: input, movementVector };
  };

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.Input = { createInput };
})();
