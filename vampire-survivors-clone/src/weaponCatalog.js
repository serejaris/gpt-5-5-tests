(() => {
  const weapons = {
    gptBurst: {
      name: "GPT-разряд",
      tag: "Модель",
      icon: "./assets/weapons/gpt-burst.png",
      accent: "#63d7ff",
      idea: "Токен-молния по ближайшей галлюцинации.",
      menuEffect: "Автостреляет в ближайший сбой. Апгрейды увеличивают урон, скорость залпа и число разрядов."
    },
    parallelInference: {
      name: "Параллельный инференс",
      tag: "Модель",
      icon: "./assets/weapons/parallel-inference.png",
      accent: "#63d7ff",
      idea: "Делит один промпт на несколько одновременных потоков.",
      menuEffect: "Добавляет дополнительные разряды в залп. Больше целей умирает до контакта с Мьютоном."
    },
    ragShield: {
      name: "RAG-щит",
      tag: "Контекст",
      icon: "./assets/weapons/rag-shield.png",
      accent: "#54d889",
      idea: "Контекстная аура, которая чистит ближний шум.",
      menuEffect: "Периодически бьет всех врагов рядом. Апгрейды усиливают урон, радиус и частоту импульса."
    },
    longWindow: {
      name: "Длинное окно",
      tag: "Контекст",
      icon: "./assets/weapons/rag-shield.png",
      accent: "#54d889",
      idea: "Расширяет радиус памяти вокруг Мьютона.",
      menuEffect: "Расширяет RAG-щит. Полезно, когда враги заходят плотной волной со всех сторон."
    },
    orchestrator: {
      name: "Оркестратор",
      tag: "Агент",
      icon: "./assets/weapons/orchestrator.png",
      accent: "#ffd166",
      idea: "Запускает автономного агента на орбиту.",
      menuEffect: "Открывает орбитального агента. Он крутится вокруг Мьютона и режет врагов при касании."
    },
    fastRouting: {
      name: "Быстрый роутинг",
      tag: "Ядро",
      icon: "./assets/weapons/parallel-inference.png",
      accent: "#8aa4ff",
      idea: "Быстрее уводит Мьютона от плохих задач.",
      menuEffect: "Увеличивает скорость движения. Проще выходить из окружения и собирать CTX."
    },
    contextMagnet: {
      name: "Контекстный магнит",
      tag: "Ядро",
      icon: "./assets/weapons/context-magnet.png",
      accent: "#5eead4",
      idea: "Подтягивает полезные фрагменты контекста.",
      menuEffect: "Увеличивает радиус сбора CTX. Опыт начинает лететь к Мьютону раньше."
    },
    humanLoop: {
      name: "Человек в контуре",
      tag: "Ядро",
      icon: "./assets/weapons/human-loop.png",
      accent: "#ffb86b",
      idea: "Возвращает фокус через человеческую проверку.",
      menuEffect: "Увеличивает максимум фокуса и сразу лечит. Берется, когда ран почти развалился."
    }
  };

  const getWeapon = (key) => weapons[key] || weapons.gptBurst;

  const arsenalGroups = [
    { tag: "Модель", title: "Модели" },
    { tag: "Контекст", title: "Контекст" },
    { tag: "Агент", title: "Агенты" },
    { tag: "Ядро", title: "Ядро" }
  ];

  const menuWeapons = [
    "gptBurst",
    "parallelInference",
    "ragShield",
    "longWindow",
    "orchestrator",
    "contextMagnet",
    "fastRouting",
    "humanLoop"
  ];

  const models = {
    gpt55: {
      key: "gpt55",
      name: "GPT-5.5",
      weaponKey: "gptBurst",
      icon: weapons.gptBurst.icon,
      accent: weapons.gptBurst.accent,
      description: "Быстрый разряд по ближайшим сбоям. Хороший старт для агрессивного рана."
    },
    opus: {
      key: "opus",
      name: "Opus",
      weaponKey: "orchestrator",
      icon: weapons.orchestrator.icon,
      accent: weapons.orchestrator.accent,
      description: "Начинает с орбитального агента. Сильнее держит ближнюю зону вокруг Мьютона."
    },
    kimi: {
      key: "kimi",
      name: "Kimi",
      weaponKey: "ragShield",
      icon: weapons.ragShield.icon,
      accent: weapons.ragShield.accent,
      description: "Стартует с RAG-щитом. Прощает ошибки и лучше чистит плотные волны."
    }
  };

  const modelList = ["gpt55", "opus", "kimi"];
  const getModel = (key) => models[key] || models.gpt55;

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.WeaponCatalog = {
    weapons,
    getWeapon,
    arsenalGroups,
    menuWeapons,
    models,
    modelList,
    getModel
  };
})();
