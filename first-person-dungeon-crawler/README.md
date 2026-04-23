# Vault of Ashenford

Original browser dungeon crawler inspired by 1990s first-person party RPGs.

## Features

- First-person grid movement with raycast walls.
- One town hub, Ashenford, and one explorable dungeon, Cinder Vault.
- Party HUD with health and mana bars.
- Inventory, item selection, consumables, chests, shop, inn, temple, combat.
- Generated bitmap assets under `src/assets`; original project copies also live under `public/assets`.

## Run

```bash
npm install
npm run dev
```

Controls: `WASD` or arrows, `Q/E` strafe, `Space` interact, `F` attack, `R` use selected item.

## Generated Assets

The art was generated with the built-in `imagegen` flow and then copied into this project:

- `src/assets/dungeon-wall.png`
- `src/assets/town-wall.png`
- `src/assets/guardian.png`
- `src/assets/party-portraits.png`
- `src/assets/inventory-items.png`
