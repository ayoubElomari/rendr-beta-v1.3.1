/* Handling timeline tracks */
function initTracks() {
  // Timeline ruler
  const timelineRuler = document.querySelector("#timeline-ruler");
  if (!timelineRuler) console.error("Timeline ruler element not found.");
  const rulerWidth = timelineRuler.width;

  // Making all tracks the same width
  const trackControlsWidth =
    parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--track-controls-width"
      ),
      10
    ) || 0;

  editCssVariable("--track-width", `${rulerWidth + trackControlsWidth}px`);
}

function addElementTrack() {
  const tracksContainer = document.querySelector(".element-tracks-container");
  const numberOfTracks = document.querySelectorAll(".element-track").length;

  const timelineTrack = document.createElement("div");
  timelineTrack.className = "timeline-track element-track";
  timelineTrack.id = `track-${numberOfTracks + 1}`;

  // Track controls
  const trackControls = document.createElement("div");
  trackControls.className = "track-controls";

  const trackName = document.createElement("span");
  trackName.className = "track-name";
  trackName.textContent = `Track ${numberOfTracks + 1}`;
  trackControls.appendChild(trackName);

  const trackActions = document.createElement("div");
  trackActions.className = "track-actions";
  trackActions.innerHTML = `
    <button id="toggle-visibility-btn" title="Toggle Visibility"><img src="plugins/TimelineGUI/media/icons/eye icon.svg" alt=""></button>
    <button id="select-all-btn" title="Select All Clips"><img src="plugins/TimelineGUI/media/icons/select-all icon.svg" alt=""></button>
    <button id="toggle-animation-pannel-btn" title="Toggle Animation Panel">
        <img src="plugins/TimelineGUI/media/icons/animation icon.svg" alt="">
    </button>
    `;
  trackControls.appendChild(trackActions);
  timelineTrack.appendChild(trackControls);

  // Track clips container
  const trackContent = document.createElement("div");
  trackContent.className = "track-content";
  const clipsContainer = document.createElement("div");
  clipsContainer.className = "clips-container";
  trackContent.appendChild(clipsContainer);
  timelineTrack.appendChild(trackContent);

  tracksContainer.appendChild(timelineTrack);
}
function addAudioTrack() {
  const tracksContainer = document.querySelector(".audio-tracks-container");
  const numberOfTracks = document.querySelectorAll(".audio-track").length;

  const timelineTrack = document.createElement("div");
  timelineTrack.className = "timeline-track audio-track";
  timelineTrack.id = `audio-track-${numberOfTracks + 1}`;

  // Track controls
  const trackControls = document.createElement("div");
  trackControls.className = "track-controls";

  const trackName = document.createElement("span");
  trackName.className = "track-name";
  trackName.textContent = `Audio Track ${numberOfTracks + 1}`;
  trackControls.appendChild(trackName);

  const trackActions = document.createElement("div");
  trackActions.className = "track-actions";
  trackActions.innerHTML = `
    <button id="toggle-visibility-btn" title="Toggle Visibility"><img src="plugins/TimelineGUI/media/icons/eye icon.svg" alt=""></button>
    <button id="select-all-btn" title="Select All Clips"><img src="plugins/TimelineGUI/media/icons/select-all icon.svg" alt=""></button>
    `;
  trackControls.appendChild(trackActions);
  timelineTrack.appendChild(trackControls);

  // Track clips container
  const trackContent = document.createElement("div");
  trackContent.className = "track-content";
  const clipsContainer = document.createElement("div");
  clipsContainer.className = "clips-container";
  trackContent.appendChild(clipsContainer);
  timelineTrack.appendChild(trackContent);

  tracksContainer.appendChild(timelineTrack);
}

/* Helper Funtions */
function editCssVariable(varName, size) {
  document.documentElement.style.setProperty(varName, size);
}
