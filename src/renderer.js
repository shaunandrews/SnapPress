// Screenshot Process
async function startScreenshotProcess() {
  const selectionWindow = createSelectionWindow();
  setupSelectionListeners(selectionWindow);
}

function createSelectionWindow() {
  const selectionWindow = window.open(
    "",
    "",
    `width=${window.screen.width},height=${window.screen.height},frame=false,transparent=true`
  );
  selectionWindow.document.body.style.cursor = "crosshair";
  selectionWindow.document.body.style.userSelect = "none";

  const selectionElement = selectionWindow.document.createElement("div");
  selectionElement.style.position = "fixed";
  selectionElement.style.border = "2px solid red";
  selectionElement.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
  selectionElement.style.display = "none";
  selectionWindow.document.body.appendChild(selectionElement);

  return selectionWindow;
}

function setupSelectionListeners(selectionWindow) {
  let startX, startY;
  let isSelecting = false;
  const selectionElement = selectionWindow.document.querySelector("div");

  selectionWindow.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    isSelecting = true;
    selectionElement.style.display = "block";
    updateSelectionElement(selectionElement, e.clientX, e.clientY, startX, startY);
  });

  selectionWindow.addEventListener("mousemove", (e) => {
    if (!isSelecting) return;
    updateSelectionElement(selectionElement, e.clientX, e.clientY, startX, startY);
  });

  selectionWindow.addEventListener("mouseup", (e) => endSelection(selectionWindow, selectionElement));
  selectionWindow.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cancelSelection(selectionWindow);
  });
}

function updateSelectionElement(element, currentX, currentY, startX, startY) {
  const left = Math.min(currentX, startX);
  const top = Math.min(currentY, startY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
}

async function endSelection(selectionWindow, selectionElement) {
  const bounds = {
    x: parseInt(selectionElement.style.left),
    y: parseInt(selectionElement.style.top),
    width: parseInt(selectionElement.style.width),
    height: parseInt(selectionElement.style.height)
  };

  selectionWindow.close();

  try {
    const screenshot = await captureScreenshot(bounds);
    const saveResult = await window.electronAPI.saveScreenshot(screenshot);
    if (saveResult.success) {
      updateFilmStrip(saveResult.filePath);
      await uploadToWordPress(saveResult.filePath);
    } else {
      console.error("Failed to save screenshot:", saveResult.error);
    }
  } catch (error) {
    console.error("Error capturing screenshot:", error);
  }
}

function cancelSelection(selectionWindow) {
  selectionWindow.close();
}

async function captureScreenshot(bounds) {
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
  ctx.drawImage(video, 0, 0, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);

  stream.getTracks().forEach((track) => track.stop());

  return canvas.toDataURL("image/png");
}

async function uploadToWordPress(filePath) {
  const uploadResult = await window.electronAPI.uploadToWordPress(filePath);
  if (uploadResult.success) {
    await window.electronAPI.copyToClipboard(uploadResult.mediaUrl);
    console.log("Screenshot uploaded and URL copied to clipboard:", uploadResult.mediaUrl);
  } else {
    console.error("Failed to upload to WordPress:", uploadResult.error);
  }
}

function updateFilmStrip(screenshotPath) {
  console.log("Screenshot saved:", screenshotPath);
}

// Add this event listener for the temporary window
window.electronAPI.onTriggerScreenshot(startScreenshotProcess);

// Keep the updateFilmStrip function
function updateFilmStrip(screenshotPath) {
  console.log("Screenshot saved:", screenshotPath);
}

// Remove any other DOM-related code or event listeners that were for the main window
