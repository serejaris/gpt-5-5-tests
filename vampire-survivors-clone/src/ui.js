(() => {
  const { clamp, formatTime } = window.Nightbound.Math;
  const { currentWave } = window.Nightbound.Simulation;

  const createUi = (game, actions) => {
    const ui = {
      hpFill: document.getElementById("hpFill"),
      hpText: document.getElementById("hpText"),
      xpFill: document.getElementById("xpFill"),
      xpText: document.getElementById("xpText"),
      timeText: document.getElementById("timeText"),
      levelText: document.getElementById("levelText"),
      killsText: document.getElementById("killsText"),
      waveText: document.getElementById("waveText"),
      weaponList: document.getElementById("weaponList"),
      startOverlay: document.getElementById("startOverlay"),
      levelOverlay: document.getElementById("levelOverlay"),
      gameOverOverlay: document.getElementById("gameOverOverlay"),
      upgradeGrid: document.getElementById("upgradeGrid"),
      runSummary: document.getElementById("runSummary"),
      pauseBadge: document.getElementById("pauseBadge"),
      startBtn: document.getElementById("startBtn"),
      restartBtn: document.getElementById("restartBtn"),
      menuBtn: document.getElementById("menuBtn"),
      debugBtn: document.getElementById("debugBtn")
    };

    const hideAllOverlays = () => {
      ui.startOverlay.classList.add("hidden");
      ui.levelOverlay.classList.add("hidden");
      ui.gameOverOverlay.classList.add("hidden");
    };

    const showMenu = () => {
      hideAllOverlays();
      ui.startOverlay.classList.remove("hidden");
    };

    const showLevelUp = (upgrades) => {
      ui.upgradeGrid.innerHTML = "";
      upgrades.forEach((upgrade, index) => {
        const card = document.createElement("button");
        card.className = "upgrade-card";
        card.innerHTML = `
          <span class="upgrade-name">${upgrade.name}</span>
          <span class="upgrade-desc">${upgrade.desc}</span>
          <span class="upgrade-tag">${upgrade.tag}</span>
        `;
        card.addEventListener("click", () => actions.chooseUpgrade(index));
        ui.upgradeGrid.appendChild(card);
      });
      ui.levelOverlay.classList.remove("hidden");
    };

    const hideLevelUp = () => {
      ui.levelOverlay.classList.add("hidden");
    };

    const showGameOver = () => {
      ui.runSummary.textContent = `You lasted ${formatTime(game.elapsed)}, reached level ${game.player.level}, and cleared ${game.player.kills} enemies.`;
      ui.gameOverOverlay.classList.remove("hidden");
    };

    const updateHud = (force = false) => {
      const p = game.player;
      ui.hpFill.style.width = `${clamp((p.hp / p.maxHp) * 100, 0, 100)}%`;
      ui.xpFill.style.width = `${clamp((p.xp / p.xpNext) * 100, 0, 100)}%`;
      ui.hpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
      ui.xpText.textContent = `${p.xp}/${p.xpNext}`;
      ui.timeText.textContent = formatTime(game.elapsed);
      ui.levelText.textContent = `Level ${p.level}`;
      ui.killsText.textContent = `${p.kills} KOs`;
      ui.waveText.textContent = `Wave ${currentWave(game)}`;
      ui.pauseBadge.classList.toggle("hidden", game.mode !== "paused");

      const hudTick = Math.floor(game.elapsed * 2);
      if (force || hudTick !== updateHud.lastTick) {
        updateHud.lastTick = hudTick;
        const w = game.weapons;
        const rows = [
          ["Arc Bolt", `L${w.bolt.level} / ${w.bolt.count} shots / ${w.bolt.damage} dmg`],
          ["Pulse Ward", `L${w.pulse.level} / ${Math.round(w.pulse.radius)} range / ${w.pulse.damage} dmg`],
          ["Orbit Blade", w.blade.count ? `L${w.blade.level} / ${w.blade.count} blades / ${w.blade.damage} dmg` : "Locked"]
        ];
        const html = rows.map(([name, value]) => `<div class="weapon-row"><strong>${name}</strong><span>${value}</span></div>`).join("");
        if (html !== updateHud.lastWeaponText) {
          ui.weaponList.innerHTML = html;
          updateHud.lastWeaponText = html;
        }
      }
    };

    ui.startBtn.addEventListener("click", actions.startRun);
    ui.restartBtn.addEventListener("click", actions.startRun);
    ui.menuBtn.addEventListener("click", actions.setMenu);
    ui.debugBtn.addEventListener("click", actions.toggleDebug);

    return {
      hideAllOverlays,
      showMenu,
      showLevelUp,
      hideLevelUp,
      showGameOver,
      updateHud
    };
  };

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.Ui = { createUi };
})();
