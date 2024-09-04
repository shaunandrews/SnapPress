const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  captureScreen: () => ipcRenderer.invoke("capture-screen"),
  saveScreenshot: (dataURL) => ipcRenderer.invoke("save-screenshot", dataURL),
  uploadToWordPress: (filePath) =>
    ipcRenderer.invoke("upload-to-wordpress", filePath),
  copyToClipboard: (text) => ipcRenderer.invoke("copy-to-clipboard", text),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  openSettings: () => ipcRenderer.send("open-settings"),
  closeSettings: () => ipcRenderer.send("close-settings"),
  captureScreenArea: (bounds) =>
    ipcRenderer.invoke("capture-screen-area", bounds),
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  
  onTriggerScreenshot: (callback) => ipcRenderer.on('trigger-screenshot', callback),
  
  hideMainWindow: () => ipcRenderer.invoke("hide-main-window"),
  showMainWindow: () => ipcRenderer.invoke("show-main-window"),
  
  onScreenshotSaved: (callback) => ipcRenderer.on('screenshot-saved', callback),
});
