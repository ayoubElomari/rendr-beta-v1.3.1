function initResizableLayout() {
  // Resize panel
  console.log("Initializing resizable layout...");
  const guiElementSizes = getSplitState("topTimelineSizes", [55, 45]);
  Split(["#top-area", "#timeline-area"], {
    direction: "vertical",
    sizes: guiElementSizes, // Load saved sizes or default
    minSize: 100,
    gutterSize: 1,
    cursor: "row-resize",
    onDrag: (sizes) => saveSplitState("topTimelineSizes", sizes), // Save sizes on drag
  });

  const topAreaSizes = getSplitState("addElementSizes", [25, 50, 25]);
  Split(["#left-area", "#playback-area", "#control-area"], {
    direction: "horizontal",
    sizes: topAreaSizes, // Load saved sizes or default
    minSize: 100,
    gutterSize: 1,
    cursor: "col-resize",
    onDrag: (sizes) => saveSplitState("addElementSizes", sizes), // Save sizes on drag
  });
}

function saveSplitState(key, sizes) {
  localStorage.setItem(key, JSON.stringify(sizes));
}

function getSplitState(key, defaultSizes) {
  const savedSizes = localStorage.getItem(key);
  return savedSizes ? JSON.parse(savedSizes) : defaultSizes;
}

// Handling resizing of the playback container
function observePlaybackContainerResize() {
  const container = document.querySelector("#playback-container");

  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      const { width, height } = entry.contentRect;
      adjustVideoSize(width, height);
    }
  });

  resizeObserver.observe(container);
}
function adjustVideoSize(w, h) {
  // Scale down recordArea to fit within previewArea while maintaining aspect ratio
  const preview = document.querySelector("#video-preview");

  const recordWidth = preview.clientWidth;
  const recordHeight = preview.clientHeight;

  // Calculate scaling factors for width and height
  const widthScale = w / recordWidth;
  const heightScale = h / recordHeight;

  // Use the smaller scaling factor to maintain aspect ratio
  const scale = Math.min(widthScale, heightScale);

  preview.style.transform = `scale(${scale}) translate(-50%, -50%)`;
  preview.style.transformOrigin = "top left";

}
