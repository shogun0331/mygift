const { contextBridge } = require('electron')

const { ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  saveEventAssets: (chapterId, assets) => ipcRenderer.invoke('save-event-assets', { chapterId, assets }),
  saveCharacterAssets: (characterId, assets) => ipcRenderer.invoke('save-character-assets', { characterId, assets }),
  saveCharactersJson: (characters) => ipcRenderer.invoke('save-characters-json', { characters }),
  loadCharactersJson: () => ipcRenderer.invoke('load-characters-json'),
  deleteCharacterFile: (characterId, kind, fileName) => ipcRenderer.invoke('delete-character-file', { characterId, kind, fileName }),
  deleteCharacterFolder: (characterId) => ipcRenderer.invoke('delete-character-folder', { characterId }),
  cloneCharacterFile: (characterId, kind, sourceFileName, targetFileName) =>
    ipcRenderer.invoke('clone-character-file', {
      characterId,
      kind,
      sourceFileName,
      targetFileName,
    }),
})
