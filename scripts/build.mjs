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

// root landing
const landing = readFileSync(resolve(root, 'scripts/landing.html'), 'utf8')
writeFileSync(resolve(dist, 'index.html'), landing)

console.log('> dist ready')
