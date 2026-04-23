(() => {
  const image = (src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    return img;
  };

  const loadAssets = () => {
    const assets = {
      floor: image("./assets/gothic-floor.png"),
      menuSplash: image("./assets/menu-splash.png")
    };

    assets.ready = Promise.allSettled(
      Object.values(assets)
        .filter((asset) => asset instanceof HTMLImageElement)
        .map((asset) => asset.decode ? asset.decode() : Promise.resolve())
    );

    return assets;
  };

  window.Nightbound = window.Nightbound || {};
  window.Nightbound.Assets = { loadAssets };
})();
