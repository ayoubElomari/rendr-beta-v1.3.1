// Initialising the PluginsManager
window.EngineElements = {};

// Initialising the recording area element
const RecordingAreaElem = document.getElementById("record-area");
RecordingAreaElem.innerHTML = "";

// Initialising settings
let settings = {
  fps: 30,
  resolution: [1920, 1080],
  backgroundColor: "#000000",
};

function applySceneSettings(jsonSettings) {
  Object.assign(settings, jsonSettings);

  if (jsonSettings.resolution && jsonSettings.resolution.length === 2) {
    RecordingAreaElem.style.width = jsonSettings.resolution[0] + "px";
    RecordingAreaElem.style.height = jsonSettings.resolution[1] + "px";
  }
  if (
    jsonSettings.backgroundColor &&
    isHexColor(jsonSettings.backgroundColor)
  ) {
    RecordingAreaElem.style.backgroundColor = jsonSettings.backgroundColor;
  }
  if (jsonSettings.background) {
    if (isCssValue(jsonSettings.background)) {
      RecordingAreaElem.style.background = jsonSettings.background;
      return 0;
    }
    const backgroundObj = AssetManager.media[jsonSettings.background];
    if (backgroundObj.type === "image") {
      RecordingAreaElem.style.backgroundImage = `url(${backgroundObj.src})`;
    }
  }
}
