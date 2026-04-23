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
      scoreText: document.getElementById("scoreText"),
      scoreForm: document.getElementById("scoreForm"),
      playerName: document.getElementById("playerName"),
      submitScoreBtn: document.getElementById("submitScoreBtn"),
      scoreStatus: document.getElementById("scoreStatus"),
      menuLeaderboard: document.getElementById("menuLeaderboard"),
      gameOverLeaderboard: document.getElementById("gameOverLeaderboard"),
      pauseBadge: document.getElementById("pauseBadge"),
      startBtn: document.getElementById("startBtn"),
      restartBtn: document.getElementById("restartBtn"),
      menuBtn: document.getElementById("menuBtn"),
      debugBtn: document.getElementById("debugBtn")
    };

    let lastRunStats = null;

    const hideAllOverlays = () => {
      ui.startOverlay.classList.add("hidden");
      ui.levelOverlay.classList.add("hidden");
      ui.gameOverOverlay.classList.add("hidden");
    };

    const showMenu = () => {
      hideAllOverlays();
      ui.startOverlay.classList.remove("hidden");
      refreshLeaderboards();
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

    const showGameOver = (runStats) => {
      lastRunStats = runStats;
      ui.runSummary.textContent = `Мьютон продержался ${formatTime(runStats.survivedSeconds)}, дошел до уровня ${runStats.level} и погасил ${runStats.kills} сбоев.`;
      ui.scoreText.textContent = `Счет: ${runStats.score.toLocaleString("ru-RU")}`;
      ui.scoreStatus.textContent = "";
      ui.playerName.value = localStorage.getItem("myuton-player-name") || "";
      ui.submitScoreBtn.disabled = false;
      ui.submitScoreBtn.textContent = "Сохранить";
      ui.scoreForm.classList.toggle("submitted", game.scoreSubmitted);
      ui.gameOverOverlay.classList.remove("hidden");
      refreshLeaderboards();
      window.setTimeout(() => ui.playerName.focus(), 80);
    };

    const renderLeaderboard = (target, scores) => {
      if (!scores.length) {
        target.innerHTML = "<li>Пока нет результатов</li>";
        return;
      }

      target.innerHTML = scores.slice(0, 10).map((entry, index) => `
        <li>
          <span class="rank">#${index + 1}</span>
          <span class="leader-name">${escapeHtml(entry.name)}</span>
          <strong>${Number(entry.score).toLocaleString("ru-RU")}</strong>
          <span class="leader-meta">${formatTime(entry.survivedSeconds)} · ур. ${entry.level} · ${entry.kills} сбоев</span>
        </li>
      `).join("");
    };

    const refreshLeaderboards = async () => {
      const scores = await window.Nightbound.Leaderboard.fetchScores();
      renderLeaderboard(ui.menuLeaderboard, scores);
      renderLeaderboard(ui.gameOverLeaderboard, scores);
    };

    const updateHud = (force = false) => {
      const p = game.player;
      ui.hpFill.style.width = `${clamp((p.hp / p.maxHp) * 100, 0, 100)}%`;
      ui.xpFill.style.width = `${clamp((p.xp / p.xpNext) * 100, 0, 100)}%`;
      ui.hpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
      ui.xpText.textContent = `${p.xp}/${p.xpNext}`;
      ui.timeText.textContent = formatTime(game.elapsed);
      ui.levelText.textContent = `Ур. ${p.level}`;
      ui.killsText.textContent = `${p.kills} сбоев`;
      ui.waveText.textContent = `Волна ${currentWave(game)}`;
      ui.pauseBadge.classList.toggle("hidden", game.mode !== "paused");

      const hudTick = Math.floor(game.elapsed * 2);
      if (force || hudTick !== updateHud.lastTick) {
        updateHud.lastTick = hudTick;
        const w = game.weapons;
        const rows = [
          ["GPT-разряд", `L${w.bolt.level} · x${w.bolt.count}`],
          ["RAG-щит", `L${w.pulse.level} · ${Math.round(w.pulse.radius)}ctx`],
          ["Оркестратор", w.blade.count ? `L${w.blade.level} · x${w.blade.count}` : "Закрыт"]
        ];
        const html = rows.map(([name, value]) => `<div class="weapon-row"><strong>${name}</strong><span>${value}</span></div>`).join("");
        if (html !== updateHud.lastWeaponText) {
          ui.weaponList.innerHTML = html;
          updateHud.lastWeaponText = html;
        }
      }
    };

    ui.scoreForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!lastRunStats || game.scoreSubmitted) return;

      const name = ui.playerName.value.trim();
      if (name.length < 2) {
        ui.scoreStatus.textContent = "Имя должно быть минимум 2 символа.";
        return;
      }

      ui.submitScoreBtn.disabled = true;
      ui.submitScoreBtn.textContent = "Сохраняю...";
      ui.scoreStatus.textContent = "";

      try {
        await actions.submitScore(name, lastRunStats);
        localStorage.setItem("myuton-player-name", name);
        ui.scoreStatus.textContent = "Результат сохранен.";
        ui.submitScoreBtn.textContent = "Сохранено";
        ui.scoreForm.classList.add("submitted");
        await refreshLeaderboards();
      } catch (error) {
        ui.submitScoreBtn.disabled = false;
        ui.submitScoreBtn.textContent = "Сохранить";
        ui.scoreStatus.textContent = error.message || "Не удалось сохранить результат.";
      }
    });

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
      updateHud,
      refreshLeaderboards
    };
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.Ui = { createUi };
})();
