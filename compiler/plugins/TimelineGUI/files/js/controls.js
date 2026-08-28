function initControls() {
  // Handling player controls
  const playButton = document.querySelector("#play-button");
  const nextFrameButton = document.querySelector("#next-frame-button");
  const prevFrameButton = document.querySelector("#prev-frame-button");
  const fullscreenButton = document.querySelector("#fullscreen-button");

  // Add event listeners for controls
  playButton.addEventListener("click", playEventHandler);

  // Next frame button
  nextFrameButton.addEventListener("click", nextFrameEventHandler);
  nextFrameButton.addEventListener("mousedown", (e) =>
    onMouseDownWithDelay(nextFrameEventHandler)
  );
  nextFrameButton.addEventListener("mouseup", stopRepeating);
  nextFrameButton.addEventListener("mouseleave", stopRepeating);

  // Previous frame button
  prevFrameButton.addEventListener("click", prevFrameEventHandler);
  prevFrameButton.addEventListener("mousedown", () =>
    onMouseDownWithDelay(prevFrameEventHandler)
  );
  prevFrameButton.addEventListener("mouseup", stopRepeating);
  prevFrameButton.addEventListener("mouseleave", stopRepeating);

  // Fullscreen button
  fullscreenButton.addEventListener("click", fullscreenEventHandler);

  // Handling keyboard shortcuts
  document.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault(); // Prevent default spacebar scroll behavior
      playEventHandler();
    } else if (event.key === "ArrowRight") {
      nextFrameEventHandler();
    } else if (event.key === "ArrowLeft") {
      prevFrameEventHandler();
    } else if (event.key === "f" || event.key === "F") {
      fullscreenEventHandler();
    }
    // Adding number keys to quickly navigate to frames
    else if (event.key >= "0" && event.key <= "9") {
      const frameNumber = Math.floor(parseInt(event.key));
      renderer.stepBy(frameNumber);
    }
  });

  // Adding callbacks for renderer events
  const iconsPath = "plugins/TimelineGUI/media/icons/";
  renderer.callbacks.on("play", () => {
    playButton.querySelector("img").src = `${iconsPath}pause icon.svg`; // Update play button icon to pause
  });
  renderer.callbacks.on("pause", () => {
    playButton.querySelector("img").src = `${iconsPath}play icon.svg`; // Update pause button icon to play
  });
}

async function playEventHandler() {
  if (renderer.isPaused) {
    await renderer.play();
  } else {
    renderer.pause();
  }
}

// Helper functions for mouse down and up events
let isMouseDown = false;
let currentDelay = settings.fps; // Starting delay (in fps)
const minDelay = 1;
const maxDelay = 1000;
let currentTimeout = null;
const delayStep = 1; // How much to change delay per scroll

function repeatStep(func) {
  if (!isMouseDown) return;

  func();
  const delayMs = 1000 / currentDelay; // Convert fps to milliseconds
  currentTimeout = setTimeout(() => repeatStep(func), delayMs);
}

function stopRepeating() {
  isMouseDown = false;
  clearTimeout(currentTimeout);
}
// Wrapper to delay startRepeating
function onMouseDownWithDelay(func) {
  isMouseDown = true;
  // Start repeating only if user holds down for a short time (e.g. 150ms)
  mouseDownTimer = setTimeout(() => {
    if (!isMouseDown || !func) return;
    repeatStep(func);
  }, 200);
}

function handleWheel(event) {
  const playbackArea = document.querySelector("#playback-area");
  const videoPreview = document.querySelector("#video-preview");
  if (!playbackArea || !videoPreview) return; // Ensure elements exist
  if (
    !playbackArea.contains(event.target) ||
    videoPreview.contains(event.target)
  )
    return; // Ignore scrolls outside playback area or on video preview

  // Scroll up => decrease delay (faster), scroll down => increase delay (slower)
  if (event.deltaY > 0) {
    currentDelay = Math.max(minDelay, currentDelay - delayStep);
  } else {
    currentDelay = Math.min(maxDelay, currentDelay + delayStep);
  }
  // Show delay in UI
  const playbackNotification = document.querySelector("#playback-notification");
  const notificationFps = playbackNotification.querySelector("#fps-slider");
  if (notificationFps) {
    playbackNotification.setAttribute("data-value", currentDelay);
    notificationFps.innerText = currentDelay;
  } else {
    playbackNotification.setAttribute("data-type", "fps");
    playbackNotification.setAttribute("data-value", currentDelay);
    playbackNotification.textContent = `FPS`;
    const fpsSlider = document.createElement("span");
    fpsSlider.id = "fps-slider";
    fpsSlider.innerText = currentDelay;
    playbackNotification.prepend(fpsSlider);
  }

  // Prevent page scrolling while adjusting speed
  event.preventDefault();
}
document.addEventListener("wheel", handleWheel, { passive: false });

// Event handlers for next and previous frame buttons
async function nextFrameEventHandler() {
  await renderer.stepBy(1);
}
async function prevFrameEventHandler() {
  await renderer.stepBy(-1);
}
// Fullscreen event handler
function fullscreenEventHandler() {
  const playbackContainer = document.querySelector("#playback-area");

  if (document.fullscreenElement) {
    document.exitFullscreen();
    playbackContainer.classList.remove("fullscreen");
  } else {
    playbackContainer.requestFullscreen().catch((err) => {
      console.error(
        `Error attempting to enable full-screen mode: ${err.message}`
      );
    });
    playbackContainer.classList.add("fullscreen");
  }
}

// Handle playback notification using a MutationObserver to observe data-type/data-value changes
function handlePlaybackNotification() {
  const playbackNotification = document.querySelector("#playback-notification");

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        const attrName = mutation.attributeName;
        const type = playbackNotification.getAttribute("data-type");
        const value = playbackNotification.getAttribute("data-value");

        if (attrName === "data-type") {
          // Change functionality based on data-type: TODO later
        } else if (attrName === "data-value") {
          playbackNotification.classList.add("show");
          // Clear any existing timeout to reset the timer
          if (playbackNotification.timeoutId) {
            clearTimeout(playbackNotification.timeoutId);
          }

          playbackNotification.classList.add("show");

          playbackNotification.timeoutId = setTimeout(() => {
            playbackNotification.classList.remove("show");
            playbackNotification.classList.add("hide");
            setTimeout(() => {
              playbackNotification.classList.remove("hide");
            }, 50); // Remove hide class after 2.5 seconds
          }, 1000); // Hide after 2 seconds
        }
      }
    });
  });

  observer.observe(playbackNotification, {
    attributes: true,
    attributeFilter: ["data-type", "data-value"],
  });
}
