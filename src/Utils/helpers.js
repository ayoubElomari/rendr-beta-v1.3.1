import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import os from "os";
import { readFileSync } from "fs";

function getJSONFromFile(jsonPath) {
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    return data;
  } catch (error) {
    console.error(`Error reading or parsing JSON file at ${jsonPath}:`, error);
    return null;
  }
}
function resolveHtmlUrl() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let htmlUrl = path.join(__dirname, "../../compiler/index.html");
  if (htmlUrl.startsWith("file://")) {
    return htmlUrl;
  }
  return "file://" + path.resolve(htmlUrl);
}
function handleOutputPath(outputPath) {
  if (!outputPath) {
    outputPath = "output/output.mp4";
  }
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  return outputPath;
}
async function handleJson() {
  const args = global.args || {};
  if (args.jsonPath) {
    return new Promise((resolve) => {
      fs.readFile(args.jsonPath, "utf-8", (err, data) => {
        if (err) {
          console.error(
            "▶",
            `Error reading JSON file at ${args.jsonPath}:`,
            err
          );
          process.exit(1);
        }
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (parseError) {
          console.error(
            "▶",
            `Error parsing JSON file at ${args.jsonPath}:`,
            parseError
          );
          process.exit(1);
        }
      });
    });
  } else if (args.jsonStream) {
    let jsonData = "";
    process.stdin.on("data", (chunk) => {
      jsonData += chunk;
    });
    return new Promise((resolve) => {
      process.stdin.on("end", () => {
        resolve(JSON.parse(jsonData));
      });
    });
  } else {
    console.error(
      "▶",
      "No JSON file provided. Use --jsonFile or --stream. Use --help for more information."
    );
    process.exit(1);
  }
}

function getNumberOfWorkers() {
  const workers = Math.min(
    os.cpus().length,
    Math.floor(os.freemem() / (1024 * 1024 * 1024))
  );
  return workers > 0 ? workers : 1;
}
function showVersion() {
  const colors = [
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "90",
    "91",
    "92",
    "93",
    "94",
    "95",
    "96",
    "97",
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf-8")
  );

  const version = packageJson.version || "__DEV_VERSION__";
  console.log(`\x1b[${randomColor}mRendr version:\x1b[0m ${version}`);
}

export {
  getJSONFromFile,
  resolveHtmlUrl,
  handleOutputPath,
  getNumberOfWorkers,
  handleJson,
  showVersion,
};
