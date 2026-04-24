(() => {
  const { createState } = window.Nightbound.State;
  const { loadAssets } = window.Nightbound.Assets;
  const { createInput } = window.Nightbound.Input;
  const { createRenderer } = window.Nightbound.Renderer;
  const { getModel } = window.Nightbound.WeaponCatalog;
  const Simulation = window.Nightbound.Simulation;

  const canvas = document.getElementById("canvas");
  let selectedModelKey = getModel(localStorage.getItem("myuton-model-key") || "gpt55").key;
  const game = createState(selectedModelKey);
  const assets = loadAssets();

  let renderer;
  let ui;
  let input;

  const resetRun = (modelKey = selectedModelKey) => {
    selectedModelKey = getModel(modelKey).key;
    Object.assign(game, createState(selectedModelKey));
    if (renderer) renderer.resize();
    if (ui) ui.updateHud(true);
  };

  const startRun = () => {
    resetRun(selectedModelKey);
    game.mode = "playing";
    ui.hideAllOverlays();
    game.lastFrame = performance.now();
  };

  const setMenu = () => {
    resetRun();
    game.mode = "menu";
    ui.showMenu();
  };

  const endRun = () => {
    game.mode = "gameover";
    ui.showGameOver(Simulation.getRunStats(game));
  };

  const showLevelUp = () => {
    game.mode = "levelup";
    game.upgradesPending -= 1;
    game.offeredUpgrades = Simulation.rollUpgrades(game);
    ui.showLevelUp(game.offeredUpgrades);
  };

  const chooseUpgrade = (index) => {
    if (!Simulation.chooseUpgrade(game, index)) return;
    game.mode = "playing";
    ui.hideLevelUp();
    if (game.upgradesPending > 0) {
      window.setTimeout(showLevelUp, 100);
    }
    ui.updateHud(true);
  };

  const togglePause = () => {
    if (game.mode === "playing") game.mode = "paused";
    else if (game.mode === "paused") game.mode = "playing";
    ui.updateHud(true);
  };

  const actions = {
    startRun,
    setMenu,
    chooseUpgrade,
    togglePause,
    selectModel: (modelKey) => {
      selectedModelKey = getModel(modelKey).key;
      localStorage.setItem("myuton-model-key", selectedModelKey);
      if (game.mode === "menu") {
        resetRun(selectedModelKey);
        game.mode = "menu";
      }
    },
    getSelectedModel: () => selectedModelKey,
    submitScore: async (name, runStats) => {
      if (game.scoreSubmitted) throw new Error("Этот результат уже сохранен.");
      const result = await window.Nightbound.Leaderboard.submitScore({
        name,
        ...runStats
      });
      game.scoreSubmitted = true;
      return result;
    },
    startFromMenu: () => {
      if (game.mode === "menu") startRun();
    },
    restartFromGameOver: () => {
      if (game.mode === "gameover") startRun();
    },
    canUsePointer: () => game.mode === "playing"
  };

  ui = window.Nightbound.Ui.createUi(game, actions);
  input = createInput(canvas, actions);
  renderer = createRenderer(canvas, game, input.state, assets);
  ui.updateHud(true);
  ui.refreshLeaderboards();

  const frame = (now) => {
    const rawDt = game.lastFrame ? (now - game.lastFrame) / 1000 : 0;
    game.lastFrame = now;
    const dt = Math.min(rawDt, 0.033);

    Simulation.update(game, input.movementVector, dt);
    if (game.mode === "playing" && game.player.hp <= 0) {
      endRun();
    }
    if (game.mode === "playing" && game.upgradesPending > 0) {
      showLevelUp();
    }

    ui.updateHud();
    renderer.draw();
    requestAnimationFrame(frame);
  };

  assets.ready.finally(() => renderer.draw());
  requestAnimationFrame(frame);
})();
