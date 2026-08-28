// Init Plugin
async function initPlugin() {
  const editorGuiFilePath = pluginManager.getFilePath("files/editor.html");

  if (!editorGuiFilePath || editorGuiFilePath.length === 0) {
    console.error("Editor UI file path is not defined or empty.");
    return;
  }

  const editorContainer = document.createElement("div");
  editorContainer.id = "editor-gui-container";
  await fetch(editorGuiFilePath)
    .then((response) => response.text())
    .then((html) => {
      editorContainer.innerHTML = html;
      document.body.prepend(editorContainer);
    })
    .catch((error) => {
      console.error("Error loading HTML:", error);
    });

  // Set up GUI
  const editorGUI = document.getElementById("editor-gui");

  const previewArea = editorGUI.querySelector("#video-preview");
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

  // Initialize Panzoom
  const playbackContainer = document.querySelector("#playback-container");
  let pz = panzoom(playbackContainer, {
    maxZoom: 5,
    minZoom: 0.5,
    beforeWheel: function (e) {
      // Only zoom if Ctrl is held
      const shouldZoom = e.ctrlKey;
      return !shouldZoom; // returning true = ignore, false = allow
    },
    beforeMouseDown: function (e) {
      // Only allow panning if Ctrl is held
      return !e.ctrlKey; // returning true = ignore, false = allow
    },
  });

  playbackContainer.addEventListener("mousedown", (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      playbackContainer.classList.add("cursor-grabbing");
    }
  });
  playbackContainer.addEventListener("mouseup", () => {
    playbackContainer.classList.remove("cursor-grabbing");
  });
  playbackContainer.addEventListener("mouseleave", () => {
    playbackContainer.classList.remove("cursor-grabbing");
  });

  // Handle zoom notifications
  const zoomNotification = document.querySelector("#playback-notification");
  pz.on("zoom", (e) => {
    currentZoom = parseFloat(e.getTransform().scale.toFixed(2));
    zoomNotification.setAttribute("data-type", "zoom");
    zoomNotification.setAttribute("data-value", currentZoom);
  });

  document.addEventListener("keydown", (e) => {
    const playbackArea = document.querySelector("#playback-area");
    if (!playbackArea) return; // Ensure playback area exists
    if (!playbackArea.contains(e.target)) return; // Ignore if not in playback area

    if (e.key === "Escape") {
      pz.dispose();
      pz = panzoom(playbackContainer, {
        maxZoom: 5,
        minZoom: 0.5,
        beforeWheel: (e) => !e.ctrlKey,
        beforeMouseDown: (e) => !e.ctrlKey,
      });
      zoomNotification.setAttribute("data-type", "zoom");
      zoomNotification.setAttribute("data-value", 1);
    }
  });

  // Handle hiding the player controls when mouse is not over the video
  const playbackArea = document.querySelector("#playback-area");
  playbackArea.addEventListener("mousemove", (e) => {
    // If mouse is over 90% of the y height of the playback area, show controls
    if (e.clientY < playbackArea.getBoundingClientRect().height * 0.9) {
      playbackArea.classList.add("hide-controls");
    } else {
      playbackArea.classList.remove("hide-controls");
    }
  });
  playbackArea.addEventListener("mouseleave", () => {
    playbackArea.classList.add("hide-controls");
  });
}

// Update the renderer
async function updateEngine(newJson, startFrame = 0) {
  const { timeline, presets } = newJson;
  const renderArea =
    document.querySelector("#record-area") ||
    document
      .querySelector("#video-preview")
      .shadowRoot.querySelector("#record-area");
  emptyRenderArea(renderArea);

  // Rerender the timeline
  window.DOMTracker = new ElementTracker(renderArea);
  window.renderJson.timeline = timeline;
  window.renderJson.presets = presets;
  const timelineManager = new TimelineManager(timeline);
  renderer = new Renderer(timelineManager, {
    realtime: true,
    logFrames: false,
  });

  await renderer.stepToFrame(startFrame);
}

function emptyRenderArea(renderArea) {
  const jsonData = window.renderJson;

  if (!jsonData) {
    console.error("No JSON data provided to render.");
    return;
  }
  try {
    // Empty the render area
    renderArea.innerHTML = "";
  } catch (error) {
    console.error("Error initializing the engine:", error);
  }
}
