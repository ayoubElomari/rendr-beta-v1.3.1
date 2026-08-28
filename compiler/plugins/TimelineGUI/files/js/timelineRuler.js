function initRuler() {
  const canvas = document.querySelector("#timeline-ruler");
  const ctx = canvas.getContext("2d");

  // Canvas dimensions
  const baseTickSpacing = 10; // pixels per frame at 100% zoom
  let zoomLevel = 1;
  const minZoom = 0.1;
  const maxZoom = 5;

  const baseWidth =
    document.body.clientWidth -
    getComputedStyleVariable("--track-controls-width");
  canvas.width = baseWidth;
  canvas.style.width = `${canvas.width}px`;

  const cssHeight = getComputedStyle(document.documentElement).getPropertyValue(
    "--timeline-ruler-height"
  );
  const rulerHeight = parseInt(cssHeight, 10) || 35;
  canvas.height = rulerHeight;

  // Tick and label layout
  const longLineHeight = 10;
  const shortLineHeight = 6;
  const fps = settings.fps; // Assumes settings.fps is defined

  function frameToTimecode(frame, fps) {
    const frames = frame % fps;
    const secondsTotal = Math.floor(frame / fps);
    const seconds = secondsTotal % 60;
    const minutesTotal = Math.floor(secondsTotal / 60);
    const minutes = minutesTotal % 60;
    const hours = Math.floor(minutesTotal / 60);
    return (
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0") +
      ":" +
      String(frames).padStart(2, "0")
    );
  }

  function getTickSpacing() {
    return baseTickSpacing * zoomLevel;
  }

  function drawRuler() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px 'Roboto Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.strokeStyle = "#ffffff59";
    ctx.fillStyle = "#ffffff59";
    ctx.lineWidth = 1;

    const tickSpacing = getTickSpacing();
    const totalVisibleTicks = Math.ceil(canvas.width / tickSpacing);

    // Label spacing logic
    const sampleLabel = frameToTimecode(0, fps);
    const labelWidth = ctx.measureText(sampleLabel).width + 8;
    const minFrameInterval = labelWidth / tickSpacing;

    const niceIntervals = [
      1, 2, 5, 10, 15, 30, 60, 150, 300, 600, 900, 1800, 3600,
    ];
    let labelInterval =
      niceIntervals.find((i) => i >= minFrameInterval) ||
      niceIntervals[niceIntervals.length - 1];

    let tickInterval = labelInterval / 10;
    if (tickInterval < 1) tickInterval = 1;
    if (labelInterval > 60) tickInterval = labelInterval / 5;

    for (let i = 0; i < totalVisibleTicks; i++) {
      const x = i * tickSpacing;
      const frame = i;

      const isLabelTick = frame % labelInterval === 0;
      const isTick = frame % tickInterval === 0;

      if (!isTick && !isLabelTick) continue;

      const lineHeight = isLabelTick ? longLineHeight : shortLineHeight;
      const yBottom = canvas.height;

      // Tick line
      ctx.beginPath();
      ctx.moveTo(x, yBottom);
      ctx.lineTo(x, yBottom - lineHeight);
      ctx.stroke();

      // Label
      if (isLabelTick && i !== 0) {
        const label = frameToTimecode(frame, fps);
        ctx.fillText(label, x, yBottom - lineHeight - 2);
      }
    }
  }

  // Zoom controls
  function zoomBy(zoomFactor) {
    const limit = zoomFactor > 1 ? maxZoom : minZoom;
    if (zoomFactor > 1) {
      zoomLevel = Math.min(limit, zoomLevel * zoomFactor);
    } else if (zoomFactor < 1) {
      zoomLevel = Math.max(limit, zoomLevel * zoomFactor);
    }

    const newWidth = baseWidth * zoomLevel;
    const minWidth =
      document.body.clientWidth -
      getComputedStyleVariable("--track-controls-width");
    canvas.width = Math.max(newWidth, minWidth);
    canvas.style.width = `${canvas.width}px`;
    drawRuler();
    initTracks();
  }

  // Optionally expose zoom functions
  window.rulerZoomBy = zoomBy;

  drawRuler();
}
function rulerScrollHandler() {
  const rulerWrapper = document.querySelector("#timeline-ruler-wrapper");
  const ruler = document.querySelector("#timeline-ruler");
  rulerWrapper.addEventListener("wheel", (e) => {
    if (e.deltaY < 0) {
      rulerZoomBy(1.25);
      return;
    }
    rulerZoomBy(0.8);
  });
}

/* Helper functions */
function getComputedStyleVariable(variableName) {
  const cssVal = getComputedStyle(document.documentElement).getPropertyValue(
    variableName
  );
  return parseInt(cssVal, 10) || 0;
}
