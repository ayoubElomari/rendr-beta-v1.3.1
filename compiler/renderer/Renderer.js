class Renderer {
  #playEnded = true;
  isPaused = true;
  currentFrame = 0;

  constructor(timelineManager, options = {}) {
    this.timelineManager = timelineManager;
    this.options = options;
    this.callbacks = new RendererCallbacks();
  }
  async playback() {
    this.#playEnded = false;
    // Start callback
    this.callbacks.executeCallbacks("start");

    const fps = settings.fps;
    const frameDuration = 1000 / fps;
    let lastTime = performance.now();

    if (this.currentFrame >= this.timelineManager.totalFrames - 1) {
      this.currentFrame = 0; // Reset to start if already at end
    }

    this.isPaused = false;
    while (this.currentFrame < this.timelineManager.totalFrames - 1) {
      if (this.isPaused) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        continue;
      }

      // Going to the next frame
      await this.stepBy(1);

      // Adding delay for real-time playback (TO CHECK!)
      if (this.options.realtime) {
        const now = performance.now();
        const drift = now - lastTime;
        const delay = Math.max(0, frameDuration - drift);
        await new Promise((resolve) => setTimeout(resolve, delay));
        lastTime = now + delay; // Adjust lastTime to account for the delay
      }
    }
    this.isPaused = true;
    this.#playEnded = true;

    // End callback
    this.callbacks.executeCallbacks("pause");
    this.callbacks.executeCallbacks("end");
  }

  async stepBy(step = 1) {
    this.currentFrame += step;
    if (this.currentFrame > this.timelineManager.totalFrames - 1) {
      this.currentFrame = 0; // Loop back to start
    }
    if (this.currentFrame < 0) {
      this.currentFrame = this.timelineManager.totalFrames - 1; // Loop to end
    }
    await this._updateRender(this.currentFrame);
  }
  async stepToFrame(frame) {
    await this._updateRender(frame);
  }
  async _updateRender(frame) {
    this.currentFrame = frame;
    // Incrementing the frame and rendering it
    if (this.currentFrame > this.timelineManager.totalFrames - 1) {
      this.currentFrame = 0; // Loop back to start
    }
    if (this.options.logFrames) {
      console.log("Current frame:", this.currentFrame);
    }

    // Execute frame change callbacks
    this.callbacks.executeCallbacks("frameChange", this.currentFrame);

    DOMTracker.clear(this.currentFrame);
    if (!this.timelineManager.frameMap[this.currentFrame]) {
      return;
    }
    const renderPromises = this.timelineManager.frameMap[this.currentFrame].map(
      async (elem, idx) => {
        elem.el.style.zIndex = idx; // Ensure correct stacking order
        return elem.renderAt(this.currentFrame); // Assume renderAt returns a Promise
      }
    );

    await Promise.all(renderPromises); // Wait for all renderAt calls to complete
  }
  pause() {
    this.isPaused = true;
    // Execute pause callback
    this.callbacks.executeCallbacks("pause");
  }
  play() {
    this.callbacks.executeCallbacks("play");
    if (this.#playEnded) {
      this.playback();
    } else {
      this.isPaused = false;
    }
  }
}

// Handle callbacks
class RendererCallbacks {
  constructor() {
    this.start = [];
    this.end = [];
    this.frameChange = [];
    this.play = [];
    this.pause = [];
  }
  addCallback(event, callback) {
    if (typeof callback === "function") {
      if (!this[event]) {
        this[event] = [];
      }
      this[event].push(callback);
    } else {
      console.error("Callback must be a function");
    }
  }
  on(event, callback) {
    if (Array.isArray(event)) {
      event.forEach((evt) => this.addCallback(evt, callback));
    } else {
      this.addCallback(event, callback);
    }
  }
  removeCallback(event, callback) {
    if (this[event]) {
      this[event] = this[event].filter((cb) => cb !== callback);
    }
  }
  executeCallbacks(event, ...args) {
    if (this[event]) {
      this[event].forEach((callback) => callback(...args));
    }
  }
}
