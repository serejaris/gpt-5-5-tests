# gpt-5-5-tests

Демо-приложения, сгенерированные **GPT-5.5 Pro** в прямом эфире 23 апреля 2026.

Эфир и разбор: [live.sereja.tech/gpt-5-5](https://live.sereja.tech/gpt-5-5/).

## Demos

| Папка | Что это | Стек |
|-------|---------|------|
| [`cozy-isometric-room`](./cozy-isometric-room) | Изометрическая 3D-комната с агентами и пайплайном задач. Генерится через Codex + GPT-5.5 Pro. | Three.js · Vite · TypeScript |
| [`vampire-survivors-clone`](./vampire-survivors-clone) | «Myuton Agent Run» — browser survival game + leaderboard на Node/Postgres. Деплой: [myuton-agent-run-web-production.up.railway.app](https://myuton-agent-run-web-production.up.railway.app/) | Vanilla JS · Canvas · Node · Railway |
| [`first-person-dungeon-crawler`](./first-person-dungeon-crawler) | «Vault of Ashenford» — first-person dungeon crawler в духе 90-х: raycast-стены, город-хаб, бой, инвентарь. | Vanilla JS · Canvas · Vite |
| [`llm-moe-vector-animation`](./llm-moe-vector-animation) | Векторная SVG-анимация: как LLM обрабатывает токены и чем MoE отличается от плотной архитектуры. | Vanilla JS · SVG |
| [`peacock-bike-pixar`](./peacock-bike-pixar) | Pixar-style павлин на велосипеде в одном HTML-файле — Peacock Test. | Vanilla JS · CSS |
| [`ramp-bucket-experiment`](./ramp-bucket-experiment) | Matter.js-симуляция: шарик скатывается по рампе с изменяемым углом в одно из 3 вёдер. | Matter.js · Canvas |

## Run локально

Каждое демо — независимый пакет.

```bash
# cozy-isometric-room
cd cozy-isometric-room
npm install
npm run dev

# vampire-survivors-clone
cd vampire-survivors-clone
python3 -m http.server 5173   # любой статический сервер

# first-person-dungeon-crawler
cd first-person-dungeon-crawler
npm install
npm run dev

# llm-moe-vector-animation
cd llm-moe-vector-animation
python3 -m http.server 5173   # или открой index.html напрямую
```

## Build всего для Vercel

```bash
npm run build    # собирает Vite demos и копирует static demos в dist/
```

Vercel деплоит `dist/` как статический сайт. Корневой `index.html` — лендинг с ссылками на демо.
