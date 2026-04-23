#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

// cozy-isometric-room → vite build
const cozy = resolve(root, 'cozy-isometric-room')
console.log('> building cozy-isometric-room')
execSync('npm install --no-audit --no-fund --loglevel=error', { cwd: cozy, stdio: 'inherit' })
execSync('npm run build', { cwd: cozy, stdio: 'inherit' })
cpSync(resolve(cozy, 'dist'), resolve(dist, 'cozy-isometric-room'), { recursive: true })

// vampire-survivors-clone → static copy
const vampire = resolve(root, 'vampire-survivors-clone')
console.log('> copying vampire-survivors-clone')
const vampireOut = resolve(dist, 'vampire-survivors-clone')
mkdirSync(vampireOut, { recursive: true })
for (const entry of ['index.html', 'src', 'assets']) {
  const from = resolve(vampire, entry)
  if (existsSync(from)) cpSync(from, resolve(vampireOut, entry), { recursive: true })
}

// llm-moe-vector-animation → static copy
const llmMoe = resolve(root, 'llm-moe-vector-animation')
console.log('> copying llm-moe-vector-animation')
cpSync(llmMoe, resolve(dist, 'llm-moe-vector-animation'), { recursive: true })

// peacock-bike-pixar → static copy (single index.html)
const peacock = resolve(root, 'peacock-bike-pixar')
console.log('> copying peacock-bike-pixar')
cpSync(peacock, resolve(dist, 'peacock-bike-pixar'), { recursive: true })

// ramp-bucket-experiment → static copy
const ramp = resolve(root, 'ramp-bucket-experiment')
console.log('> copying ramp-bucket-experiment')
cpSync(ramp, resolve(dist, 'ramp-bucket-experiment'), { recursive: true })

// first-person-dungeon-crawler → vite build
const dungeon = resolve(root, 'first-person-dungeon-crawler')
console.log('> building first-person-dungeon-crawler')
execSync('npm install --no-audit --no-fund --loglevel=error', { cwd: dungeon, stdio: 'inherit' })
execSync('npm run build', { cwd: dungeon, stdio: 'inherit' })
cpSync(resolve(dungeon, 'dist'), resolve(dist, 'first-person-dungeon-crawler'), { recursive: true })

// root landing
const landing = readFileSync(resolve(root, 'scripts/landing.html'), 'utf8')
writeFileSync(resolve(dist, 'index.html'), landing)

console.log('> dist ready')
