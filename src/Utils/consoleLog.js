import { formatSeconds } from "./timecode.js";

let lastType = "";
function log(message = "", type = "") {
  if (!message || message.trim() === "") {
    lastType = "";
    console.log("");
    return;
  }

  if (lastType === "progress" && type !== "progress") {
    console.log("");
  }
  lastType = type;

  if (type === "progress") {
    process.stdout.write(`\r▶ ${message}`);
    return;
  }

  console.log("▶", message);
}

/* Progress Logging */
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let frameIndex = 0;
function logProgress(current, total, fps) {
  const percentage = ((current / total) * 100).toFixed(2).padStart(6);
  const renderedSecs = current / fps;
  const totalSecs = total / fps;

  const renderedTime = formatSeconds(renderedSecs);
  const duration = formatSeconds(totalSecs);

  const spinner =
    percentage < 100 ? spinnerFrames[frameIndex % spinnerFrames.length] : "";
  frameIndex++;

  const output = `▶ ${spinner}${percentage}% | Rendered: ${renderedTime} | Duration: ${duration}   `;

  process.stdout.write(output + "\r");

  if (!process.stdout.isTTY) {
    process.stdout.write(output + "\n");
  }

  if (current === total) {
    process.stdout.write("\n");
  }
}
function startPreprocessingSpinner(message) {
  const spinner = ["", ".", "..", "..."];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(`\r${message + spinner[i % spinner.length]} `);
    i++;
  }, 300);

  return () => {
    clearInterval(interval);
    process.stdout.write(`\r${message}... done.                   \n`);
  };
}

export { log, logProgress, startPreprocessingSpinner };
