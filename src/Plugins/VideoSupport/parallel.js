const { workerData } = require("worker_threads");
const { exec } = require("child_process");

(async () => {
  const { clippingCommand, fps, width, height, quality, outputPattern } =
    workerData;

  const vfParts = [`fps=${fps}`];

  if (width || height) {
    const scaleW = width || -1;
    const scaleH = height || -1;
    vfParts.push(
      `scale=${scaleW}:${scaleH}:force_original_aspect_ratio=decrease`
    );
  }

  const compressionArgs =
    quality == "lossless" ? "-lossless 1" : `-q:v ${quality}`;

  const cmd = [
    "ffmpeg",
    clippingCommand,
    "-y",
    `-vf ${vfParts.join(",")}`,
    "-c:v libwebp",
    compressionArgs,
    "-compression_level 6",
    `"${outputPattern}"`,
    "-hide_banner -loglevel error",
  ].join(" ");

  await new Promise((resolve, reject) => {
    exec(cmd, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
  process.exit(0);
})();
