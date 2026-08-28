// audioHandler.js

class AudioTimeline {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.fps = settings.fps;
    this.totalFrames = renderer.timelineManager.totalFrames;
    this.audioElements = []; // { id, buffer, atFrame, durationFrames }
    this.playingSources = [];

    this.lastFrame = 0;
  }

  async init() {
    const rawElements = this.getAudioElements(); // { id, src, at, duration }
    this.audioElements = await this.loadAudioBuffers(rawElements);
  }

  getAudioElements() {
    const audioTimeline = window.AudioTimeline || [];
    return audioTimeline.map((audioData, id) => {
      let src = audioData.src;
      if (!src.startsWith("http")) {
        src = src.replace(/\\/g, "/");
        src = new URL(
          "http://localhost:3000/audio-timeline?url=" + src,
          window.location.origin
        ).href;
      }

      return {
        id,
        src,
        at: audioData.at || "00:00:00:00",
        duration: audioData.duration || "00:00:00:00",
        volume: audioData.volume || 1.0,
      };
    });
  }

  async loadAudioBuffers(audioDataList) {
    const loadBuffer = async (src) => {
      const res = await fetch(src);
      const arrayBuffer = await res.arrayBuffer();
      return this.audioCtx.decodeAudioData(arrayBuffer);
    };

    const results = [];
    for (let audioData of audioDataList) {
      const buffer = await loadBuffer(audioData.src);
      results.push({
        id: audioData.id,
        buffer,
        atFrame: timecodeToFrame(audioData.at),
        durationFrames: timecodeToFrame(audioData.duration),
        volume: audioData.volume,
      });
    }

    return results;
  }

  // Call this on every frame update
  playAt(frame) {
    if (this.audioElements.length === 0) return;
    // Stop previous audio source if still playing
    if (this.lastSource) {
      try {
        this.lastSource.stop();
      } catch (e) {
        // It's okay — it might have already ended
        console.warn("Previous audio source already ended:", e);
      }
      this.lastSource.disconnect(); // Clean up
    }

    // Create new source node
    const source = this.audioCtx.createBufferSource();
    source.buffer = this.audioElements[0].buffer;
    source.connect(this.audioCtx.destination);

    // Compute time offset and duration
    const offset = frame / this.fps;
    const duration = 1 / this.fps;

    source.start(0, offset, duration);
    this.lastSource = source; // Save for next time
  }

  pause() {
    this.stopAll();
  }

  stopAll() {
    this.playingSources.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    this.playingSources = [];
  }

  reverseBuffer(buffer) {
    const reversed = this.audioCtx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      reversed.copyToChannel(
        Float32Array.from(buffer.getChannelData(i)).reverse(),
        i
      );
    }

    return reversed;
  }
}

// Initialization
function initAudioHandler() {
  const audioHandler = new AudioTimeline();
  window.audioHandler = audioHandler;

  audioHandler.init().then(() => {
    renderer.callbacks.on("play", () => {
      const frame = renderer.currentFrame;
      audioHandler.playAt(frame);
    });

    renderer.callbacks.on("frameChange", (frame) => {
      audioHandler.playAt(frame);
    });

    renderer.callbacks.on(["pause", "end"], () => {
      audioHandler.pause();
    });
  });
}

// Helper function
function timecodeToFrame(timecode) {
  const [hours, minutes, seconds, frames] = timecode.split(":").map(Number);
  return (
    frames +
    seconds * settings.fps +
    minutes * settings.fps * 60 +
    hours * settings.fps * 3600
  );
}
