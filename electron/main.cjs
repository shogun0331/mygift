const { app, BrowserWindow, protocol, net } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

const isDev = process.env.ELECTRON_DEV === '1'

// video range/stream 지원을 위해 ready 이전에 등록해야 함
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
])

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
  // media://characters/... → public/characters/... (range request 지원)
  protocol.handle('media', (request) => {
    try {
      const parsed = new URL(request.url)
      const rel = path.join(parsed.hostname, decodeURIComponent(parsed.pathname))
      const filePath = path.normalize(path.join(app.getAppPath(), 'public', rel))
      return net.fetch(pathToFileURL(filePath).href)
    } catch (err) {
      console.error('media protocol error:', err)
      return new Response('Not Found', { status: 404 })
    }
  })

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

ipcMain.handle('save-character-assets', async (event, { characterId, assets }) => {
  try {
    const baseDir = path.join(app.getAppPath(), 'public/characters', String(characterId))
    const folderMap = {
      image: 'images',
      video: 'videos',
    }

    for (const asset of assets) {
      const folderName = folderMap[asset.kind] || 'assets'
      const targetDir = path.join(baseDir, folderName)

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      const filePath = path.join(targetDir, asset.fileName)
      
      let buffer
      if (Buffer.isBuffer(asset.buffer)) {
        buffer = asset.buffer
      } else if (asset.buffer instanceof ArrayBuffer) {
        buffer = Buffer.from(asset.buffer)
      } else if (ArrayBuffer.isView(asset.buffer)) {
        buffer = Buffer.from(asset.buffer.buffer, asset.buffer.byteOffset, asset.buffer.byteLength)
      } else if (asset.buffer && typeof asset.buffer === 'object' && asset.buffer.type === 'Buffer') {
        buffer = Buffer.from(asset.buffer.data)
      } else {
        throw new Error(`Invalid buffer for asset ${asset.fileName}`)
      }

      if (!buffer.length) {
        throw new Error(`Empty buffer for asset ${asset.fileName}`)
      }

      fs.writeFileSync(filePath, buffer)
    }

    return { success: true, path: baseDir }
  } catch (err) {
    console.error('save-character-assets error:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('save-characters-json', async (event, { characters }) => {
  try {
    const dir = path.join(app.getAppPath(), 'public/characters')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const filePath = path.join(dir, 'characters.json')
    fs.writeFileSync(filePath, JSON.stringify(characters, null, 2), 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('load-characters-json', async (event) => {
  try {
    const filePath = path.join(app.getAppPath(), 'public/characters/characters.json')
    if (!fs.existsSync(filePath)) {
      return { success: true, characters: [] }
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    const characters = JSON.parse(data)
    return { success: true, characters }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-character-file', async (event, { characterId, kind, fileName }) => {
  try {
    const folderMap = {
      image: 'images',
      video: 'videos',
    }
    const folderName = folderMap[kind] || 'assets'
    const filePath = path.join(app.getAppPath(), 'public/characters', String(characterId), folderName, fileName)

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('clone-character-file', async (event, { characterId, kind, sourceFileName, targetFileName }) => {
  try {
    const folderMap = {
      image: 'images',
      video: 'videos',
    }
    const folderName = folderMap[kind] || 'assets'
    const dir = path.join(app.getAppPath(), 'public/characters', String(characterId), folderName)
    const sourcePath = path.join(dir, sourceFileName)
    const targetPath = path.join(dir, targetFileName)

    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'source missing' }
    }
    if (sourcePath !== targetPath) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.copyFileSync(sourcePath, targetPath)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('delete-character-folder', async (event, { characterId }) => {
  try {
    const dirPath = path.join(app.getAppPath(), 'public/characters', String(characterId))
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true })
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
