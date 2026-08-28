function handleFrameChange() {
  const playbackElapsedTime = document.querySelectorAll(".GUI-elapsed-time");

  renderer.callbacks.on("frameChange", async (frame) => {
    playbackElapsedTime.forEach((el) => {
      el.textContent = frameToTimecode(frame);
    });
  });

  // Handling total duration
  const durationElements = document.querySelectorAll(".GUI-total-time");
  durationElements.forEach((el) => {
    el.textContent = frameToTimecode(renderer.timelineManager.totalFrames);
  });
}
