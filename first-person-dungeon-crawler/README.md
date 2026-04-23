# Vault of Ashenford

Original browser dungeon crawler inspired by 1990s first-person party RPGs.

## Features

- First-person grid movement with raycast walls.
- One town hub, Ashenford, and one explorable dungeon, Cinder Vault.
- Party HUD with health and mana bars.
- Inventory, item selection, consumables, chests, shop, inn, temple, combat.
- Generated bitmap assets under `public/assets`.

## Run

```bash
npm install
npm run dev
```

Controls: `WASD` or arrows, `Q/E` strafe, `Space` interact, `F` attack, `R` use selected item.

## Generated Assets

The art was generated with the built-in `imagegen` flow and then copied into this project:

- `public/assets/dungeon-wall.png`
- `public/assets/town-wall.png`
- `public/assets/guardian.png`
- `public/assets/party-portraits.png`
- `public/assets/inventory-items.png`
