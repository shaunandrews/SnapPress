document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("settings-form");
  const wordpressUrl = document.getElementById("wordpress-url");
  const wordpressUsername = document.getElementById("wordpress-username");
  const wordpressPassword = document.getElementById("wordpress-password");
  const saveDirectory = document.getElementById("save-directory");
  const selectDirectoryButton = document.getElementById("select-directory");

  // Load existing settings
  const settings = await window.electronAPI.getSettings();
  if (settings) {
    wordpressUrl.value = settings.wordpressUrl || "";
    wordpressUsername.value = settings.wordpressUsername || "";
    wordpressPassword.value = settings.wordpressPassword || "";
    saveDirectory.value = settings.saveDirectory || "";
  }

  selectDirectoryButton.addEventListener("click", async () => {
    const directory = await window.electronAPI.selectDirectory();
    if (directory) {
      saveDirectory.value = directory;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newSettings = {
      wordpressUrl: wordpressUrl.value,
      wordpressUsername: wordpressUsername.value,
      wordpressPassword: wordpressPassword.value,
      saveDirectory: saveDirectory.value,
    };
    await window.electronAPI.saveSettings(newSettings);
    window.electronAPI.closeSettings();
  });
});
