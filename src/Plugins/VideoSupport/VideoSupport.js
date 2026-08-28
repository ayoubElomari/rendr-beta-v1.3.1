import { log } from "../../Utils/consoleLog.js";
import { checkIfVideo, handleVideoClipTime } from "./helpers.js";
import StockVideo from "./StockVideo.js";

export async function init(renderConfig, numberOfWorkers = 4) {
  const mediaList = renderConfig.assets?.media || {};

  for (let [key, entry] of Object.entries(mediaList)) {
    // Validate entry and ensure it's a video
    if (!entry || !entry.src) continue;

    const isVid = await checkIfVideo(entry.src);
    if (!isVid && entry.type !== "video") continue;

    // Validate entry properties
    entry = {
      src: entry.src || "",
      startTime: entry.startTime || 0,
      duration: entry.duration || "00:01:00:00", // Default to 1 minute
      width: entry.width || renderConfig.settings.resolution[0],
      height: entry.height || renderConfig.settings.resolution[1],
      frameAccurateClipping: entry.frameAccurateClipping || false,
      quality: entry.quality || 100,
      nocache: entry.nocache || false,
    };
    entry.startTime = handleVideoClipTime(entry.startTime);
    entry.duration = handleVideoClipTime(entry.duration);

    // Load stock video
    const fps = renderConfig.settings.fps || 30;
    const stockVideo = new StockVideo(key, entry, fps, numberOfWorkers);
    await stockVideo.init();

    // Get video frames
    const videoFrames = await stockVideo.getTargetFrames();

    // Return the loaded stock data
    renderConfig.editMediaAsset(key, videoFrames);
  }

  log();
  return renderConfig;
}
