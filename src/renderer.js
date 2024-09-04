document
  .getElementById("take-screenshot")
  .addEventListener("click", startScreenshotProcess);

// Add this new event listener for the global shortcut
window.electronAPI.onTriggerScreenshot(() => {
  startScreenshotProcess();
});

// Function to start the screenshot process
async function startScreenshotProcess() {
  // Hide the main window
  await window.electronAPI.hideMainWindow();

  // Create a transparent window for selection
  const selectionWindow = window.open(
    "",
    "",
    `width=${window.screen.width},height=${window.screen.height},frame=false,transparent=true`
  );
  selectionWindow.document.body.style.cursor = "crosshair";
  selectionWindow.document.body.style.userSelect = "none";

  let selectionElement = selectionWindow.document.createElement("div");
  selectionElement.style.position = "fixed";
  selectionElement.style.border = "2px solid red";
  selectionElement.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
  selectionWindow.document.body.appendChild(selectionElement);

  selectionWindow.addEventListener("mousedown", startSelection);
  selectionWindow.addEventListener("mousemove", updateSelection);
  selectionWindow.addEventListener("mouseup", endSelection);
  selectionWindow.addEventListener("keydown", handleKeyPress);

  let startX, startY;
  let isSelecting = false;

  function startSelection(e) {
    startX = e.clientX;
    startY = e.clientY;
    isSelecting = true;
  }

  function updateSelection(e) {
    if (!isSelecting) return;

    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);
    const left = Math.min(e.clientX, startX);
    const top = Math.min(e.clientY, startY);

    selectionElement.style.left = `${left}px`;
    selectionElement.style.top = `${top}px`;
    selectionElement.style.width = `${width}px`;
    selectionElement.style.height = `${height}px`;
  }

  function handleKeyPress(e) {
    if (e.key === "Escape") {
      cancelSelection();
    }
  }

  function cancelSelection() {
    selectionWindow.close();
    isSelecting = false;
    // Show the main window if the selection is cancelled
    window.electronAPI.showMainWindow();
  }

  async function endSelection(e) {
    if (!isSelecting) return;
    isSelecting = false;

    const bounds = {
      x: parseInt(selectionElement.style.left),
      y: parseInt(selectionElement.style.top),
      width: parseInt(selectionElement.style.width),
      height: parseInt(selectionElement.style.height),
    };

    selectionWindow.close();

    try {
      const { sourceId } = await window.electronAPI.captureScreenArea(bounds);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
            minWidth: 1,
            maxWidth: 4000,
            minHeight: 1,
            maxHeight: 4000,
          },
        },
      });

      const video = document.createElement("video");
      video.srcObject = stream;

      await new Promise((resolve) => (video.onloadedmetadata = resolve));
      video.play();

      const canvas = document.createElement("canvas");
      canvas.width = bounds.width;
      canvas.height = bounds.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        video,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        bounds.width,
        bounds.height
      );

      stream.getTracks().forEach((track) => track.stop());

      const dataURL = canvas.toDataURL("image/png");

      // Show the main window after capturing the screenshot
      await window.electronAPI.showMainWindow();

      const saveResult = await window.electronAPI.saveScreenshot(dataURL);

      if (saveResult.success) {
        updateFilmStrip(saveResult.filePath);

        // Upload to WordPress
        const uploadResult = await window.electronAPI.uploadToWordPress(
          saveResult.filePath
        );
        if (uploadResult.success) {
          // Copy the URL to clipboard
          await window.electronAPI.copyToClipboard(uploadResult.mediaUrl);
        } else {
          console.error("Failed to upload to WordPress:", uploadResult.error);
        }
      } else {
        console.error("Failed to save screenshot:", saveResult.error);
      }
    } catch (error) {
      console.error("Error capturing screenshot:", error);
    } finally {
      // Ensure the main window is shown even if an error occurs
      await window.electronAPI.showMainWindow();
    }
  }
}

function updateFilmStrip(screenshotPath) {
  const latestScreenshot = document.getElementById("latest-screenshot");
  const olderScreenshots = document.getElementById("older-screenshots");

  // Move current latest to older screenshots
  if (latestScreenshot.style.backgroundImage) {
    const oldScreenshot = document.createElement("div");
    oldScreenshot.className = "older-screenshot";
    oldScreenshot.style.backgroundImage =
      latestScreenshot.style.backgroundImage;
    olderScreenshots.insertBefore(oldScreenshot, olderScreenshots.firstChild);
  }

  // Set new latest screenshot
  latestScreenshot.style.backgroundImage = `url('file://${screenshotPath}')`;
  latestScreenshot.style.backgroundSize = "cover";
  latestScreenshot.style.backgroundPosition = "center";
}

// Modify your existing code to call updateFilmStrip when a new screenshot is taken
window.electronAPI.onScreenshotSaved((event, path) => {
  updateFilmStrip(path);
});

document.getElementById("tool-settings").addEventListener("click", () => {
  window.electronAPI.openSettings();
});
