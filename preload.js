const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("launcher", {
  pickGame: () => ipcRenderer.invoke("pick-game"),
  playGame: (game) => ipcRenderer.invoke("play-game", game),

  loadGames: () => ipcRenderer.invoke("load-games"),
  saveGames: (games) => ipcRenderer.invoke("save-games", games),

  autoCover: (game) => ipcRenderer.invoke("auto-cover", game),

  importSteamGames: () => ipcRenderer.invoke("import-steam-games")
})
