const { workerData, parentPort } = require("worker_threads");
const puppeteer = require("puppeteer");

(async () => {
  const { workerIdx, numberOfWorkers, renderer } = workerData;

  const format =
    renderer.args.format && renderer.args.format === "jpeg" ? "jpeg" : "png";

  // Screenshot options
  const screenshotOptions = {
    type: format,
    clip: {
      x: 0,
      y: 0,
      width: renderer.resolution[0],
      height: renderer.resolution[1],
    },
  };
  if (format === "jpeg" && renderer.args.quality) {
    screenshotOptions.quality = renderer.args.quality;
  }

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: renderer.resolution[0],
      height: renderer.resolution[1],
    },
    args: ["--allow-file-access-from-files"],
  });
  const [page] = await browser.pages();
  await page.goto(renderer.htmlUrl, { waitUntil: "networkidle0" });
  const totalFrames = await page.evaluate(
    ([d, workerIdx]) => window.InitEngine(d, workerIdx),
    [renderer.renderConfig, workerIdx]
  );

  // Ensure videos isn't too small for parallel rendering
  if (totalFrames < numberOfWorkers) {
    numberOfWorkers = totalFrames;
  }
  // Capturing the frame modulo to ensure the worker processes frames correctly
  for (let f = 0; f < totalFrames; f++) {
    if (f % numberOfWorkers !== workerIdx) {
      continue; // Skip frames not assigned to this worker
    }
    await page.evaluate((f) => window.renderFrame(f), f);
    const buffer = await page.screenshot(screenshotOptions);
    parentPort.postMessage({ frameIndex: f, buffer, totalFrames });
  }

  await browser.close();
  process.exit(0);
})();
