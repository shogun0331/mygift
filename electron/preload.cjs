const { contextBridge } = require('electron')

const { ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  saveEventAssets: (eventId, assets) => ipcRenderer.invoke('save-event-assets', { eventId, assets }),
  saveCharacterAssets: (characterId, assets) => ipcRenderer.invoke('save-character-assets', { characterId, assets }),
  saveCharactersJson: (characters) => ipcRenderer.invoke('save-characters-json', { characters }),
  loadCharactersJson: () => ipcRenderer.invoke('load-characters-json'),
  saveEventsJson: (events) => ipcRenderer.invoke('save-events-json', { events }),
  loadEventsJson: () => ipcRenderer.invoke('load-events-json'),
  saveCommonEventLinksJson: (links) => ipcRenderer.invoke('save-common-event-links-json', { links }),
  loadCommonEventLinksJson: () => ipcRenderer.invoke('load-common-event-links-json'),
  saveCommonSoundAssets: (assets) => ipcRenderer.invoke('save-common-sound-assets', { assets }),
  saveCommonSoundsJson: (sounds) => ipcRenderer.invoke('save-common-sounds-json', { sounds }),
  loadCommonSoundsJson: () => ipcRenderer.invoke('load-common-sounds-json'),
  deleteCommonSoundFile: (fileName) => ipcRenderer.invoke('delete-common-sound-file', { fileName }),
  saveStationGradeConfigJson: (config) => ipcRenderer.invoke('save-station-grade-config-json', { config }),
  loadStationGradeConfigJson: () => ipcRenderer.invoke('load-station-grade-config-json'),
  deleteEventFile: (eventId, kind, fileName) =>
    ipcRenderer.invoke('delete-event-file', { eventId, kind, fileName }),
  deleteEventFolder: (eventId) => ipcRenderer.invoke('delete-event-folder', { eventId }),
  openEventFolder: (eventId) => ipcRenderer.invoke('open-event-folder', { eventId }),
  deleteCharacterFile: (characterId, kind, fileName) => ipcRenderer.invoke('delete-character-file', { characterId, kind, fileName }),
  pruneCharacterFiles: (characterId, keep) => ipcRenderer.invoke('prune-character-files', { characterId, keep }),
  deleteCharacterFolder: (characterId) => ipcRenderer.invoke('delete-character-folder', { characterId }),
  cloneCharacterFile: (characterId, kind, sourceFileName, targetFileName) =>
    ipcRenderer.invoke('clone-character-file', {
      characterId,
      kind,
      sourceFileName,
      targetFileName,
    }),
  saveStaffAssets: (staffId, assets) => ipcRenderer.invoke('save-staff-assets', { staffId, assets }),
  saveStaffJson: (staff) => ipcRenderer.invoke('save-staff-json', { staff }),
  loadStaffJson: () => ipcRenderer.invoke('load-staff-json'),
  deleteStaffFile: (staffId, fileName) => ipcRenderer.invoke('delete-staff-file', { staffId, fileName }),
  deleteStaffFolder: (staffId) => ipcRenderer.invoke('delete-staff-folder', { staffId }),
})
