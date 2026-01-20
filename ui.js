async function init() {
  games = await window.api.loadGames()
  render()
}

init()


let games = []
let selectedIndex = null

const list = document.getElementById("game-list")
const grid = document.getElementById("grid")
const title = document.getElementById("game-title")
const playBtn = document.getElementById("play-btn")
const removeBtn = document.getElementById("remove-btn")

/* ---------- MODAL ---------- */

function addGame() {
  document.getElementById("addModal").classList.remove("hidden")
}

function closeModal() {
  document.getElementById("addModal").classList.add("hidden")
}

async function pickExe() {
  const file = await window.launcher.pickGame()
  if (file) {
    document.getElementById("gamePath").value = file
  }
}

async function importSteam() {
  const steamGames = await window.launcher.importSteamGames()
  if (!steamGames || steamGames.length === 0) return

  let added = false

  for (const game of steamGames) {
    if (!games.some(g => g.type === "steam" && g.appid === game.appid)) {

      // tenta pegar capa automaticamente
      const cover = await window.launcher.autoCover(game)
      if (cover) game.cover = cover

      games.push(game)
      added = true
    }
  }

  if (added) {
    window.launcher.saveGames(games)
    render()
  }
}



async function confirmAdd() {
  const btn = document.getElementById("confirmAddBtn")
  btn.disabled = true
  btn.textContent = "Adicionando..."
  try {
    const name = document.getElementById("gameName").value.trim()
    const cover = document.getElementById("gameCover").value.trim()
    const type = document.getElementById("gameType").value
    const path = document.getElementById("gamePath").value.trim()
    const appid = document.getElementById("steamAppId").value.trim()

    if (!name) return
    if (type === "local" && !path) return
    if (type === "steam" && !appid) return

    const newGame = {
      name,
      cover: cover || null,
      type,
      path: type === "local" ? path : null,
      appid: type === "steam" ? appid : null
    }

    if (!newGame.cover) {
      const autoCover = await window.launcher.autoCover(newGame)
      if (autoCover) newGame.cover = autoCover
    }

    games.push(newGame)
    window.launcher.saveGames(games)

    closeModal()
    render()

  } finally {
    btn.disabled = false
    btn.textContent = "Adicionar"
  }
}


/* ---------- RENDER ---------- */

function render() {
  list.innerHTML = ""
  grid.innerHTML = ""

  games.forEach((game, i) => {
    const li = document.createElement("li")
    li.textContent = game.name
    li.classList.toggle("active", i === selectedIndex)
    li.onclick = () => selectGame(i)
    list.appendChild(li)

    const card = document.createElement("div")
    card.className = "card"
    card.onclick = () => selectGame(i)

    card.innerHTML = game.cover
      ? `<img src="${game.cover}">`
      : `<div class="placeholder">No Cover</div>`

    if (i === selectedIndex) card.classList.add("selected")
    grid.appendChild(card)
  })
}

/* ---------- SELEÇÃO ---------- */

function selectGame(index) {
  selectedIndex = index
  title.textContent = games[index].name
  playBtn.disabled = false
  removeBtn.disabled = false
  render()
}

/* ---------- REMOVER ---------- */

removeBtn.onclick = () => {
  if (selectedIndex === null) return
  games.splice(selectedIndex, 1)
  window.launcher.saveGames(games)
  selectedIndex = null
  title.textContent = "Selecione um jogo"
  playBtn.disabled = true
  removeBtn.disabled = true
  render()
}

/* ---------- PLAY (stub) ---------- */

playBtn.onclick = () => {
  if (selectedIndex === null) return

  const game = games[selectedIndex]

  window.launcher.playGame(game)
}

window.addEventListener("DOMContentLoaded", async () => {
  const savedGames = await window.launcher.loadGames()
  games = savedGames || []
  render()
})


/* ---------- GLOBAL ---------- */

window.addGame = addGame
window.closeModal = closeModal
window.confirmAdd = confirmAdd

