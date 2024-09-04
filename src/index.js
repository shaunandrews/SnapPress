const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  clipboard,
  dialog,
  globalShortcut, // Add this import
} = require("electron");
const fs = require("fs");
const pathModule = require("path");
const axios = require("axios");
const FormData = require("form-data");
const Store = require("electron-store");

const store = new Store();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow;
let settingsWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: pathModule.join(__dirname, "../assets/snappress.icns"),
    webPreferences: {
      preload: pathModule.join(__dirname, "preload.js"),
      contextIsolation: true, // Change this to true
      nodeIntegration: false, // This should be false for security
      autoFillEnabled: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(pathModule.join(__dirname, "index.html"));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

const createSettingsWindow = () => {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 400,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      preload: pathModule.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.loadFile(pathModule.join(__dirname, "settings.html"));

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // Register the global shortcut
  globalShortcut.register("CommandOrControl+Shift+4", () => {
    if (mainWindow) {
      mainWindow.webContents.send("trigger-screenshot");
    }
  });

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.handle("capture-screen", async () => {
  const sources = await desktopCapturer.getSources({ types: ["screen"] });
  return sources;
});

ipcMain.handle("save-screenshot", async (event, dataURL) => {
  const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
  const settings = store.get("settings") || {};
  const saveDirectory = settings.saveDirectory || app.getPath("pictures");
  const filePath = pathModule.join(
    saveDirectory,
    `screenshot-${Date.now()}.png`
  );

  try {
    await fs.promises.writeFile(filePath, base64Data, "base64");
    event.sender.send("screenshot-saved", filePath);
    return { success: true, filePath };
  } catch (error) {
    console.error("Failed to save screenshot:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("upload-to-wordpress", async (event, filePath) => {
  const settings = store.get("settings");
  if (
    !settings ||
    !settings.wordpressUrl ||
    !settings.wordpressUsername ||
    !settings.wordpressPassword
  ) {
    return { success: false, error: "WordPress settings are not configured" };
  }

  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));

  try {
    const response = await axios.post(
      `${settings.wordpressUrl}/wp-json/wp/v2/media`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization:
            "Basic " +
            Buffer.from(
              `${settings.wordpressUsername}:${settings.wordpressPassword}`
            ).toString("base64"),
        },
      }
    );

    return { success: true, mediaUrl: response.data.source_url };
  } catch (error) {
    console.error("Failed to upload to WordPress:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-settings", async (event, settings) => {
  store.set("settings", settings);
  return true;
});

ipcMain.handle("get-settings", async () => {
  return store.get("settings");
});

// Add these new IPC handlers near the other handlers
ipcMain.handle("hide-main-window", () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.handle("show-main-window", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

// Add this new IPC handler at the end of the file
ipcMain.handle("copy-to-clipboard", (event, text) => {
  clipboard.writeText(text);
});

// Add this new IPC handler
ipcMain.on("open-settings", () => {
  createSettingsWindow();
});

ipcMain.on("close-settings", () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

// Add the new IPC handler for capturing a specific area
ipcMain.handle("capture-screen-area", async (event, bounds) => {
  const sources = await desktopCapturer.getSources({ types: ["screen"] });
  return { sourceId: sources[0].id, bounds };
});

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    buttonLabel: "Select Folder",
    title: "Select Save Directory",
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

// Add this to handle app quit
app.on("will-quit", () => {
  // Unregister the global shortcut
  globalShortcut.unregisterAll();
});
