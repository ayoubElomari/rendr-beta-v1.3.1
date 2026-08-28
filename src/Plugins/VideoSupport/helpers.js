const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

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
  const [width, height] = resolution.split("x").map(Number);

  function parseTime(prefix, frames) {
    const hours = prefix.slice(0, 2);
    const minutes = prefix.slice(2, 4);
    const seconds = prefix.slice(4, 6);
    return `${hours}:${minutes}:${seconds}:${frames}`;
  }

  const startTime = parseTime(startPrefix, startFrames);

  return {
    id, // ← now included
    startTime: handleVideoClipTime(startTime),
    chunkSize: parseInt(chunkSize, 10),
    quality,
    resolution: { width, height },
  };
}

function handleVideoClipTime(time, fps = 30) {
  if (typeof time === "number") {
    return time;
  }
  if (Number.isInteger(Number(time))) {
    return Number(time);
  }
  if (typeof time !== "string") {
    return time;
  }
  const parts = time.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid time format. Expected hh:mm:ss:ff");
  }
  const [hours, minutes, seconds, frames] = parts.map(Number);
  return hours * 3600 + minutes * 60 + seconds + frames / fps;
}

function formatSeconds(seconds, fps = 30) {
  if (typeof seconds !== "number") {
    throw new Error("Invalid seconds value");
  }
  const totalFrames = Math.round(seconds * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const secondsPart = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutesPart = totalMinutes % 60;
  const hoursPart = Math.floor(totalMinutes / 60);
  return `${String(hoursPart).padStart(2, "0")}:${String(minutesPart).padStart(
    2,
    "0"
  )}:${String(secondsPart).padStart(2, "0")}:${String(frames).padStart(
    2,
    "0"
  )}`;
}

async function checkIfVideo(input) {
  return new Promise((resolve) => {
    const args = [
      "-v",
      "error",
      "-select_streams",
      "v",
      "-show_entries",
      "stream=codec_name,codec_type",
      "-of",
      "json",
      input,
    ];

    const ffprobe = spawn("ffprobe", args);

    let output = "";
    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on("data", () => {
      // silently ignore errors
    });

    ffprobe.on("close", () => {
      try {
        const parsed = JSON.parse(output);
        const videoStreams = parsed.streams?.filter(
          (stream) =>
            stream.codec_type === "video" &&
            !["png", "mjpeg", "jpeg", "bmp", "gif"].includes(stream.codec_name)
        );

        resolve(videoStreams.length > 0);
      } catch {
        resolve(false);
      }
    });

    ffprobe.on("error", () => {
      resolve(false);
    });
  });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath) {
  const isFileExists = await fileExists(filePath);
  let fileContents, jsonData;

  try {
    fileContents = await fs.readFile(filePath, "utf-8");
    if (fileContents.trim() === "") {
      fileContents = "{}";
    }
  } catch (error) {
    fileContents = "{}";

    if (!isFileExists) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
    }
  }
  try {
    jsonData = JSON.parse(fileContents);
  } catch (error) {
    console.error(
      `VideoSupport:readJsonFile(): Error parsing JSON from ${filePath}:`,
      error
    );
    jsonData = {};
  }
  return jsonData;
}

function hashFileNameToId(filename, length = 10) {
  const hash = crypto.createHash("sha256").update(filename).digest();

  // Convert hash buffer to BigInt, then to base62 string
  const base62 =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let num = BigInt("0x" + hash.toString("hex"));
  let id = "";

  while (num > 0n && id.length < length) {
    const rem = num % 62n;
    id = base62[Number(rem)] + id;
    num = num / 62n;
  }

  // Pad with zeros if needed
  return id.padStart(length, "0");
}

module.exports = {
  parseChunkFilePath,
  handleVideoClipTime,
  formatSeconds,
  checkIfVideo,
  fileExists,
  readJsonFile,
  hashFileNameToId,
};
