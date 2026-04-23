import './styles.css'
import dungeonWallUrl from './assets/dungeon-wall.png'
import guardianUrl from './assets/guardian.png'
import inventoryItemsUrl from './assets/inventory-items.png'
import partyPortraitsUrl from './assets/party-portraits.png'
import townWallUrl from './assets/town-wall.png'

const VIEW_W = 960
const VIEW_H = 600
const TAU = Math.PI * 2
const FOV = Math.PI / 3
const TURN = Math.PI / 2

const canvas = document.querySelector('#viewport')
const ctx = canvas.getContext('2d')
ctx.imageSmoothingEnabled = false

const els = {
  areaName: document.querySelector('#areaName'),
  gold: document.querySelector('#gold'),
  compass: document.querySelector('#compass'),
  coords: document.querySelector('#coords'),
  miniMap: document.querySelector('#miniMap'),
  inventory: document.querySelector('#inventory'),
  selectedItem: document.querySelector('#selectedItem'),
  party: document.querySelector('#party'),
  log: document.querySelector('#log'),
  toast: document.querySelector('#toast')
}

const textureSources = {
  dungeon: dungeonWallUrl,
  town: townWallUrl,
  guardian: guardianUrl,
  portraits: partyPortraitsUrl,
  items: inventoryItemsUrl
}

document.documentElement.style.setProperty('--item-sheet', `url("${inventoryItemsUrl}")`)
document.documentElement.style.setProperty('--portrait-sheet', `url("${partyPortraitsUrl}")`)
document.documentElement.style.setProperty('--town-wall', `url("${townWallUrl}")`)

const maps = {
  town: {
    name: 'Ashenford',
    wallTexture: 'town',
    ceilingTop: '#4e5c68',
    ceilingBottom: '#26313c',
    floorTop: '#59432f',
    floorBottom: '#211813',
    start: { x: 5.5, y: 4.5, angle: -Math.PI / 2 },
    grid: [
      '############',
      '#..M....I..#',
      '#..........#',
      '#..S....T..#',
      '#..........#',
      '#....D.....#',
      '#..........#',
      '############'
    ],
    labels: {
      M: 'Market',
      I: 'Inn',
      S: 'Smithy',
      T: 'Temple',
      D: 'Dungeon gate'
    }
  },
  dungeon: {
    name: 'Cinder Vault',
    wallTexture: 'dungeon',
    ceilingTop: '#14171b',
    ceilingBottom: '#060708',
    floorTop: '#3a3329',
    floorBottom: '#0c0a08',
    start: { x: 1.5, y: 1.5, angle: 0 },
    grid: [
      '############',
      '#X....#....#',
      '#.##..#.C..#',
      '#..#..#....#',
      '#..#..###..#',
      '#..E....C..#',
      '#....##....#',
      '#....#..E..#',
      '#..C....#..#',
      '############'
    ],
    labels: {
      X: 'Town stairs',
      C: 'Chest',
      E: 'Guardian'
    }
  }
}

const itemDefs = {
  sword: { name: 'Iron Sword', icon: [0, 0], type: 'weapon', detail: '+4 damage' },
  wand: { name: 'Moon Wand', icon: [1, 0], type: 'weapon', detail: 'mana strike' },
  apple: { name: 'Red Apple', icon: [2, 0], type: 'food', detail: '+7 HP' },
  rope: { name: 'Rope', icon: [3, 0], type: 'tool', detail: 'opens a shortcut' },
  key: { name: 'Brass Key', icon: [0, 1], type: 'tool', detail: 'vault locks' },
  potion: { name: 'Blue Potion', icon: [1, 1], type: 'potion', detail: '+18 HP' },
  boots: { name: 'Leather Boots', icon: [2, 1], type: 'gear', detail: '+1 armor' },
  coin: { name: 'Coin Pouch', icon: [3, 1], type: 'treasure', detail: 'sell value' }
}

const game = {
  area: 'town',
  player: { ...maps.town.start },
  gold: 680,
  selectedItem: 'sword',
  inventory: ['sword', 'apple', 'rope', 'potion'],
  visited: new Set(['town:5:4']),
  enemies: [
    { id: 'g1', area: 'dungeon', x: 3.5, y: 5.5, hp: 30, maxHp: 30, alive: true },
    { id: 'g2', area: 'dungeon', x: 8.5, y: 7.5, hp: 38, maxHp: 38, alive: true }
  ],
  chests: [
    { area: 'dungeon', x: 8, y: 2, open: false, loot: ['wand'], gold: 40 },
    { area: 'dungeon', x: 7, y: 5, open: false, loot: ['boots'], gold: 55 },
    { area: 'dungeon', x: 3, y: 8, open: false, loot: ['key', 'potion'], gold: 30 }
  ],
  party: [
    { name: 'Rhea', role: 'Ranger', hp: 42, maxHp: 42, mp: 10, maxMp: 10, portrait: 0 },
    { name: 'Ilyra', role: 'Scholar', hp: 28, maxHp: 28, mp: 32, maxMp: 32, portrait: 1 },
    { name: 'Darian', role: 'Blade', hp: 48, maxHp: 48, mp: 8, maxMp: 8, portrait: 2 },
    { name: 'Mara', role: 'Healer', hp: 34, maxHp: 34, mp: 25, maxMp: 25, portrait: 3 }
  ],
  log: []
}

const images = {}
let zBuffer = new Float32Array(VIEW_W)
let lastEnemyTick = 0

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

async function boot() {
  const entries = await Promise.all(Object.entries(textureSources).map(async ([key, src]) => [key, await loadImage(src)]))
  for (const [key, image] of entries) images[key] = image
  pushLog('Ashenford waits. Find the key in the Cinder Vault.')
  bindInput()
  updateUI()
  requestAnimationFrame(loop)
}

function loop(time) {
  renderScene(time)
  if (time - lastEnemyTick > 1400) {
    lastEnemyTick = time
    enemyTurn()
  }
  requestAnimationFrame(loop)
}

function bindInput() {
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase()
    const action = {
      w: 'move-forward',
      arrowup: 'move-forward',
      s: 'move-back',
      arrowdown: 'move-back',
      a: 'turn-left',
      arrowleft: 'turn-left',
      d: 'turn-right',
      arrowright: 'turn-right',
      q: 'strafe-left',
      e: 'strafe-right',
      ' ': 'interact',
      f: 'attack',
      r: 'use-item'
    }[key]
    if (action) {
      event.preventDefault()
      runAction(action)
    }
  })

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => runAction(button.dataset.action))
  })

  els.inventory.addEventListener('click', (event) => {
    const slot = event.target.closest('[data-item]')
    if (!slot) return
    game.selectedItem = slot.dataset.item
    pushLog(`${itemDefs[game.selectedItem].name} selected.`)
    updateUI()
  })
}

function runAction(action) {
  if (action === 'turn-left') turn(-TURN)
  if (action === 'turn-right') turn(TURN)
  if (action === 'move-forward') move(1, 0)
  if (action === 'move-back') move(-1, 0)
  if (action === 'strafe-left') move(0, -1)
  if (action === 'strafe-right') move(0, 1)
  if (action === 'interact') interact()
  if (action === 'attack') attack()
  if (action === 'use-item') useSelectedItem()
  updateUI()
}

function turn(delta) {
  game.player.angle = normalizeAngle(game.player.angle + delta)
  revealCurrentCell()
}

function move(forward, strafe) {
  const dir = directionVector()
  const right = { x: -dir.y, y: dir.x }
  const nextX = Math.floor(game.player.x + dir.x * forward + right.x * strafe) + 0.5
  const nextY = Math.floor(game.player.y + dir.y * forward + right.y * strafe) + 0.5
  if (isBlocked(nextX, nextY)) {
    pushLog('The path is blocked.')
    return
  }
  game.player.x = nextX
  game.player.y = nextY
  revealCurrentCell()
  const tile = tileAtCell(game.area, Math.floor(nextX), Math.floor(nextY))
  if (tile === 'C') interact()
  if (tile === 'D' || tile === 'X') interact()
}

function interact() {
  const current = currentCell()
  const currentTile = tileAtCell(game.area, current.x, current.y)
  const front = frontCell()
  const tile = tileAtCell(game.area, front.x, front.y)
  const enemy = enemyAt(front.x, front.y)
  const chest = chestAt(front.x, front.y)

  if (enemy) {
    attack()
    return
  }

  if (game.area === 'town') {
    if (tile === 'D' || currentTile === 'D') {
      switchArea('dungeon')
      return
    }
    if (tile === 'M') {
      buyPotion()
      return
    }
    if (tile === 'S') {
      if (!game.inventory.includes('sword')) game.inventory.push('sword')
      pushLog('The smith sharpens your blades.')
      return
    }
    if (tile === 'I') {
      healParty(999)
      pushLog('The inn restores the party.')
      return
    }
    if (tile === 'T') {
      game.party.forEach((hero) => {
        hero.mp = hero.maxMp
      })
      pushLog('The temple restores mana.')
      return
    }
  }

  if (game.area === 'dungeon') {
    if (tile === 'X' || currentTile === 'X') {
      switchArea('town')
      return
    }
    if (chest) {
      openChest(chest)
      return
    }
  }

  pushLog('Nothing useful here.')
}

function attack() {
  const target = targetEnemy()
  if (!target) {
    pushLog('No enemy in reach.')
    return
  }

  const item = itemDefs[game.selectedItem]
  let damage = 8
  if (item?.type === 'weapon') damage += game.selectedItem === 'wand' ? castWand() : 4
  target.hp = Math.max(0, target.hp - damage)
  pushLog(`Hit guardian for ${damage}.`)

  if (target.hp <= 0) {
    target.alive = false
    game.gold += 75
    if (!game.inventory.includes('coin')) game.inventory.push('coin')
    pushLog('Guardian defeated. +75 gold.')
  } else {
    retaliate(target, 7)
  }
}

function castWand() {
  const caster = game.party[1]
  if (caster.mp < 5) {
    pushLog('Ilyra lacks mana.')
    return 0
  }
  caster.mp -= 5
  return 10
}

function useSelectedItem() {
  const item = itemDefs[game.selectedItem]
  if (!item) return
  if (item.type === 'potion' || item.type === 'food') {
    const amount = item.type === 'potion' ? 18 : 7
    healParty(amount)
    removeOne(game.selectedItem)
    game.selectedItem = game.inventory[0] ?? ''
    pushLog(`${item.name} used. +${amount} HP.`)
    return
  }
  if (game.selectedItem === 'rope' && game.area === 'dungeon') {
    game.player.x = 1.5
    game.player.y = 1.5
    game.player.angle = 0
    pushLog('Rope pulls the party back to the stairs.')
    return
  }
  pushLog(`${item.name}: ${item.detail}.`)
}

function buyPotion() {
  if (game.gold < 45) {
    pushLog('Not enough gold for a potion.')
    return
  }
  game.gold -= 45
  game.inventory.push('potion')
  pushLog('Bought a blue potion for 45 gold.')
}

function openChest(chest) {
  if (chest.open) {
    pushLog('The chest is empty.')
    return
  }
  chest.open = true
  game.gold += chest.gold
  for (const item of chest.loot) {
    if (!game.inventory.includes(item) || item === 'potion') game.inventory.push(item)
  }
  pushLog(`Chest opened. +${chest.gold} gold, ${chest.loot.map((id) => itemDefs[id].name).join(', ')}.`)
}

function switchArea(area) {
  game.area = area
  Object.assign(game.player, maps[area].start)
  revealCurrentCell()
  pushLog(area === 'dungeon' ? 'Entered the Cinder Vault.' : 'Returned to Ashenford.')
}

function enemyTurn() {
  if (game.area !== 'dungeon') return
  const near = game.enemies.find((enemy) => enemy.alive && enemy.area === game.area && distance(enemy.x, enemy.y, game.player.x, game.player.y) < 2.25)
  if (near) {
    retaliate(near, 5)
    updateUI()
  }
}

function retaliate(enemy, damage) {
  const living = game.party.filter((hero) => hero.hp > 0)
  if (!living.length) return
  const hero = living[Math.floor(Math.random() * living.length)]
  hero.hp = Math.max(0, hero.hp - damage)
  pushLog(`Guardian strikes ${hero.name} for ${damage}.`)
}

function healParty(amount) {
  game.party.forEach((hero) => {
    hero.hp = Math.min(hero.maxHp, hero.hp + amount)
  })
}

function targetEnemy() {
  const front = frontCell()
  return enemyAt(front.x, front.y) ?? game.enemies.find((enemy) => {
    if (!enemy.alive || enemy.area !== game.area) return false
    const angle = Math.atan2(enemy.y - game.player.y, enemy.x - game.player.x)
    const diff = Math.abs(angleDiff(angle, game.player.angle))
    return diff < 0.22 && distance(enemy.x, enemy.y, game.player.x, game.player.y) < 2.6 && canSee(enemy.x, enemy.y)
  })
}

function canSee(x, y) {
  const ray = castRay(Math.atan2(y - game.player.y, x - game.player.x))
  return ray.distance + 0.35 > distance(x, y, game.player.x, game.player.y)
}

function isBlocked(x, y) {
  const cellX = Math.floor(x)
  const cellY = Math.floor(y)
  if (tileAtCell(game.area, cellX, cellY) === '#') return true
  return Boolean(enemyAt(cellX, cellY))
}

function enemyAt(cellX, cellY) {
  return game.enemies.find((enemy) => enemy.alive && enemy.area === game.area && Math.floor(enemy.x) === cellX && Math.floor(enemy.y) === cellY)
}

function chestAt(cellX, cellY) {
  return game.chests.find((chest) => chest.area === game.area && !chest.open && chest.x === cellX && chest.y === cellY)
}

function frontCell() {
  const dir = directionVector()
  return {
    x: Math.floor(game.player.x) + dir.x,
    y: Math.floor(game.player.y) + dir.y
  }
}

function currentCell() {
  return {
    x: Math.floor(game.player.x),
    y: Math.floor(game.player.y)
  }
}

function directionVector() {
  return {
    x: Math.round(Math.cos(game.player.angle)),
    y: Math.round(Math.sin(game.player.angle))
  }
}

function tileAtCell(area, x, y) {
  const row = maps[area].grid[y]
  if (!row || x < 0 || x >= row.length) return '#'
  return row[x]
}

function revealCurrentCell() {
  game.visited.add(`${game.area}:${Math.floor(game.player.x)}:${Math.floor(game.player.y)}`)
}

function renderScene(time) {
  const map = maps[game.area]
  renderBackdrop(map)
  const texture = images[map.wallTexture]
  const strip = 2
  for (let x = 0; x < VIEW_W; x += strip) {
    const rayAngle = game.player.angle - FOV / 2 + (x / VIEW_W) * FOV
    const hit = castRay(rayAngle)
    const corrected = hit.distance * Math.cos(angleDiff(rayAngle, game.player.angle))
    const wallHeight = Math.min(VIEW_H * 1.75, VIEW_H / Math.max(corrected, 0.08))
    const wallTop = Math.floor((VIEW_H - wallHeight) / 2)
    const texX = getTextureX(hit, texture)

    ctx.drawImage(texture, texX, 0, 1, texture.height, x, wallTop, strip + 1, wallHeight)
    const shade = Math.min(0.68, hit.distance * 0.1 + (hit.side ? 0.08 : 0))
    ctx.fillStyle = `rgba(0, 0, 0, ${shade})`
    ctx.fillRect(x, wallTop, strip + 1, wallHeight)

    for (let z = x; z < x + strip && z < zBuffer.length; z += 1) zBuffer[z] = corrected
  }
  drawFloorGrid(time)
  drawSprites()
}

function renderBackdrop(map) {
  const ceiling = ctx.createLinearGradient(0, 0, 0, VIEW_H / 2)
  ceiling.addColorStop(0, map.ceilingTop)
  ceiling.addColorStop(1, map.ceilingBottom)
  ctx.fillStyle = ceiling
  ctx.fillRect(0, 0, VIEW_W, VIEW_H / 2)

  const floor = ctx.createLinearGradient(0, VIEW_H / 2, 0, VIEW_H)
  floor.addColorStop(0, map.floorTop)
  floor.addColorStop(1, map.floorBottom)
  ctx.fillStyle = floor
  ctx.fillRect(0, VIEW_H / 2, VIEW_W, VIEW_H / 2)
}

function drawFloorGrid(time) {
  ctx.save()
  ctx.globalAlpha = 0.2
  ctx.strokeStyle = '#c8a96b'
  for (let i = 0; i < 18; i += 1) {
    const y = VIEW_H / 2 + i * i * 2.5 + ((time / 60) % 10)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(VIEW_W, y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawSprites() {
  const sprites = [
    ...game.enemies.filter((enemy) => enemy.alive && enemy.area === game.area).map((enemy) => ({
      type: 'enemy',
      x: enemy.x,
      y: enemy.y,
      scale: 1.25,
      enemy
    })),
    ...game.chests.filter((chest) => !chest.open && chest.area === game.area).map((chest) => ({
      type: 'chest',
      x: chest.x + 0.5,
      y: chest.y + 0.5,
      scale: 0.46,
      chest
    }))
  ].sort((a, b) => distance(b.x, b.y, game.player.x, game.player.y) - distance(a.x, a.y, game.player.x, game.player.y))

  for (const sprite of sprites) {
    const dx = sprite.x - game.player.x
    const dy = sprite.y - game.player.y
    const dist = Math.hypot(dx, dy)
    const diff = angleDiff(Math.atan2(dy, dx), game.player.angle)
    if (Math.abs(diff) > FOV * 0.62 || dist < 0.15) continue
    const screenX = (0.5 + diff / FOV) * VIEW_W
    const bufferIndex = Math.max(0, Math.min(VIEW_W - 1, Math.floor(screenX)))
    if (zBuffer[bufferIndex] < dist - 0.2) continue

    if (sprite.type === 'enemy') drawEnemySprite(sprite, screenX, dist)
    if (sprite.type === 'chest') drawChestSprite(sprite, screenX, dist)
  }
}

function drawEnemySprite(sprite, screenX, dist) {
  const image = images.guardian
  const height = Math.min(VIEW_H * 0.9, (VIEW_H / dist) * sprite.scale)
  const width = height * (image.width / image.height)
  const x = screenX - width / 2
  const y = VIEW_H / 2 - height * 0.55
  ctx.drawImage(image, x, y, width, height)

  const barW = Math.max(80, width * 0.48)
  const barX = screenX - barW / 2
  const barY = y - 18
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.fillRect(barX, barY, barW, 7)
  ctx.fillStyle = '#d94832'
  ctx.fillRect(barX, barY, barW * (sprite.enemy.hp / sprite.enemy.maxHp), 7)
}

function drawChestSprite(sprite, screenX, dist) {
  const image = images.items
  const slotW = image.width / 4
  const slotH = image.height / 2
  const size = Math.min(140, (VIEW_H / dist) * sprite.scale)
  ctx.drawImage(image, slotW * 3, slotH, slotW, slotH, screenX - size / 2, VIEW_H / 2 - size * 0.25, size, size)
}

function castRay(rayAngle) {
  const rayDirX = Math.cos(rayAngle)
  const rayDirY = Math.sin(rayAngle)
  let mapX = Math.floor(game.player.x)
  let mapY = Math.floor(game.player.y)

  const deltaDistX = Math.abs(1 / (rayDirX || 0.0001))
  const deltaDistY = Math.abs(1 / (rayDirY || 0.0001))

  let stepX
  let stepY
  let sideDistX
  let sideDistY

  if (rayDirX < 0) {
    stepX = -1
    sideDistX = (game.player.x - mapX) * deltaDistX
  } else {
    stepX = 1
    sideDistX = (mapX + 1 - game.player.x) * deltaDistX
  }

  if (rayDirY < 0) {
    stepY = -1
    sideDistY = (game.player.y - mapY) * deltaDistY
  } else {
    stepY = 1
    sideDistY = (mapY + 1 - game.player.y) * deltaDistY
  }

  let side = 0
  for (let i = 0; i < 64; i += 1) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX
      mapX += stepX
      side = 0
    } else {
      sideDistY += deltaDistY
      mapY += stepY
      side = 1
    }
    if (tileAtCell(game.area, mapX, mapY) === '#') break
  }

  const distanceToWall = side === 0
    ? (mapX - game.player.x + (1 - stepX) / 2) / (rayDirX || 0.0001)
    : (mapY - game.player.y + (1 - stepY) / 2) / (rayDirY || 0.0001)

  return { distance: Math.max(0.01, distanceToWall), side, rayDirX, rayDirY }
}

function getTextureX(hit, texture) {
  let wallX = hit.side === 0
    ? game.player.y + hit.distance * hit.rayDirY
    : game.player.x + hit.distance * hit.rayDirX
  wallX -= Math.floor(wallX)
  let texX = Math.floor(wallX * texture.width)
  if ((hit.side === 0 && hit.rayDirX > 0) || (hit.side === 1 && hit.rayDirY < 0)) {
    texX = texture.width - texX - 1
  }
  return Math.max(0, Math.min(texture.width - 1, texX))
}

function updateUI() {
  const map = maps[game.area]
  els.areaName.textContent = map.name
  els.gold.textContent = String(game.gold)
  els.compass.textContent = compassLabel()
  els.coords.textContent = `${Math.floor(game.player.x)},${Math.floor(game.player.y)}`
  els.selectedItem.textContent = game.selectedItem ? itemDefs[game.selectedItem].name : 'Empty'
  renderMiniMap()
  renderInventory()
  renderParty()
  renderLog()
}

function renderMiniMap() {
  const map = maps[game.area]
  els.miniMap.style.setProperty('--cols', map.grid[0].length)
  els.miniMap.style.setProperty('--rows', map.grid.length)
  els.miniMap.innerHTML = ''

  map.grid.forEach((row, y) => {
    Array.from(row).forEach((tile, x) => {
      const cell = document.createElement('span')
      const visible = game.visited.has(`${game.area}:${x}:${y}`) || tile === '#'
      cell.className = `map-cell ${tile === '#' ? 'wall' : 'floor'} ${visible ? 'seen' : ''}`
      if (Math.floor(game.player.x) === x && Math.floor(game.player.y) === y) cell.classList.add('player')
      if (visible && tile !== '.' && tile !== '#') cell.dataset.mark = tile
      els.miniMap.append(cell)
    })
  })
}

function renderInventory() {
  els.inventory.innerHTML = ''
  for (let index = 0; index < 12; index += 1) {
    const id = game.inventory[index]
    const slot = document.createElement('button')
    slot.type = 'button'
    slot.className = `slot ${id === game.selectedItem ? 'selected' : ''}`
    if (id) {
      const [x, y] = itemDefs[id].icon
      slot.dataset.item = id
      slot.title = `${itemDefs[id].name}: ${itemDefs[id].detail}`
      slot.innerHTML = `<span class="item-icon" style="background-position: ${x * 33.3333}% ${y * 100}%"></span>`
    } else {
      slot.setAttribute('aria-label', 'Empty inventory slot')
    }
    els.inventory.append(slot)
  }
}

function renderParty() {
  els.party.innerHTML = ''
  for (const hero of game.party) {
    const card = document.createElement('article')
    card.className = `hero ${hero.hp <= 0 ? 'down' : ''}`
    card.innerHTML = `
      <div class="portrait" style="background-position:${hero.portrait * 33.3333}% 0%"></div>
      <div class="hero-copy">
        <strong>${hero.name}</strong>
        <span>${hero.role}</span>
        <div class="bar hp"><i style="width:${(hero.hp / hero.maxHp) * 100}%"></i></div>
        <div class="bar mp"><i style="width:${(hero.mp / hero.maxMp) * 100}%"></i></div>
      </div>
    `
    els.party.append(card)
  }
}

function renderLog() {
  els.log.innerHTML = ''
  for (const entry of game.log.slice(-5).reverse()) {
    const li = document.createElement('li')
    li.textContent = entry
    els.log.append(li)
  }
}

function pushLog(message) {
  game.log.push(message)
  if (game.log.length > 40) game.log.shift()
  els.toast.textContent = message
}

function removeOne(id) {
  const index = game.inventory.indexOf(id)
  if (index >= 0) game.inventory.splice(index, 1)
}

function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU
}

function angleDiff(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2)
}

function compassLabel() {
  const angle = normalizeAngle(game.player.angle)
  if (angle >= Math.PI * 1.75 || angle < Math.PI * 0.25) return 'E'
  if (angle < Math.PI * 0.75) return 'S'
  if (angle < Math.PI * 1.25) return 'W'
  return 'N'
}

boot().catch((error) => {
  console.error(error)
  els.toast.textContent = 'Asset loading failed.'
})
