// Handle video chunks
class VideoChunkHandler {
  #ghostFetching = [];
  constructor(chunks, chunkSize) {
    this.Chunks = chunks.map((chunk, i) => ({
      src: chunk,
      idx: i,
      ...parseChunkFilePath(chunk),
    }));
    this.currentChunk = 0;
    this.currentFrame = 0;
    this.chunkSize = chunkSize;
    this.totalFrames = this.Chunks.reduce(
      (acc, chunk) => acc + chunk.chunkSize,
      0
    );
  }
  async getFrame(frame, loop = false) {
    // handle looping
    if (loop) frame = frame % this.totalFrames;

    // Chunk index calculation
    const chunkIndex = Math.floor(frame / this.chunkSize);
    if (chunkIndex >= this.Chunks.length) {
      return null;
    }
    this.currentChunk = chunkIndex;

    // Get closest frame
    await this.refreshLoadedChunks();
    const frames = this.Chunks[this.currentChunk].frames;
    this.currentFrame = frame % this.Chunks[this.currentChunk].length;

    const time = frame / settings.fps;
    const closestFrame = frames.reduce((prev, curr) => {
      return Math.abs(curr.time - time) < Math.abs(prev.time - time)
        ? curr
        : prev;
    });

    return closestFrame;
  }
  async refreshLoadedChunks() {
    // Deleting all loaded chunks except for current, next, and previous ones
    await Promise.all(
      this.Chunks.map(async (chunk, index) => {
        if (
          index !== this.currentChunk &&
          index !== this.currentChunk + 1 &&
          index !== this.currentChunk - 1
        ) {
          if (chunk.frames && chunk.length) {
            delete chunk.frames;
            delete chunk.length;
          }
        } else {
          // Load current, next, and previous chunks
          await this.loadChunkFrames(index);
        }
      })
    );
  }
  async loadChunkFrames(chunkIndex) {
    if (this.Chunks[chunkIndex].frames && this.Chunks[chunkIndex].length) {
      return; // Already loaded
    }
    // load video frames from JSON
    const chunkFilePath = this.Chunks[chunkIndex].src;

    if (chunkIndex === this.currentChunk) {
      const response = await fetch(chunkFilePath);
      if (!response.ok) {
        throw new Error(`Failed to load video frames: ${chunkFilePath}`);
      }
      let videoFrames = await response.json();
      this.Chunks[chunkIndex].frames = videoFrames;
      this.Chunks[chunkIndex].length = videoFrames.length;
    } else {
      if (this.#ghostFetching.includes(chunkIndex)) {
        return; // Already ghost fetching
      }
      this.#ghostFetching.push(chunkIndex);
      fetch(chunkFilePath).then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load video frames: ${chunkFilePath}`);
        }
        let videoFrames = await res.json();
        this.Chunks[chunkIndex].frames = videoFrames;
        this.Chunks[chunkIndex].length = videoFrames.length;
        this.#ghostFetching = this.#ghostFetching.filter(
          (index) => index !== chunkIndex
        );
      });
    }
  }
}

function parseChunkFilePath(filePath) {
  const fileName = filePath.split("\\").pop();

  const match = fileName.match(
    /^([a-zA-Z0-9]{6,})_(\d{12})_(\d{6,})(\d+)_(\d+)_([0-9]{1,3}|lossless)_(\d+x\d+)\.json$/
  );

  if (!match) {
    throw new Error("Filename format is invalid.");
  }

  const [
    ,
    id,
    timestamp,
    startPrefix,
    startFrames,
    chunkSize,
    quality,
    resolution,
  ] = match;

  return {
    id, // ← now included
    chunkSize: parseInt(chunkSize, 10),
  };
}
