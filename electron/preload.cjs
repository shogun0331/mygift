const { contextBridge } = require('electron')

const { ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  saveEventAssets: (chapterId, assets) => ipcRenderer.invoke('save-event-assets', { chapterId, assets }),
})
