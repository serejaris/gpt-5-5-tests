(() => {
  const {
    TAU,
    rand,
    clamp,
    distSq
  } = window.Nightbound.Math;

  const currentWave = (game) => 1 + Math.floor(game.elapsed / 30);

  const spawnEnemy = (game, kind = "shade") => {
    const p = game.player;
    const margin = 90;
    const side = Math.floor(rand(0, 4));
    const halfW = game.width / 2 + margin;
    const halfH = game.height / 2 + margin;
    let x = p.x;
    let y = p.y;

    if (side === 0) {
      x += rand(-halfW, halfW);
      y -= halfH;
    } else if (side === 1) {
      x += halfW;
      y += rand(-halfH, halfH);
    } else if (side === 2) {
      x += rand(-halfW, halfW);
      y += halfH;
    } else {
      x -= halfW;
      y += rand(-halfH, halfH);
    }

    const minuteScale = 1 + game.elapsed / 120;
    const specs = {
      wisp: { hp: 14, speed: 92, damage: 7, radius: 10, xp: 3, color: "#63d7ff" },
      shade: { hp: 24, speed: 72, damage: 10, radius: 13, xp: 4, color: "#ff5c99" },
      knight: { hp: 58, speed: 49, damage: 16, radius: 18, xp: 9, color: "#ffd166" },
      brute: { hp: 160, speed: 36, damage: 24, radius: 26, xp: 24, color: "#ff4d5a" }
    };
    const spec = specs[kind];
    const hp = Math.round(spec.hp * minuteScale);

    game.enemies.push({
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      speed: spec.speed * (1 + game.elapsed / 420),
      damage: spec.damage,
      r: spec.radius,
      xp: spec.xp,
      color: spec.color,
      hit: 0,
      contact: 0,
      bladeHit: 0,
      wobble: rand(0, TAU)
    });
  };

  const spawnWave = (game, dt) => {
    game.spawnTimer -= dt;
    game.eliteTimer -= dt;

    if (game.spawnTimer <= 0) {
      const wave = currentWave(game);
      const pack = 2 + Math.floor(wave * 0.75) + Math.floor(game.elapsed / 50);
      for (let i = 0; i < pack; i++) {
        const roll = Math.random();
        if (game.elapsed > 150 && roll < 0.08) spawnEnemy(game, "brute");
        else if (game.elapsed > 70 && roll < 0.25) spawnEnemy(game, "knight");
        else if (roll < 0.48) spawnEnemy(game, "wisp");
        else spawnEnemy(game, "shade");
      }
      game.spawnTimer = Math.max(0.18, 1.22 - game.elapsed * 0.006);
    }

    if (game.eliteTimer <= 0) {
      spawnEnemy(game, game.elapsed > 170 ? "brute" : "knight");
      game.eliteTimer = Math.max(9, 22 - game.elapsed / 20);
    }
  };

  const nearestEnemies = (game, count, maxRange = 900) => {
    const p = game.player;
    return game.enemies
      .filter((e) => e.hp > 0 && distSq(e.x, e.y, p.x, p.y) <= maxRange * maxRange)
      .sort((a, b) => distSq(a.x, a.y, p.x, p.y) - distSq(b.x, b.y, p.x, p.y))
      .slice(0, count);
  };

  const fireBolt = (game, target) => {
    const p = game.player;
    const w = game.weapons.bolt;
    const angle = Math.atan2(target.y - p.y, target.x - p.x) + rand(-0.08, 0.08);
    const speed = w.speed;
    game.bullets.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 5,
      life: 1.35,
      damage: w.damage,
      pierce: Math.max(0, Math.floor(w.level / 3)),
      color: "#63d7ff"
    });
  };

  const updateWeapons = (game, dt) => {
    const bolt = game.weapons.bolt;
    bolt.timer -= dt;
    if (bolt.timer <= 0 && game.enemies.length) {
      nearestEnemies(game, bolt.count).forEach((target) => fireBolt(game, target));
      bolt.timer = bolt.cooldown;
    }

    const pulse = game.weapons.pulse;
    pulse.timer -= dt;
    if (pulse.timer <= 0) {
      let hitAny = false;
      const p = game.player;
      for (const e of game.enemies) {
        if (distSq(e.x, e.y, p.x, p.y) < (pulse.radius + e.r) ** 2) {
          damageEnemy(game, e, pulse.damage, "#54d889");
          hitAny = true;
        }
      }
      if (hitAny) {
        ringParticles(game, p.x, p.y, pulse.radius, "#54d889", 22);
        game.shake = Math.max(game.shake, 2);
      }
      pulse.timer = pulse.cooldown;
    }

    const blade = game.weapons.blade;
    if (blade.count > 0) {
      blade.spin += dt * (2.7 + blade.level * 0.2);
      const p = game.player;
      for (const e of game.enemies) {
        e.bladeHit = Math.max(0, e.bladeHit - dt);
        if (e.bladeHit > 0) continue;
        for (let i = 0; i < blade.count; i++) {
          const a = blade.spin + (i / blade.count) * TAU;
          const bx = p.x + Math.cos(a) * blade.radius;
          const by = p.y + Math.sin(a) * blade.radius;
          if (distSq(e.x, e.y, bx, by) < (e.r + 10) ** 2) {
            damageEnemy(game, e, blade.damage, "#ffd166");
            e.bladeHit = 0.22;
            break;
          }
        }
      }
    }
  };

  const updatePlayer = (game, movementVector, dt) => {
    const p = game.player;
    const move = movementVector();
    p.x += move.x * p.speed * dt;
    p.y += move.y * p.speed * dt;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    game.camera.x += (p.x - game.camera.x) * Math.min(1, dt * 8);
    game.camera.y += (p.y - game.camera.y) * Math.min(1, dt * 8);
  };

  const updateEnemies = (game, dt) => {
    const p = game.player;
    for (const e of game.enemies) {
      e.hit = Math.max(0, e.hit - dt);
      e.contact = Math.max(0, e.contact - dt);
      e.wobble += dt * 3;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const wobble = Math.sin(e.wobble) * 0.22;
      const ax = dx / len * Math.cos(wobble) - dy / len * Math.sin(wobble);
      const ay = dx / len * Math.sin(wobble) + dy / len * Math.cos(wobble);
      e.vx = ax * e.speed;
      e.vy = ay * e.speed;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (distSq(e.x, e.y, p.x, p.y) < (e.r + p.r) ** 2 && e.contact <= 0) {
        e.contact = 0.55;
        damagePlayer(game, e.damage);
        const push = 24;
        e.x -= dx / len * push;
        e.y -= dy / len * push;
      }
    }
  };

  const updateBullets = (game, dt) => {
    for (const b of game.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const e of game.enemies) {
        if (e.hp <= 0 || e.hit > 0.035) continue;
        if (distSq(b.x, b.y, e.x, e.y) < (b.r + e.r) ** 2) {
          damageEnemy(game, e, b.damage, b.color);
          b.pierce -= 1;
          b.life = Math.min(b.life, b.pierce >= 0 ? b.life : 0);
          if (b.life <= 0) break;
        }
      }
    }
    game.bullets = game.bullets.filter((b) => b.life > 0);
  };

  const damagePlayer = (game, amount) => {
    const p = game.player;
    if (p.invulnerable > 0) return;
    p.hp = Math.max(0, p.hp - amount);
    p.invulnerable = 0.18;
    game.shake = Math.max(game.shake, 8);
    addPopup(game, p.x, p.y - 24, `-${Math.round(amount)}`, "#ff4d5a");
    burstParticles(game, p.x, p.y, "#ff4d5a", 10);
  };

  const damageEnemy = (game, enemy, amount, color) => {
    enemy.hp -= amount;
    enemy.hit = 0.09;
    addFloater(game, enemy.x, enemy.y - enemy.r, Math.round(amount).toString(), color);
    burstParticles(game, enemy.x, enemy.y, color, 3);
  };

  const cleanupDeadEnemies = (game) => {
    const alive = [];
    for (const e of game.enemies) {
      if (e.hp <= 0) {
        game.player.kills += 1;
        spawnGem(game, e.x, e.y, e.xp);
        burstParticles(game, e.x, e.y, e.color, 14);
        game.shake = Math.max(game.shake, 3);
      } else {
        alive.push(e);
      }
    }
    game.enemies = alive;
  };

  const spawnGem = (game, x, y, value) => {
    game.gems.push({
      x: x + rand(-8, 8),
      y: y + rand(-8, 8),
      vx: rand(-30, 30),
      vy: rand(-30, 30),
      r: 5 + Math.min(4, value / 8),
      value,
      pulse: rand(0, TAU)
    });
  };

  const updateGems = (game, dt) => {
    const p = game.player;
    for (const g of game.gems) {
      g.pulse += dt * 5;
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      if (d < p.magnet) {
        const pull = 680 * (1 - d / p.magnet);
        g.vx += (dx / d) * pull * dt;
        g.vy += (dy / d) * pull * dt;
      }
      g.vx *= Math.pow(0.08, dt);
      g.vy *= Math.pow(0.08, dt);
      g.x += g.vx * dt;
      g.y += g.vy * dt;
    }

    const remaining = [];
    for (const g of game.gems) {
      if (distSq(g.x, g.y, p.x, p.y) < (g.r + p.r + 7) ** 2) {
        addXp(game, g.value);
        addFloater(game, p.x, p.y - 34, `+${g.value} xp`, "#63d7ff");
      } else {
        remaining.push(g);
      }
    }
    game.gems = remaining;
  };

  const addXp = (game, amount) => {
    const p = game.player;
    p.xp += amount;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.xpNext = Math.round(p.xpNext * 1.28 + 6);
      game.upgradesPending += 1;
    }
  };

  const rollUpgrades = (game) => {
    const p = game.player;
    const w = game.weapons;
    const options = [
      {
        name: "Arc Bolt",
        tag: "Weapon",
        desc: "Bolts hit harder and recharge a little faster.",
        apply: () => {
          w.bolt.level += 1;
          w.bolt.damage += 8;
          w.bolt.cooldown = Math.max(0.34, w.bolt.cooldown - 0.045);
        }
      },
      {
        name: "Split Casting",
        tag: "Weapon",
        desc: "Fire one extra bolt per volley.",
        apply: () => {
          w.bolt.level += 1;
          w.bolt.count += 1;
          w.bolt.cooldown += 0.04;
        }
      },
      {
        name: "Pulse Ward",
        tag: "Aura",
        desc: "Your close-range pulse deals more damage.",
        apply: () => {
          w.pulse.level += 1;
          w.pulse.damage += 6;
          w.pulse.cooldown = Math.max(0.48, w.pulse.cooldown - 0.035);
        }
      },
      {
        name: "Wider Ward",
        tag: "Aura",
        desc: "Increase pulse radius and keep the swarm away.",
        apply: () => {
          w.pulse.level += 1;
          w.pulse.radius += 24;
        }
      },
      {
        name: w.blade.count ? "More Blades" : "Orbit Blade",
        tag: "Weapon",
        desc: w.blade.count ? "Add another spinning blade around you." : "Gain a spinning blade that damages nearby enemies.",
        apply: () => {
          w.blade.level += 1;
          w.blade.count = Math.min(8, w.blade.count + 1);
          w.blade.damage += 5;
          w.blade.radius += w.blade.count === 1 ? 0 : 5;
        }
      },
      {
        name: "Fleet Boots",
        tag: "Core",
        desc: "Move faster and kite denser waves.",
        apply: () => {
          p.speed += 22;
        }
      },
      {
        name: "Deep Pockets",
        tag: "Core",
        desc: "Pull shards from farther away.",
        apply: () => {
          p.magnet += 34;
        }
      },
      {
        name: "Blood Vial",
        tag: "Core",
        desc: "Increase max health and restore some HP.",
        apply: () => {
          p.maxHp += 24;
          p.hp = Math.min(p.maxHp, p.hp + 38);
        }
      }
    ];
    const picked = [];
    const pool = [...options];
    while (picked.length < 3 && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
  };

  const chooseUpgrade = (game, index) => {
    const upgrade = game.offeredUpgrades[index];
    if (!upgrade) return false;
    upgrade.apply();
    burstParticles(game, game.player.x, game.player.y, "#63d7ff", 26);
    return true;
  };

  const burstParticles = (game, x, y, color, count) => {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const speed = rand(40, 190);
      game.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: rand(0.24, 0.62),
        maxLife: 0.62,
        size: rand(2, 5),
        color
      });
    }
  };

  const ringParticles = (game, x, y, radius, color, count) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      game.particles.push({
        x: x + Math.cos(a) * radius,
        y: y + Math.sin(a) * radius,
        vx: Math.cos(a) * 64,
        vy: Math.sin(a) * 64,
        life: 0.34,
        maxLife: 0.34,
        size: 3,
        color
      });
    }
  };

  const addPopup = (game, x, y, text, color) => {
    game.popups.push({ x, y, text, color, life: 0.9 });
  };

  const addFloater = (game, x, y, text, color) => {
    game.floaters.push({ x, y, text, color, life: 0.62 });
  };

  const updateParticles = (game, dt) => {
    for (const p of game.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.08, dt);
      p.vy *= Math.pow(0.08, dt);
      p.life -= dt;
    }
    game.particles = game.particles.filter((p) => p.life > 0);

    for (const f of game.floaters) {
      f.y -= 38 * dt;
      f.life -= dt;
    }
    game.floaters = game.floaters.filter((f) => f.life > 0);

    for (const p of game.popups) {
      p.y -= 28 * dt;
      p.life -= dt;
    }
    game.popups = game.popups.filter((p) => p.life > 0);
  };

  const update = (game, movementVector, dt) => {
    game.dt = dt;
    if (game.mode !== "playing") return;

    game.elapsed += dt;
    game.worldTime += dt;
    game.shake = Math.max(0, game.shake - dt * 24);

    updatePlayer(game, movementVector, dt);
    spawnWave(game, dt);
    updateWeapons(game, dt);
    updateBullets(game, dt);
    updateEnemies(game, dt);
    updateGems(game, dt);
    cleanupDeadEnemies(game);
    updateParticles(game, dt);
  };

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.Simulation = {
    update,
    currentWave,
    rollUpgrades,
    chooseUpgrade
  };
})();
