const fs = require("fs")
const path = require("path")
const { app, BrowserWindow, dialog, ipcMain, shell, Tray, Menu } = require("electron")
const { execFile } = require("child_process")
const fetch = require("node-fetch")


const STEAM_IGNORE_NAMES = [
  "Steamworks",
  "Steam Runtime",
  "Proton",
  "Redistributable",
  "SDK",
  "Half-Life 2: Lost Coast",
  "Half-Life 2: Episode One",
  "Half-Life 2: Episode Two",
  "Dedicated Server"
]


let gamesPath = null
const STEAM_PATH = "C:\\Program Files (x86)\\Steam"
let gamesFile

let mainWindow
let tray = null
let isQuitting = false

async function fetchSteamCover(appid) {
  const API_KEY = "0458216d3cd55245ddf4360b4fc043aa"

  const searchRes = await fetch(
    `https://www.steamgriddb.com/api/v2/grids/steam/${appid}?dimensions=600x900`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`
      }
    }
  )

  if (!searchRes.ok) return null

  const data = await searchRes.json()
  if (!data.data || data.data.length === 0) return null

  return data.data[0].url
}

app.setName("Thunder Launcher")
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    backgroundColor: "#0e141b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  })

  mainWindow.setTitle("Thunder Launcher")
  mainWindow.setMenu(null)
  mainWindow.loadFile("index.html")

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  tray = new Tray(path.join(__dirname, "icon.png")) // troque pelo nome do seu ícone

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Abrir Thunder Launcher",
      click: () => {
        mainWindow.show()
      }
    },
    {
      type: "separator"
    },
    {
      label: "Sair",
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip("Thunder Launcher")
  tray.setContextMenu(contextMenu)

  tray.on("double-click", () => {
    mainWindow.show()
  })
}


function getGamesPath() {
  if (!gamesPath) {
    gamesPath = path.join(app.getPath("userData"), "games.json")
    console.log("Games.json em:", gamesPath)
  }
  return gamesPath
}


/* ---------- PICK LOCAL GAME ---------- */
ipcMain.handle("pick-game", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Executáveis", extensions: ["exe"] }]
  })

  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle("load-games", () => {
  const file = getGamesPath()

  if (!fs.existsSync(file)) {
    return []
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"))
  } catch (err) {
    console.error("Erro ao ler games.json:", err)
    return []
  }
})



ipcMain.handle("save-games", (_, games) => {
  const file = getGamesPath()

  try {
    console.log("SALVANDO:", games)
    fs.writeFileSync(file, JSON.stringify(games, null, 2))
  } catch (err) {
    console.error("Erro ao salvar games.json:", err)
  }
})




/* ---------- PLAY GAME ---------- */
ipcMain.handle("play-game", (_, game) => {
  if (game.type === "steam") {
    shell.openExternal(`steam://run/${game.appid}`)
    return
  }

  if (game.type === "local") {
    execFile(game.path, {
      cwd: path.dirname(game.path)
    })
  }
})

ipcMain.handle("auto-cover", async (_, game) => {
  try {
    const fetch = (await import("node-fetch")).default

    let searchUrl

    if (game.type === "steam") {
      searchUrl = `https://www.steamgriddb.com/api/v2/grids/steam/${game.appid}`
    } else {
      const encoded = encodeURIComponent(game.name)
      searchUrl = `https://www.steamgriddb.com/api/v2/search/autocomplete/${encoded}`
    }

    const res = await fetch(searchUrl, {
      headers: {
        Authorization: "Bearer 0458216d3cd55245ddf4360b4fc043aa"
      }
    })

    const data = await res.json()

    if (!data || !data.data || data.data.length === 0) {
      return null
    }

    // se for nome, pega o primeiro resultado e depois busca grid
    if (game.type !== "steam") {
      const gameId = data.data[0].id

      const gridRes = await fetch(
        `https://www.steamgriddb.com/api/v2/grids/game/${gameId}`,
        {
          headers: {
            Authorization: "Bearer 0458216d3cd55245ddf4360b4fc043aa"
          }
        }
      )

      const gridData = await gridRes.json()
      return gridData.data?.[0]?.url || null
    }

    // steam direto
    return data.data?.[0]?.url || null

  } catch (err) {
    console.error("Erro ao pegar cover:", err)
    return null
  }
})

ipcMain.handle("import-steam-games", async () => {
  const steamapps = path.join(STEAM_PATH, "steamapps")

  if (!fs.existsSync(steamapps)) return []

  const files = fs.readdirSync(steamapps)
    .filter(f => f.startsWith("appmanifest_") && f.endsWith(".acf"))

  const games = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(steamapps, file), "utf-8")

    const appid = content.match(/"appid"\s+"(\d+)"/)?.[1]
    const name = content.match(/"name"\s+"(.+?)"/)?.[1]

    if (!appid || !name) continue

    if (
      STEAM_IGNORE_NAMES.some(bad =>
        name.toLowerCase().includes(bad.toLowerCase())
      )
    ) {
      continue
    }

    games.push({
      name,
      type: "steam",
      appid,
      path: null,
      cover: null
    })
  }


  return games
})



app.whenReady().then(() => {
  gamesPath = path.join(app.getPath("userData"), "games.json")
  console.log("JSON EM:", gamesPath)

  createWindow()
  createTray()
})

app.on("before-quit", () => {
  isQuitting = true
})


