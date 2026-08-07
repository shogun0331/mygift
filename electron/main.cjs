const { app, BrowserWindow } = require('electron')
const path = require('path')

const isDev = process.env.ELECTRON_DEV === '1'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    // Avoid stale cache while iterating on UI
    mainWindow.webContents.session.clearCache()
    mainWindow.loadURL('http://localhost:5173')

    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'F5') {
        mainWindow.reload()
      }
      if (input.type === 'keyDown' && input.key === 'r' && input.control) {
        mainWindow.reload()
      }
    })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

const { ipcMain } = require('electron')
const fs = require('fs')

ipcMain.handle('save-event-assets', async (event, { chapterId, assets }) => {
  try {
    const baseDir = path.join(app.getAppPath(), 'public/chapter_assets', String(chapterId))
    const folderMap = {
      image: 'images',
      video: 'videos',
      sound: 'sounds',
    }

    for (const asset of assets) {
      const folderName = folderMap[asset.kind] || 'assets'
      const targetDir = path.join(baseDir, folderName)

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      const filePath = path.join(targetDir, asset.fileName)
      const buffer = Buffer.from(asset.buffer)
      fs.writeFileSync(filePath, buffer)
    }

    return { success: true, path: baseDir }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
