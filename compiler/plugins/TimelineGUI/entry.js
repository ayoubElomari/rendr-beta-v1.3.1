console.log("Timeline GUI Plugin Loaded");

async function initTimelineGUI() {
  const timelineGuiFilePath = pluginManager.getFilePath("files/timeline.html");

  if (!timelineGuiFilePath || timelineGuiFilePath.length === 0) {
    console.error("Timeline UI file path is not defined or empty.");
    return;
  }

  const timelineContainer = document.createElement("div");
  timelineContainer.id = "timeline-gui-container";
  await fetch(timelineGuiFilePath)
    .then((response) => response.text())
    .then((html) => {
      timelineContainer.innerHTML = html;
      document.body.prepend(timelineContainer);
    })
    .catch((error) => {
      console.error("Error loading HTML:", error);
    });

  // Set up GUI
  const timelineGUI = document.getElementById("timeline-gui");

  const previewArea = timelineGUI.querySelector("#video-preview");
  const previewShadow = previewArea.attachShadow({ mode: "open" });

  const recordArea = document.querySelector("#record-area");
  previewShadow.appendChild(recordArea);

  // Adding css links to the shadow DOM
  const cssLinks = document.head.querySelectorAll("link[rel='stylesheet']");
  cssLinks.forEach((link) => {
    if (link.href.includes("timeline.css")) return; // Skip if it's the timeline.css
    const newLink = document.createElement("link");
    newLink.rel = "stylesheet";
    newLink.href = link.href;
    previewShadow.prepend(newLink);
  });
}

(async () => {
  await initTimelineGUI();

  // Init layout
  initResizableLayout();
  observePlaybackContainerResize();

  // Init controls
  initControls();

  // Init audio handler
  initAudioHandler();

  // Init playback notification
  handlePlaybackNotification();

  // !DEV: Draw timeline ruler
  initRuler();
  rulerScrollHandler();

  // Init tracks
  initTracks();

  // Handle playhead
  // initPlayhead();

  // Handle frame change
  handleFrameChange();

  // Force enable realtime mode
  renderer.options.realtime = true;
})();
