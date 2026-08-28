function formatSeconds(seconds, fps = 30) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.round((seconds % 1) * fps);
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames
    .toString()
    .padStart(2, "0")}`;
}
function parseTimecodeToMs(timecode, fps = 30) {
  const [hh, mm, ss, ff] = timecode.split(":").map(Number);
  return Math.round((hh * 3600 + mm * 60 + ss + ff / fps) * 1000);
}
function timecodeToSeconds(time, fps = 30) {
  if (typeof time === "number") {
    return time; // Already in seconds
  }
  if (typeof time !== "string") {
    throw new Error("Invalid time format. Expected string or number");
  }
  if (time.includes(":")) {
    const parts = time.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid time format. Expected hh:mm:ss:ff");
    }
    const [hours, minutes, seconds, frames] = parts.map(Number);
    return hours * 3600 + minutes * 60 + seconds + frames / fps;
  }
}

module.exports = {
  formatSeconds,
  parseTimecodeToMs,
  timecodeToSeconds,
};
