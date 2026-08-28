// DOM Tracker
const recordArea = document.querySelector("#record-area");
window.DOMTracker = new ElementTracker(recordArea);

// Start the engine
let renderer;
async function InitEngine(data = null, startFrame = 0) {
  if (!data) {
    console.error("No data provided to initialize the engine.");
    return Promise.resolve();
  }
  const {
    settings,
    assets,
    plugins,
    timeline,
    "audio-timeline": audioTimeline,
  } = data;

  // Setting global variables
  window.AudioTimeline = audioTimeline;
  window.renderJson = data;

  await loadAssets(assets);
  applySceneSettings(settings);
  await loadPlugins(plugins);

  const timelineManager = new TimelineManager(timeline);
  renderer = new Renderer(timelineManager, {
    realtime: false,
    logFrames: false,
  });

  await renderer.stepToFrame(startFrame);

  return timelineManager.totalFrames;
}

async function renderFrame(frame) {
  if (renderer) {
    await renderer.stepToFrame(frame);
  } else {
    console.warn("Renderer not initialized yet.");
  }
  return {
    currentFrame: renderer.currentFrame,
    totalFrames: renderer.timelineManager.totalFrames,
  };
}

window.InitEngine = InitEngine;
window.renderFrame = renderFrame;

/* Running locally */
function runLocally() {
  (async () => {
    try {
      const data = await fetch(".timeline/r_example.json").then((res) =>
        res.json()
      );
      await InitEngine(data);
    } catch (error) {
      console.error("Error initializing the engine:", error);
    }
  })();
}
