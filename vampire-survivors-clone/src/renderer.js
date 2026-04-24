(() => {
  const {
    TAU,
    rand,
    clamp,
    hash2
  } = window.Nightbound.Math;

  const createRenderer = (canvas, game, input, assets) => {
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      game.width = Math.max(1, Math.floor(rect.width));
      game.height = Math.max(1, Math.floor(rect.height));
      game.dpr = dpr;
      canvas.width = Math.floor(game.width * dpr);
      canvas.height = Math.floor(game.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const screenX = (worldX) => worldX - game.camera.x + game.width / 2;
    const screenY = (worldY) => worldY - game.camera.y + game.height / 2;
    const colorWithAlpha = (hex, alpha) => {
      const value = hex.replace("#", "");
      const full = value.length === 3 ? value.split("").map((char) => char + char).join("") : value;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    };

    const draw = () => {
      const shakeX = game.shake ? rand(-game.shake, game.shake) : 0;
      const shakeY = game.shake ? rand(-game.shake, game.shake) : 0;
      ctx.save();
      ctx.translate(shakeX, shakeY);
      drawBackground();
      drawGems();
      drawPerkDrops();
      drawPulse();
      drawBullets();
      drawEnemies();
      drawBlades();
      drawPlayer();
      drawParticles();
      drawFloatingText();
      if (input.pointerDown) drawTouchStick();
      ctx.restore();
    };

    const drawBackground = () => {
      const w = game.width;
      const h = game.height;
      ctx.fillStyle = "#07080d";
      ctx.fillRect(0, 0, w, h);

      if (assets.floor.complete && assets.floor.naturalWidth) {
        const tile = 820;
        const minX = Math.floor((game.camera.x - w / 2) / tile) - 1;
        const maxX = Math.floor((game.camera.x + w / 2) / tile) + 1;
        const minY = Math.floor((game.camera.y - h / 2) / tile) - 1;
        const maxY = Math.floor((game.camera.y + h / 2) / tile) + 1;

        for (let tx = minX; tx <= maxX; tx++) {
          for (let ty = minY; ty <= maxY; ty++) {
            const sx = Math.floor(screenX(tx * tile));
            const sy = Math.floor(screenY(ty * tile));
            ctx.save();
            ctx.translate(sx + tile / 2, sy + tile / 2);
            if ((tx + ty) % 2) ctx.scale(-1, 1);
            ctx.drawImage(assets.floor, -tile / 2, -tile / 2, tile, tile);
            ctx.restore();
          }
        }
      } else {
        drawFallbackFloor();
      }

      ctx.fillStyle = "rgba(2,5,9,0.22)";
      ctx.fillRect(0, 0, w, h);
      const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.42)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    };

    const drawFallbackFloor = () => {
      const tile = 72;
      const minX = Math.floor((game.camera.x - game.width / 2) / tile) - 1;
      const maxX = Math.floor((game.camera.x + game.width / 2) / tile) + 1;
      const minY = Math.floor((game.camera.y - game.height / 2) / tile) - 1;
      const maxY = Math.floor((game.camera.y + game.height / 2) / tile) + 1;

      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.035)";
      for (let tx = minX; tx <= maxX; tx++) {
        for (let ty = minY; ty <= maxY; ty++) {
          const sx = screenX(tx * tile);
          const sy = screenY(ty * tile);
          ctx.strokeRect(Math.floor(sx), Math.floor(sy), tile, tile);
          const n = hash2(tx, ty);
          if (n > 0.72) {
            ctx.fillStyle = n > 0.93 ? "rgba(255,209,102,0.16)" : "rgba(255,255,255,0.06)";
            ctx.beginPath();
            ctx.ellipse(sx + tile * hash2(tx + 4, ty), sy + tile * hash2(tx, ty + 4), 3 + n * 8, 2 + n * 4, n * TAU, 0, TAU);
            ctx.fill();
          }
        }
      }
    };

    const drawPlayer = () => {
      const p = game.player;
      const x = screenX(p.x);
      const y = screenY(p.y);
      const accent = game.modelAccent || "#63d7ff";
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 42);
      glow.addColorStop(0, colorWithAlpha(accent, 0.42));
      glow.addColorStop(1, colorWithAlpha(accent, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 42, 0, TAU);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      if (p.invulnerable > 0) ctx.globalAlpha = 0.58 + Math.sin(game.worldTime * 45) * 0.22;

      ctx.fillStyle = "#071017";
      ctx.beginPath();
      ctx.ellipse(0, 13, 13, 5, 0, 0, TAU);
      ctx.fill();

      ctx.fillStyle = "#243247";
      ctx.strokeStyle = "#061018";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -19);
      ctx.lineTo(14, -2);
      ctx.lineTo(9, 16);
      ctx.lineTo(-9, 16);
      ctx.lineTo(-14, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#dff7ff";
      ctx.beginPath();
      ctx.arc(0, -9, 9, 0, TAU);
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -25);
      ctx.lineTo(9, -7);
      ctx.lineTo(0, 1);
      ctx.lineTo(-9, -7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawEnemies = () => {
      for (const e of game.enemies) {
        const x = screenX(e.x);
        const y = screenY(e.y);
        const hpRatio = clamp(e.hp / e.maxHp, 0, 1);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(e.wobble) * 0.08);
        ctx.fillStyle = e.hit > 0 ? "#ffffff" : e.color;
        ctx.globalAlpha = e.kind === "wisp" ? 0.82 : 0.94;
        ctx.beginPath();
        if (e.kind === "brute") {
          ctx.rect(-e.r, -e.r * 0.9, e.r * 2, e.r * 1.8);
        } else if (e.kind === "knight") {
          ctx.moveTo(0, -e.r);
          ctx.lineTo(e.r * 0.95, e.r * 0.1);
          ctx.lineTo(e.r * 0.45, e.r);
          ctx.lineTo(-e.r * 0.45, e.r);
          ctx.lineTo(-e.r * 0.95, e.r * 0.1);
          ctx.closePath();
        } else {
          ctx.ellipse(0, 0, e.r * 1.05, e.r * 0.88, 0, 0, TAU);
        }
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.56)";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.70)";
        ctx.beginPath();
        ctx.arc(-e.r * 0.32, -e.r * 0.12, 2, 0, TAU);
        ctx.arc(e.r * 0.32, -e.r * 0.12, 2, 0, TAU);
        ctx.fill();

        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(-e.r, e.r + 6, e.r * 2, 4);
        ctx.fillStyle = hpRatio > 0.5 ? "#54d889" : hpRatio > 0.25 ? "#ffd166" : "#ff4d5a";
        ctx.fillRect(-e.r, e.r + 6, e.r * 2 * hpRatio, 4);
        ctx.restore();
      }
    };

    const drawBullets = () => {
      for (const b of game.bullets) {
        const x = screenX(b.x);
        const y = screenY(b.y);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x, y, b.r, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const drawGems = () => {
      for (const g of game.gems) {
        const x = screenX(g.x);
        const y = screenY(g.y);
        const s = g.r + Math.sin(g.pulse) * 1.3;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "#63d7ff";
        ctx.shadowColor = "#63d7ff";
        ctx.shadowBlur = 12;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
        ctx.shadowBlur = 0;
      }
    };

    const drawPerkDrops = () => {
      for (const drop of game.perkDrops) {
        const x = screenX(drop.x);
        const y = screenY(drop.y);
        const s = drop.r + Math.sin(drop.pulse) * 1.8;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(drop.pulse * 0.38);
        ctx.shadowColor = "#ffb86b";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "rgba(255,184,107,0.18)";
        ctx.strokeStyle = "#ffb86b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i / 6) * TAU;
          const px = Math.cos(a) * s;
          const py = Math.sin(a) * s;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(-s * 0.34, -s * 0.34, s * 0.68, s * 0.68);
        ctx.strokeStyle = "rgba(7,16,23,0.72)";
        ctx.strokeRect(-s * 0.34, -s * 0.34, s * 0.68, s * 0.68);
        ctx.restore();
      }
    };

    const drawPulse = () => {
      const pulse = game.weapons.pulse;
      if (!pulse.active) return;
      const t = clamp(pulse.timer / pulse.cooldown, 0, 1);
      const alpha = (1 - t) * 0.18;
      const p = game.player;
      ctx.strokeStyle = `rgba(84,216,137,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX(p.x), screenY(p.y), pulse.radius * (0.92 + (1 - t) * 0.08), 0, TAU);
      ctx.stroke();
    };

    const drawBlades = () => {
      const blade = game.weapons.blade;
      if (!blade.active || blade.count <= 0) return;
      const p = game.player;
      for (let i = 0; i < blade.count; i++) {
        const a = blade.spin + (i / blade.count) * TAU;
        const x = screenX(p.x + Math.cos(a) * blade.radius);
        const y = screenY(p.y + Math.sin(a) * blade.radius);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = "#ffd166";
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(7, 8);
        ctx.lineTo(0, 4);
        ctx.lineTo(-7, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawParticles = () => {
      for (const p of game.particles) {
        const alpha = clamp(p.life / p.maxLife, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(screenX(p.x), screenY(p.y), p.size * alpha, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawFloatingText = () => {
      ctx.font = "700 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const f of game.floaters) {
        ctx.globalAlpha = clamp(f.life / 0.62, 0, 1);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, screenX(f.x), screenY(f.y));
      }
      ctx.font = "900 16px Inter, system-ui, sans-serif";
      for (const p of game.popups) {
        ctx.globalAlpha = clamp(p.life / 0.9, 0, 1);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, screenX(p.x), screenY(p.y));
      }
      ctx.globalAlpha = 1;
    };

    const drawTouchStick = () => {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(input.startX, input.startY, 44, 0, TAU);
      ctx.fill();
      ctx.stroke();
      const len = Math.min(44, Math.hypot(input.dx, input.dy));
      const a = Math.atan2(input.dy, input.dx);
      ctx.fillStyle = "rgba(99,215,255,0.7)";
      ctx.beginPath();
      ctx.arc(input.startX + Math.cos(a) * len, input.startY + Math.sin(a) * len, 16, 0, TAU);
      ctx.fill();
      ctx.restore();
    };

    window.addEventListener("resize", resize);
    resize();

    return { draw, resize };
  };

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.Renderer = { createRenderer };
})();
