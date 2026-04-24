(() => {
  const MODEL_STARTS = {
    gpt55: { weapon: "bolt", accent: "#63d7ff" },
    opus: { weapon: "blade", accent: "#ffd166" },
    kimi: { weapon: "pulse", accent: "#54d889" }
  };

  const createState = (modelKey = "gpt55") => {
    const safeModelKey = MODEL_STARTS[modelKey] ? modelKey : "gpt55";
    const state = {
      mode: "menu",
      modelKey: safeModelKey,
      modelAccent: MODEL_STARTS[safeModelKey].accent,
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
        bolt: { active: false, level: 0, timer: 0, cooldown: 0.72, damage: 18, count: 0, speed: 560 },
        pulse: { active: false, level: 0, timer: 0, cooldown: 0.92, damage: 8, radius: 88 },
        blade: { active: false, level: 0, count: 0, damage: 12, radius: 56, spin: 0 }
      },
      enemies: [],
      bullets: [],
      gems: [],
      perkDrops: [],
      particles: [],
      popups: [],
      floaters: [],
      upgradesPending: 0,
      offeredUpgrades: [],
      scoreSubmitted: false
    };

    const startWeapon = MODEL_STARTS[safeModelKey].weapon;
    if (startWeapon === "bolt") {
      state.weapons.bolt.active = true;
      state.weapons.bolt.level = 1;
      state.weapons.bolt.count = 1;
    } else if (startWeapon === "pulse") {
      state.weapons.pulse.active = true;
      state.weapons.pulse.level = 1;
    } else if (startWeapon === "blade") {
      state.weapons.blade.active = true;
      state.weapons.blade.level = 1;
      state.weapons.blade.count = 1;
    }

    return state;
  };

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.State = { createState };
})();
