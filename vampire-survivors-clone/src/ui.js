(() => {
  const { clamp, formatTime } = window.Nightbound.Math;
  const { currentWave } = window.Nightbound.Simulation;
  const {
    getWeapon,
    menuWeapons,
    arsenalGroups,
    modelList,
    getModel
  } = window.Nightbound.WeaponCatalog;

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
      modelChoices: document.getElementById("modelChoices"),
      menuArsenal: document.getElementById("menuArsenal"),
      menuLeaderboard: document.getElementById("menuLeaderboard"),
      gameOverLeaderboard: document.getElementById("gameOverLeaderboard"),
      pauseBadge: document.getElementById("pauseBadge"),
      startBtn: document.getElementById("startBtn"),
      restartBtn: document.getElementById("restartBtn"),
      menuBtn: document.getElementById("menuBtn")
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
      renderModelChoices();
      renderMenuArsenal();
      refreshLeaderboards();
    };

    const renderModelChoices = () => {
      const selected = actions.getSelectedModel();
      ui.modelChoices.innerHTML = modelList.map((key) => {
        const model = getModel(key);
        const weapon = getWeapon(model.weaponKey);
        const selectedClass = selected === model.key ? "selected" : "";
        return `
          <button type="button" class="model-card ${selectedClass}" data-model="${model.key}" style="--model-accent:${model.accent}; --model-accent-soft:${hexToRgba(model.accent, 0.15)}">
            <span class="model-media">
              <img src="${model.icon}" alt="" class="model-icon">
            </span>
            <span class="model-copy">
              <strong>${model.name}</strong>
              <span>Старт: ${weapon.name}</span>
              <small>${model.description}</small>
            </span>
          </button>
        `;
      }).join("");

      ui.modelChoices.querySelectorAll(".model-card").forEach((card) => {
        card.addEventListener("click", () => {
          actions.selectModel(card.dataset.model);
          renderModelChoices();
        });
      });
    };

    const renderMenuArsenal = () => {
      ui.menuArsenal.innerHTML = arsenalGroups.map((group) => {
        const items = menuWeapons.filter((key) => getWeapon(key).tag === group.tag);
        return `
          <section class="arsenal-section">
            <div class="arsenal-section-title">
              <strong>${group.title}</strong>
              <span>${items.length}</span>
            </div>
            <div class="arsenal-grid">
              ${items.map((key) => {
                const weapon = getWeapon(key);
                return `
                  <article class="arsenal-card" style="--weapon-accent:${weapon.accent}; --weapon-accent-soft:${hexToRgba(weapon.accent, 0.14)}">
                    <img src="${weapon.icon}" alt="" class="arsenal-icon">
                    <div>
                      <div class="arsenal-head">
                        <strong>${weapon.name}</strong>
                        <span>${weapon.tag}</span>
                      </div>
                      <p>${weapon.menuEffect}</p>
                    </div>
                  </article>
                `;
              }).join("")}
            </div>
          </section>
        `;
      }).join("");
    };

    const showLevelUp = (upgrades) => {
      ui.upgradeGrid.innerHTML = "";
      upgrades.forEach((upgrade, index) => {
        const weapon = getWeapon(upgrade.icon);
        const card = document.createElement("button");
        card.className = "upgrade-card";
        card.style.setProperty("--upgrade-accent", weapon.accent);
        card.style.setProperty("--upgrade-accent-soft", hexToRgba(weapon.accent, 0.16));
        card.style.setProperty("--upgrade-accent-glow", hexToRgba(weapon.accent, 0.28));
        card.innerHTML = `
          <span class="upgrade-media">
            <img src="${weapon.icon}" alt="" class="upgrade-icon">
            <span>
              <span class="upgrade-name">${upgrade.name}</span>
              <span class="upgrade-family">${upgrade.tag}</span>
            </span>
          </span>
          <span class="upgrade-effect">
            <span class="effect-label">${upgrade.kind === "unlock" ? "Открытие" : "Эффект"}</span>
            <span>${upgrade.effect}</span>
          </span>
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
      const model = runStats.modelKey ? getModel(runStats.modelKey).name : "выбранная модель";
      ui.runSummary.textContent = `Мьютон (${model}) продержался ${formatTime(runStats.survivedSeconds)}, дошел до уровня ${runStats.level} и погасил ${runStats.kills} сбоев.`;
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
        target.innerHTML = "<li class=\"leaderboard-empty\">Пока нет результатов. Первый ран попадет сюда.</li>";
        return;
      }

      target.innerHTML = scores.slice(0, 10).map((entry, index) => {
        const meta = [
          entry.modelKey ? getModel(entry.modelKey).name : "",
          formatTime(entry.survivedSeconds),
          `ур. ${entry.level}`,
          `${entry.kills} сбоев`
        ].filter(Boolean).join(" · ");

        return `
          <li class="leaderboard-entry ${index === 0 ? "top-run" : ""} rank-${index + 1}">
            <span class="rank">#${index + 1}</span>
            <span class="leader-main">
              <span class="leader-name">${escapeHtml(entry.name)}</span>
              <span class="leader-meta">${meta}</span>
            </span>
            <strong class="leader-score">${Number(entry.score).toLocaleString("ru-RU")}</strong>
          </li>
        `;
      }).join("");
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
        const rows = [];
        if (w.bolt.active) rows.push(["gptBurst", "GPT-разряд", `L${w.bolt.level} · x${w.bolt.count}`]);
        if (w.pulse.active) rows.push(["ragShield", "RAG-щит", `L${w.pulse.level} · ${Math.round(w.pulse.radius)}ctx`]);
        if (w.blade.active) rows.push(["orchestrator", "Оркестратор", `L${w.blade.level} · x${w.blade.count}`]);
        const html = rows.map(([iconKey, name, value]) => {
          const weapon = getWeapon(iconKey);
          return `
            <div class="weapon-row" style="--weapon-accent:${weapon.accent}; --weapon-accent-soft:${hexToRgba(weapon.accent, 0.15)}">
              <img src="${weapon.icon}" alt="" class="weapon-icon">
              <strong>${name}</strong>
              <span>${value}</span>
            </div>
          `;
        }).join("");
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

    ui.startBtn.addEventListener("click", () => actions.startRun());
    ui.restartBtn.addEventListener("click", () => actions.startRun());
    ui.menuBtn.addEventListener("click", actions.setMenu);
    renderModelChoices();
    renderMenuArsenal();

    return {
      hideAllOverlays,
      showMenu,
      showLevelUp,
      hideLevelUp,
      showGameOver,
      updateHud,
      refreshLeaderboards,
      renderModelChoices
    };
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const hexToRgba = (hex, alpha) => {
    const normalized = hex.replace("#", "");
    const value = parseInt(normalized.length === 3
      ? normalized.split("").map((char) => char + char).join("")
      : normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.Ui = { createUi };
})();
