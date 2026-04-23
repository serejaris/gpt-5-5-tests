const root = document.querySelector(".experience")
const modeButtons = Array.from(document.querySelectorAll("[data-mode-button]"))
const stepButtons = Array.from(document.querySelectorAll("[data-step-button]"))
const playToggle = document.querySelector("#play-toggle")
const cycleLabel = document.querySelector("#cycle-label")
const outputToken = document.querySelector("#svg-output-token")

const stepContent = {
  tokens: {
    kicker: "Шаг 1",
    title: "Текст режется на токены",
    copy:
      "Модель видит не слова целиком, а последовательность токенов. Каждый токен превращается в вектор: число за числом, координаты смысла.",
  },
  attention: {
    kicker: "Шаг 2",
    title: "Attention смешивает контекст",
    copy:
      "Self-attention решает, какие прошлые токены важны для текущего. Так модель связывает части фразы, роли, факты и стиль ответа.",
  },
  ffn: {
    kicker: "Шаг 3",
    title: "FFN делает основное вычисление",
    copy:
      "После attention идет feed-forward часть. В стандартной модели это один плотный блок, а в MoE вместо него стоят роутер и несколько экспертов.",
  },
  decode: {
    kicker: "Шаг 4",
    title: "Модель выбирает следующий токен",
    copy:
      "Последний слой превращает внутренний вектор в вероятности токенов. Выбранный токен добавляется к тексту, и цикл запускается снова.",
  },
}

const modeContent = {
  standard: {
    title: "Standard Transformer",
    copy:
      "В обычной архитектуре каждый токен проходит через один и тот же плотный FFN-блок. Это проще, но каждый запрос трогает весь набор параметров слоя.",
    active: "1 dense block",
    compute: "High, predictable",
    params: "All FFN weights",
  },
  moe: {
    title: "Mixture of Experts",
    copy:
      "В MoE attention остается общим, но FFN заменяется набором экспертов. Роутер выбирает top-k экспертов для каждого токена, поэтому активна только часть параметров.",
    active: "2 of 4 experts",
    compute: "Sparse, token-routed",
    params: "Selected FFN weights",
  },
}

const tokenCycle = ["вектор", "ответ", "код", "идея", "факт"]
const steps = Object.keys(stepContent)
let stepIndex = 0
let tokenIndex = 0
let timer = null
let paused = false

function setMode(mode) {
  root.dataset.mode = mode
  modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.modeButton === mode))

  const content = modeContent[mode]
  document.querySelector("#mode-title").textContent = content.title
  document.querySelector("#mode-copy").textContent = content.copy
  document.querySelector("#active-ffn").textContent = content.active
  document.querySelector("#compute-cost").textContent = content.compute
  document.querySelector("#param-use").textContent = content.params
}

function setStep(step) {
  root.dataset.step = step
  stepIndex = steps.indexOf(step)
  const content = stepContent[step]

  document.querySelector("#step-kicker").textContent = content.kicker
  document.querySelector("#step-title").textContent = content.title
  document.querySelector("#step-copy").textContent = content.copy

  stepButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.stepButton === step))
}

function tick() {
  if (paused) return

  stepIndex = (stepIndex + 1) % steps.length
  tokenIndex = (tokenIndex + 1) % tokenCycle.length
  setStep(steps[stepIndex])
  outputToken.textContent = tokenCycle[tokenIndex]
}

function startCycle() {
  window.clearInterval(timer)
  timer = window.setInterval(tick, 5000)
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.modeButton))
})

stepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setStep(button.dataset.stepButton)
    startCycle()
  })
})

playToggle.addEventListener("click", () => {
  paused = !paused
  root.classList.toggle("is-paused", paused)
  playToggle.setAttribute("aria-label", paused ? "Resume animation" : "Pause animation")
  playToggle.setAttribute("title", paused ? "Resume animation" : "Pause animation")
  cycleLabel.textContent = paused ? "paused" : "auto cycle"
})

setMode("standard")
setStep("tokens")
startCycle()
