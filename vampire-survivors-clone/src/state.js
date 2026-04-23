(() => {
  const createState = () => ({
    mode: "menu",
    debug: false,
    lastFrame: 0,
    dt: 0,
    elapsed: 0,
    shake: 0,
    worldTime: 0,
    spawnTimer: 0,
    eliteTimer: 22,
    width: 1,
    height: 1,
    dpr: 1,
    camera: { x: 0, y: 0 },
    player: {
      x: 0,
      y: 0,
      r: 14,
      hp: 100,
      maxHp: 100,
      speed: 210,
      level: 1,
      xp: 0,
      xpNext: 10,
      kills: 0,
      magnet: 94,
      invulnerable: 0
    },
    weapons: {
      bolt: { level: 1, timer: 0, cooldown: 0.72, damage: 18, count: 1, speed: 560 },
      pulse: { level: 1, timer: 0, cooldown: 0.92, damage: 8, radius: 88 },
      blade: { level: 0, count: 0, damage: 12, radius: 56, spin: 0 }
    },
    enemies: [],
    bullets: [],
    gems: [],
    particles: [],
    popups: [],
    floaters: [],
    upgradesPending: 0,
    offeredUpgrades: [],
    scoreSubmitted: false
  });

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.State = { createState };
})();
