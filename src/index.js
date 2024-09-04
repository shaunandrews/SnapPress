const { app, BrowserWindow, ipcMain, desktopCapturer, clipboard, dialog, globalShortcut } = require("electron");
const fs = require("fs");
const path = require("path");
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
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "../assets/snappress.icns"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      autoFillEnabled: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
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
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, "settings.html"));

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
};

// App lifecycle events
app.whenReady().then(() => {
  createWindow();

  globalShortcut.register("CommandOrControl+Shift+4", () => {
    if (mainWindow) {
      mainWindow.webContents.send("trigger-screenshot");
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// IPC Handlers
ipcMain.handle("capture-screen", async () => {
  const sources = await desktopCapturer.getSources({ types: ["screen"] });
  return sources;
});

ipcMain.handle("save-screenshot", async (event, dataURL) => {
  const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
  const settings = store.get("settings") || {};
  const saveDirectory = settings.saveDirectory || app.getPath("pictures");
  const filePath = path.join(saveDirectory, `screenshot-${Date.now()}.png`);

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
  console.log("Starting upload to WordPress...");
  const settings = store.get("settings");
  if (
    !settings ||
    !settings.wordpressUrl ||
    !settings.wordpressUsername ||
    !settings.wordpressPassword
  ) {
    console.error("WordPress settings are not configured");
    return { success: false, error: "WordPress settings are not configured" };
  }

  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));

  try {
    // Step 1: Upload the file
    const uploadResponse = await axios.post(
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
    console.log("File uploaded successfully");

    const mediaId = uploadResponse.data.id;

    // Step 2: Get the SnapPress category ID
    const categoriesResponse = await axios.get(
      `${settings.wordpressUrl}/wp-json/wp/v2/categories?slug=snappress`,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${settings.wordpressUsername}:${settings.wordpressPassword}`
            ).toString("base64"),
        },
      }
    );

    if (categoriesResponse.data.length === 0) {
      console.warn("SnapPress category not found");
      return {
        success: true,
        mediaUrl: uploadResponse.data.source_url,
        warning: "SnapPress category not found",
      };
    }

    const snapPressCategoryId = categoriesResponse.data[0].id;

    // Step 3: Update the media with the SnapPress category
    await axios.post(
      `${settings.wordpressUrl}/wp-json/wp/v2/media/${mediaId}`,
      { categories: [snapPressCategoryId] },
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${settings.wordpressUsername}:${settings.wordpressPassword}`
            ).toString("base64"),
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Media updated with SnapPress category");

    return { success: true, mediaUrl: uploadResponse.data.source_url };
  } catch (error) {
    console.error("Failed to upload to WordPress:", error.message);
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

ipcMain.handle("copy-to-clipboard", (event, text) => {
  clipboard.writeText(text);
});

ipcMain.on("open-settings", () => {
  createSettingsWindow();
});

ipcMain.on("close-settings", () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

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
  return result.canceled ? null : result.filePaths[0];
});
