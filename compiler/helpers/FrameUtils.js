function timeToFrame(t) {
  if (!t || typeof t !== "string") {
    throw new Error("Invalid timecode format! Check JSON file.");
  }
  // t="hh:mm:ss:ff"
  const parts = t.split(":").map(Number);
  if (parts.length !== 4) {
    throw new Error("Invalid timecode format");
  }
  const [hours, minutes, seconds, frames] = parts;
  return (hours * 3600 + minutes * 60 + seconds) * settings.fps + frames;
}

function frameToTimecode(frame) {
  const totalSeconds = Math.floor(frame / settings.fps);
  const frames = frame % settings.fps;
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const numberOfFrameDigits = settings.fps.toString().length;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}:${String(frames).padStart(
    numberOfFrameDigits,
    "0"
  )}`;
}

function parseTimecode(timecode) {
  const parts = timecode.split(":").map(Number);
  if (parts.length !== 4) {
    throw new Error("Invalid timecode format");
  }
  const [hours, minutes, seconds, frames] = parts;
  return hours * 3600 + minutes * 60 + seconds + frames / settings.fps;
}

function secondsToFrames(seconds) {
  if (typeof seconds !== "number") {
    throw new Error("Invalid seconds value");
  }
  return Math.round(seconds * settings.fps);
}
