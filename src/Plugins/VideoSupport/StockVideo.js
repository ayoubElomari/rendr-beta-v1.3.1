const { Worker } = require("worker_threads");
const fs = require("fs/promises");
const { existsSync } = require("fs");
const path = require("path");

const { closeCallbackStack } = require("../../Utils/callbackStack.js");
const { log } = require("../../Utils/consoleLog.js");
const {
  readJsonFile,
  formatSeconds,
  parseChunkFilePath,
  hashFileNameToId,
} = require("./helpers.js");
const { performance } = require("perf_hooks");

class StockVideo {
  constructor(videoName, entry, fps = 30, numberOfWorkers = 4) {
    this.entry = entry;
    this.name = videoName;
    this.src = "";
    this.chunks = [];
    this.chunkSize = 60;
    this.fps = fps;
    this.numberOfWorkers = numberOfWorkers;

    // Cache directories
    this.stockPath = "";
    this.ensureDirectories();

    // Correct chunk timestamps
    this.secondsPerChunk = this.chunkSize / this.fps;
    this.entryChunkStart =
      Math.floor(this.entry.startTime / this.secondsPerChunk) *
      this.secondsPerChunk;
    this.entryChunkEnd =
      Math.ceil(
        (this.entry.startTime + this.entry.duration) / this.secondsPerChunk
      ) * this.secondsPerChunk;
  }
  // init
  async init() {
    await this.loadStockChunks();

    const chunkTimestamps = await this.getMissingChunks();
    if (chunkTimestamps.length === 0) {
      log(`Using stock data for: ${this.name}`);
      return;
    }
    // Nocache handling
    if (this.entry.nocache) {
      log(`Nocache enabled for: ${this.name}`);
    }
    await this.loadMissingChunks(chunkTimestamps);
    await this.updateStock();
  }

  // Get correct frames from stock data
  async getTargetFrames() {
    if (this.chunks.length === 0) {
      log(
        `No chunks found for video: ${this.name}! Make sure to use init() before calling this method.`,
        "error"
      );
      return [];
    }

    const targetChunks = this.chunks.filter(
      (c) =>
        c.startTime >= this.entryChunkStart && c.startTime < this.entryChunkEnd
    );
    if (targetChunks.length === 0) {
      log(
        `No chunks found for video: ${this.name} in the specified range!`,
        "error"
      );
      return [];
    }

    const frames = [];
    for (const chunk of targetChunks) {
      const chunkData = await readJsonFile(chunk.filePath);
      const targetFrames = chunkData.filter(
        (f) =>
          f.time >= this.entry.startTime &&
          f.time < this.entry.startTime + this.entry.duration
      );
      frames.push(...targetFrames);
    }

    // Save to in-use chunks directory
    const inUseChunkPaths = [];
    for (let i = 0; i < frames.length; i += this.chunkSize) {
      let chunk = frames.slice(i, i + this.chunkSize);
      chunk = chunk.map((f, e) => ({
        ...f,
        time: i / this.fps + e / this.fps,
      }));

      const chunkFileName = this.getChunkFileName(chunk[0].time, chunk.length);
      const chunkPath = path.join(this.inUseChunksDir, chunkFileName);
      await fs.writeFile(chunkPath, JSON.stringify(chunk), "utf-8");
      inUseChunkPaths.push(chunkPath);
    }
    return {
      src: this.src,
      chunks: inUseChunkPaths,
      chunkSize: this.chunkSize,
      duration: formatSeconds(this.entry.duration, this.fps),
    };
  }

  // Load stock video data from file
  async loadStockChunks() {
    try {
      const stockFilePath = path.join(this.stockPath, `${this.name}.json`);
      const stockData = await readJsonFile(stockFilePath);
      this.stockData = stockData || {};
      this.src = stockData.src || this.entry.src;
      this.chunks = this.handleChunks(stockData.chunks || []);
      this.chunkSize = stockData.chunkSize || 60;
    } catch (error) {
      log(
        `Error loading video data for ${this.name}: ${error.message}`,
        "error"
      );
    }
  }

  // Extract frames from video and save them in chunks
  async loadMissingChunks(chunkTimestamps) {
    // Extract frames for each missing chunk
    for (const [start, end] of chunkTimestamps) {
      await this.extractFrames(start, end);
      await this.saveFramesToChunks(start);
    }
  }
  async getMissingChunks() {
    // Create a Set of existing chunk start times
    const existingStartTimes = new Set(this.chunks.map((c) => c.startTime));

    // Generate expected start times
    const expectedStartTimes = [];
    for (
      let time = this.entryChunkStart;
      time < this.entryChunkEnd;
      time += this.secondsPerChunk
    ) {
      expectedStartTimes.push(time);
    }

    // Find missing start times
    const missingTimes = expectedStartTimes.filter(
      (time) => !existingStartTimes.has(time)
    );

    // Merge consecutive missing chunks into ranges
    const extractionQueue = [];
    for (let i = 0; i < missingTimes.length; i++) {
      const start = missingTimes[i];
      let end = start + this.secondsPerChunk;

      while (i + 1 < missingTimes.length && missingTimes[i + 1] === end) {
        end += this.secondsPerChunk;
        i++;
      }

      extractionQueue.push([start, end]);
    }
    return extractionQueue;
  }

  // Extraction and saving chunks
  async extractFrames(start, end) {
    const workers = [];
    log(`Extracting using workers: ${this.numberOfWorkers}`);
    for (let i = 0; i < this.numberOfWorkers; i++) {
      const worker = this.runWorker(i, start, end);
      workers.push(worker);
    }

    const stopSpinner = this.logProgress((end - start) * this.fps);
    await Promise.all(workers);
    stopSpinner();
  }
  runWorker(idx, start, end) {
    const workerDuration = (end - start) / this.numberOfWorkers;
    const workerStart = start + idx * workerDuration;
    const numberOfFrames = Math.round(workerDuration * this.fps);
    const startCount = Math.round(idx * workerDuration * this.fps);

    const clippingCommand = this.getClippingCmd(
      workerStart,
      workerDuration,
      startCount,
      numberOfFrames
    );

    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, "parallel.js"), {
        workerData: {
          clippingCommand,
          fps: this.fps,
          width: this.entry.width,
          height: this.entry.height,
          quality: this.entry.quality,
          outputPattern: path.join(this.tempDir, `frame_${idx}_%05d.webp`),
        },
      });

      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Worker ${idx} stopped with exit code ${code}`));
      });
    });
  }
  async saveFramesToChunks(start) {
    const files = (await fs.readdir(this.tempDir)).filter((f) =>
      f.endsWith(".webp")
    );

    let tempChunk = [];
    let chunkStart = start || 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(this.tempDir, file);
      const buf = await fs.readFile(filePath);
      const base64 = buf.toString("base64");

      tempChunk.push({
        src: `data:image/webp;base64,${base64}`,
        time: start + i / this.fps,
      });
      if (tempChunk.length >= this.chunkSize) {
        const chunkPath = await this.saveChunk(tempChunk, chunkStart);
        this.chunks.push(chunkPath);
        tempChunk = [];
        chunkStart += this.chunkSize / this.fps;
      }
    }
  }
  async saveChunk(chunk, start) {
    await fs.mkdir(this.chunksDir, { recursive: true });
    const jsonFileName = this.getChunkFileName(start, chunk.length);
    const chunkJson = JSON.stringify(chunk, null, 2);
    const chunkPath = path.join(this.chunksDir, jsonFileName);
    await fs.writeFile(chunkPath, chunkJson);
    return {
      ...parseChunkFilePath(chunkPath),
      filePath: chunkPath,
    };
  }
  async cleanup() {
    // Remove all files from chunks directory if they're not in use anywhere
    let files = await fs.readdir(this.chunksDir);
    files = files.filter((f) => f.startsWith(hashFileNameToId(this.name)));
    for (const file of files) {
      const inUse = this.stockData?.chunks.filter(
        (c) => path.basename(c) === file
      );

      if (inUse && inUse.length === 0) {
        fs.unlink(path.join(this.chunksDir, file));
      }
    }
  }

  // Update stock data file with current chunks
  async updateStock() {
    const stockData = {
      src: this.src,
      chunkSize: this.chunkSize,
      chunks: this.chunks.map((c) => c.filePath),
    };
    const filePath = path.join(
      __dirname,
      ".cache/.video_stock",
      `${this.name}.json`
    );
    await fs.writeFile(filePath, JSON.stringify(stockData, null, 2));
    this.stockData = stockData;
  }

  // Handle directories
  ensureDirectories() {
    this.stockPath = path.join(
      __dirname,
      ".cache/.video_stock",
      `${this.name}.json`
    );

    // Ensure the temporary directory exists
    this.tempDir = path.join(__dirname, ".cache/.webp_frames");
    this.chunksDir = path.join(__dirname, ".cache/.video_chunks");
    this.stockPath = path.join(__dirname, ".cache/.video_stock");
    this.inUseChunksDir = path.join(__dirname, ".cache/.in_use_chunks");
    fs.mkdir(this.tempDir, { recursive: true });
    fs.mkdir(this.chunksDir, { recursive: true });
    fs.mkdir(this.stockPath, { recursive: true });
    fs.mkdir(this.inUseChunksDir, { recursive: true });

    // Delete tempDir on closing
    closeCallbackStack.add(async () => {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      await fs.rm(this.inUseChunksDir, { recursive: true, force: true });
      await this.cleanup();
    });
  }

  // Helper methods
  getChunkFileName(start, chunkSize = this.chunkSize) {
    const now = new Date();
    const yymmddhhmmss = now.toISOString().replace(/[-:T]/g, "").slice(2, 14); // yyMMddHHmmss
    const startTime = formatSeconds(start, this.fps).replace(/:/g, ""); // hhmmssff
    const duration = chunkSize;
    const quality = this.entry.lossless
      ? "_lossless"
      : `_${this.entry.quality}`;
    const resolution = `${this.entry.width}x${this.entry.height}`;

    const uniqueId = hashFileNameToId(this.name);
    return `${uniqueId}_${yymmddhhmmss}_${startTime}_${duration}${quality}_${resolution}.json`;
  }
  getClippingCmd = (start, duration, startCount = 0, numberOfFrames = -1) => {
    const command = [`-i "${this.src}"`];
    if (start || duration) {
      start = start ? `-ss ${start}` : "-ss 0";
      duration = duration ? `-t ${duration}` : "";

      command.unshift(start, duration);
    }
    if (startCount || numberOfFrames > 0) {
      startCount = startCount ? Math.round(startCount) : 0;
      numberOfFrames = numberOfFrames > 0 ? Math.round(numberOfFrames) : -1;
      command.push(
        `-start_number ${startCount ? startCount : 0}`,
        numberOfFrames > 0 ? `-frames:v ${numberOfFrames}` : ""
      );
    }
    return command.join(" ");
  };
  handleChunks(chunks) {
    return chunks
      .map((chunk) => {
        if (typeof chunk === "string") {
          const chunkData = parseChunkFilePath(chunk);
          return {
            ...chunkData,
            filePath: chunk,
          };
        }
        return chunk;
      })
      .filter((chunk) => {
        if (
          chunk.startTime === undefined ||
          chunk.chunkSize === undefined ||
          chunk.chunkSize !== this.chunkSize ||
          chunk.quality === undefined ||
          chunk.resolution === undefined ||
          !chunk.resolution.width ||
          !chunk.resolution.height
        )
          return false;

        // Ensure the chunk has a valid file path
        if (!chunk.filePath || !existsSync(chunk.filePath)) return false;

        // Don't process chunks that are not in the current video range
        if (
          chunk.startTime * this.fps + chunk.chunkSize <=
            this.entryChunkStart * this.fps ||
          chunk.startTime >= this.entryChunkEnd
        )
          return true;

        // Handle nocache
        if (this.entry.nocache) return false;

        // Handle quality
        if (this.entry.quality == "lossless" && chunk.quality !== "lossless") {
          return false;
        } else if (
          !isNaN(Number(this.entry.quality)) &&
          !isNaN(Number(chunk.quality)) &&
          this.entry.quality > chunk.quality
        ) {
          return false;
        }

        // Handle width and height
        if (
          (this.entry.width && chunk.resolution.width < this.entry.width) ||
          (this.entry.height && chunk.resolution.height < this.entry.height)
        ) {
          return false;
        }
        return true;
      });
  }
  logProgress(totalFrames = 0) {
    // Start performance timer
    const startPerformance = performance.now();

    // Ensure temporary directory is empty
    try {
      fs.readdir(this.tempDir).then((files) => {
        if (files.length > 0) {
          Promise.all(
            files.map((file) => fs.rm(path.join(this.tempDir, file)))
          );
        }
      });
    } catch (e) {}

    const timeout = setInterval(async () => {
      const number_of_files = await fs.readdir(this.tempDir);
      const nbFiles = number_of_files.filter((f) => f.endsWith(".webp")).length;
      const progress = Math.min(Math.round((nbFiles / totalFrames) * 100), 100);

      const endPerformance = performance.now();
      const intermediateDuration = Math.round(
        (endPerformance - startPerformance) / 1000
      );
      log(
        `[Preloading] progress: ${progress}% | Loaded: ${nbFiles}/${totalFrames} | Taking: ${intermediateDuration}s     `,
        "progress"
      );
    }, 500);
    return () => {
      clearInterval(timeout);
      const endPerformance = performance.now();
      const duration = Math.round((endPerformance - startPerformance) / 1000);
      log(
        `[Preloading] progress: 100% | Loaded: ${totalFrames}/${totalFrames} | Took: ${duration}s       `,
        "progress"
      );
      log();
    };
  }
}

module.exports = StockVideo;
