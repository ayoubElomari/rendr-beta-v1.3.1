const { spawn } = require("child_process");
const puppeteer = require("puppeteer");
const { performance } = require("perf_hooks");
const { Worker } = require("worker_threads");
const path = require("path");
const fs = require("fs");

const RenderConfig = require("./renderConfig.js");
const { resolveHtmlUrl, handleOutputPath } = require("../Utils/helpers");
const { timecodeToSeconds } = require("../Utils/timecode.js");
const {
  startPreprocessingSpinner,
  logProgress,
  log,
} = require("../Utils/consoleLog.js");
const { closeCallbackStack } = require("../Utils/callbackStack.js");
const { handlePlugins } = require("../Plugins/handlePlugins.js");

class Renderer {
  constructor(jsonData) {
    this.args = global.args;
    this.renderConfig = new RenderConfig(jsonData);
    this.fps = this.renderConfig.settings.fps || 30;
    this.resolution = this.renderConfig.settings.resolution || [1280, 720];
    this.outputPath = handleOutputPath(this.args.output);
    this.numberOfWorkers = this.args.numberOfWorkers || 1;

    this.htmlUrl = resolveHtmlUrl();
    this.useUI = this.args.useUI || false;
  }

  /* Parallel Rendering */
  async parallelRender() {
    if (!this.numberOfWorkers) {
      throw new Error("Number of workers must be specified.");
    }
    const workerPath = path.resolve(__dirname, "renderWorker.js");
    if (!fs.existsSync(workerPath)) {
      throw new Error(`Worker file not found at ${workerPath}`);
    }
    // Validate number of workers
    if (this.numberOfWorkers < 1) {
      throw new Error("Number of workers must be at least 1.");
    }
    try {
      // Handle plugins and settings
      await handlePlugins(this.renderConfig, this.numberOfWorkers);

      // Remove TimelineGUI plugin in parallel mode
      this.renderConfig.removePlugin("TimelineGUI");
      this.renderConfig.removePlugin("EditorGUI");

      // Initialize FFmpeg process
      await this.initFFmpeg();

      // Initialize global variables
      const frameBuffers = new Map();
      const workers = [];

      // Start timer for performance measurement
      const renderStartTime = performance.now();

      // Run workers
      log(`Starting parallel rendering with ${this.numberOfWorkers} workers`);
      for (let i = 0; i < this.numberOfWorkers; i++) {
        const worker = new Worker(workerPath, {
          workerData: {
            workerIdx: i,
            numberOfWorkers: this.numberOfWorkers,
            renderer: {
              args: this.args,
              htmlUrl: this.htmlUrl,
              resolution: this.resolution,
              renderConfig: this.renderConfig.renderConfig,
            },
          },
        });

        // Handle worker messages
        let nextFrameToWrite = 0;
        worker.on("message", ({ frameIndex, buffer, totalFrames }) => {
          if (!this.totalFrames) {
            this.totalFrames = totalFrames;
          }

          // Check if the buffer is valid
          if (!buffer || buffer.length === 0)
            throw new Error(
              `Buffer is empty for frame ${frameIndex + 1} by worker ${i + 1}`
            );

          // Write frame to the buffer
          frameBuffers.set(frameIndex, buffer);
          while (frameBuffers.has(nextFrameToWrite)) {
            this.ffmpegProc.stdin.write(frameBuffers.get(nextFrameToWrite));
            frameBuffers.delete(nextFrameToWrite);
            logProgress(nextFrameToWrite + 1, this.totalFrames, this.fps);
            nextFrameToWrite++;
          }
        });

        worker.on("exit", (code) => {
          if (code !== 0) console.error(`Worker ${i} exited with code ${code}`);
        });

        workers.push(worker);
      }

      await Promise.all(
        workers.map((w) => new Promise((res) => w.on("exit", res)))
      );

      // Writing remaining frames
      const sortedFrames = Array.from(frameBuffers.keys()).sort(
        (a, b) => a - b
      );
      for (const frameIndex of sortedFrames) {
        this.ffmpegProc.stdin.write(frameBuffers.get(frameIndex));
        frameBuffers.delete(frameIndex);
        logProgress(frameIndex + 1, this.totalFrames, this.fps);
      }

      // End FFmpeg process
      this.ffmpegProc.stdin.end();

      // Stop timer and log total time
      const renderEndTime = performance.now();
      const totalTime = ((renderEndTime - renderStartTime) / 1000).toFixed(2);
      log(`Parallel render took ${totalTime} seconds`);

      const fullOutputPath = path.resolve(this.outputPath);
      log();
      log(`Output saved to: ${fullOutputPath}`);
    } catch (err) {
      console.error("\x1b[31mError in parallelRender:\x1b[0m", err);
      if (this.ffmpegProc && !this.ffmpegProc.killed) {
        this.ffmpegProc.stdin.end();
        this.ffmpegProc.kill();
      }
    }
  }

  /* User interface */
  async initUserInterface() {
    try {
      // Handle plugins and settings
      await handlePlugins(this.renderConfig, this.numberOfWorkers);

      // Add EditorGUI plugin for UI mode
      this.renderConfig.addPlugin("EditorGUI");

      // Initialize Puppeteer
      await this.initPuppeteer();
    } catch (err) {
      console.error("Error initializing user interface:", err);
    }
  }

  /* Audio mixing */
  async mixAudioTimeline() {
    try {
      const audioTimeline = this.renderConfig.audioTimeline;
      const outputPath = this.outputPath.replace(/\.mp4$/, "_audio.m4a");
      const fps = this.renderConfig.settings.fps;
      const duration = this.renderConfig.totalDuration * 1000;

      if (!audioTimeline || audioTimeline.length === 0) return null;

      // init
      const inputArgs = [];
      const filterChains = [];
      const inputLabels = [];

      let maxEndTime = 0;

      audioTimeline.forEach((audio, index) => {
        if (!audio || !audio.src) return;

        // Check if audio.src is valid
        if (!audio.src || !fs.existsSync(audio.src)) {
          console.error(
            `\x1b[31mInvalid audio source for track ${index + 1}:\x1b[0m`,
            `${audio.src}`
          );
          return;
        }

        // Ensure audio config is defined
        audio.config = audio.config || {};

        const inputIndex = index;
        const label = `a${index}`;

        let startAtMs =
          timecodeToSeconds(audio.config.startAt || "00:00:00:00", fps) * 1000;
        const atMs = timecodeToSeconds(audio.at, fps) * 1000;
        const durationMs = timecodeToSeconds(audio.duration, fps) * 1000;
        const delayMs = atMs;

        // Track final mix duration
        const endTime = atMs + durationMs;
        if (endTime > maxEndTime) maxEndTime = endTime;

        // Input args: -ss before -i ensures faster seek
        inputArgs.push(
          "-ss",
          `${startAtMs / 1000}`,
          "-t",
          `${durationMs / 1000}`,
          "-i",
          audio.src
        );

        let chain = `[${inputIndex}:a]`;

        // Delay the audio to align it in the timeline
        chain += `adelay=${delayMs}|${delayMs}`;

        // Normalize (YouTube-friendly using loudnorm)
        if (audio.config.normalize) {
          chain += `,loudnorm=I=-14:LRA=11:TP=-1.0:print_format=summary`;
        }

        // Speed adjustment (default 1x)
        const speed = audio.config?.speed || 1;
        if (speed !== 1) {
          // If outside ffmpeg’s range, chain multiple atempo filters
          let remaining = speed;
          let speedFilters = [];

          while (remaining > 2.0) {
            speedFilters.push("atempo=2.0");
            remaining /= 2.0;
          }
          while (remaining < 0.5) {
            speedFilters.push("atempo=0.5");
            remaining /= 0.5;
          }
          speedFilters.push(`atempo=${remaining.toFixed(2)}`);

          console.log("Speed filters:", speedFilters);
          chain += `,${speedFilters.join(",")}`;
        }

        // Volume
        if (audio.config.volume && audio.config.volume !== 1) {
          chain += `,volume=${audio.config.volume}`;
        }

        // Looping (basic support)
        if (audio.config.loop) {
          // Loop indefinitely and trim to desired length
          const loopDurationSec = Math.ceil(durationMs / 1000);
          chain += `,aloop=loop=-1:size=2e+09,atrim=duration=${loopDurationSec}`;
        }

        chain += `[${label}]`;

        filterChains.push(chain);
        inputLabels.push(label);
      });

      // Delete audio file on exit
      closeCallbackStack.add(() => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      });

      // Final mix
      const finalDurationSec = duration
        ? Math.ceil(duration / 1000)
        : Math.ceil(maxEndTime / 1000);

      const filterComplex =
        `${filterChains.join(";")}; ` +
        `${inputLabels.map((label) => `[${label}]`).join("")}amix=inputs=${
          inputLabels.length
        }:duration=longest${
          duration ? `,apad=pad_dur=${finalDurationSec}` : ""
        }[aout]`;

      const args = [
        ...inputArgs,
        "-filter_complex",
        filterComplex,
        "-map",
        "[aout]",
        "-t",
        finalDurationSec.toString(),
        "-ar",
        "48000", // YouTube preferred sample rate
        "-c:a",
        "aac", // Use AAC codec
        "-b:a",
        "192k", // High-quality bitrate
        "-y", // Overwrite output
        "-loglevel",
        "error", // Reduce log output
        outputPath,
      ];

      const audioMixingSpinner = startPreprocessingSpinner(
        "Mixing audio timeline"
      );
      return new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", args);

        ffmpeg.on("error", (err) => {
          console.error("\x1b[31mFFmpeg error:\x1b[0m", err);
          reject(err);
        });
        ffmpeg.on("exit", (code) => {
          audioMixingSpinner();
          if (code === 0) {
            resolve(outputPath);
          } else {
            reject(new Error(`FFmpeg exited with code ${code}`));
          }
        });
      });
    } catch (err) {
      console.error("\x1b[31mError mixing audio timeline:\x1b[0m", err);
      return null; // Return null if audio mixing fails
    }
  }

  /* Initialization */
  async initPuppeteer() {
    try {
      // Initialize browser and page
      this.browser = await puppeteer.launch({
        headless: !this.useUI,
        defaultViewport: !this.useUI
          ? { width: this.resolution[0], height: this.resolution[1] }
          : null,
        args: [
          "--allow-file-access-from-files",
          this.useUI ? "--start-fullscreen" : "",
        ],
      });
      const [page] = await this.browser.pages();
      this.page = page;
      await this.page.goto(this.htmlUrl, { waitUntil: "networkidle0" });

      // Initialize the engine with the timeline data
      this.totalFrames = await this.page.evaluate(
        (d) => window.InitEngine(d, 0),
        this.renderConfig.renderConfig
      );
      if (this.useUI) {
        this.page.on("load", async () => {
          await this.page.evaluate(
            (d) => window.InitEngine(d),
            this.renderConfig.renderConfig
          );
        });
      }

      // Close callback stack on exit
      closeCallbackStack.add(() => {
        if (this.browser) {
          this.browser.close();
        }
      });
    } catch (err) {
      console.error(`Error initializing Puppeteer: ${err}`);
      throw err;
    }

    // Check if the engine was initialized correctly
    if (typeof this.totalFrames !== "number") {
      throw new Error("InitEngine failed");
    }
  }
  async initFFmpeg() {
    try {
      const mixedAudioPath = await this.mixAudioTimeline();
      this.ffmpegProc = spawn("ffmpeg", [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "image2pipe",
        "-framerate",
        String(this.fps),
        "-i",
        "pipe:0",
        ...(mixedAudioPath ? ["-i", mixedAudioPath] : []),
        "-map",
        "0:v:0",
        ...(mixedAudioPath ? ["-map", "1:a:0"] : []),
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ar",
        "48000",
        "-af",
        "apad",
        "-shortest",
        "-vf",
        `scale=${this.resolution.join(":")}`,
        "-movflags",
        "+faststart",
        "-threads",
        this.numberOfWorkers,
        this.outputPath,
      ]);

      this.ffmpegProc.stderr.on("data", (data) => {
        console.error("FFmpeg stderr:", data.toString());
      });
      this.ffmpegProc.on("close", (code) => {
        if (code !== 0) {
          console.error("FFmpeg failed during rendering.");
        }
      });

      // Ensure FFmpeg process is closed on exit
      closeCallbackStack.add(() => {
        if (this.ffmpegProc && !this.ffmpegProc.killed) {
          this.ffmpegProc.stdin.end();
          this.ffmpegProc.kill();
        }
      });
    } catch (err) {
      console.error("\x1b[31mError initializing FFmpeg:\x1b[0m", err);
      throw err;
    }
  }
}
module.exports = Renderer;
