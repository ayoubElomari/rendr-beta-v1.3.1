const fs = require("fs");
const { getNumberOfWorkers } = require("./helpers");
const path = require("path");

const acceptedArgs = {
  /* JSON data */
  jsonPath: {
    flags: ["--json", "-j"],
    types: ["string"],
    default: null,
    required: false,
    verification: (path) =>
      path && path.endsWith(".json") && fs.existsSync(path),
    description: "Set path to JSON file",
  },
  jsonStream: {
    flags: ["--stream", "-s"],
    types: [],
    default: false,
    required: false,
    description: "Enable JSON stream mode (read from stdin)",
  },

  /* Render Json Settings */
  fps: {
    flags: ["--fps", "-fps", "-f"],
    types: ["number"],
    default: null,
    required: false,
    description: "Change the fps of the output video",
  },
  resolution: {
    flags: ["--resolution", "-r"],
    types: ["number", "number"],
    default: null,
    required: false,
    description: "Change the resolution of the output video",
  },
  backgroundColor: {
    flags: ["--bg-color", "-bg"],
    types: ["string"],
    default: null,
    required: false,
    description: "Set/Change the background color of the video",
  },

  /* General */
  output: {
    flags: ["--output", "-o"],
    types: ["string"],
    default: "output.mp4",
    required: false,
    verification: (p) => {
      if (!(p && p.endsWith(".mp4"))) return false;
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return true;
    },
    description: "Set output file path",
  },

  /* Performance */
  numberOfWorkers: {
    flags: ["--workers", "-nw"],
    types: ["number"],
    default: getNumberOfWorkers(),
    required: false,
    description:
      "Set number of workers (default: number of CPU cores available)",
  },

  /* User Interface */
  useUI: {
    flags: ["--user-interface", "-ui"],
    types: {
      required: false,
      type: "string",
    },
    default: false,
    required: false,
    description: "Enable user interface mode",
  },

  /* Help */
  help: {
    flags: ["--help", "-h"],
    types: [],
    default: false,
    required: false,
    callback: handleHelp,
    description: "Show this help message",
  },
};

function handleArgs() {
  const args = process.argv.slice(2);
  const result = {};

  const flagToKey = {};
  for (const [key, cfg] of Object.entries(acceptedArgs)) {
    for (const f of cfg.flags) flagToKey[f] = key;
  }

  for (const [key, config] of Object.entries(acceptedArgs)) {
    result[key] = config.default;
  }

  const getTypeShape = (config) => {
    if (Array.isArray(config.types) && config.types.length === 0) {
      return { mode: "boolean" };
    }
    if (Array.isArray(config.types)) {
      return { mode: "fixed", types: config.types };
    }
    if (config.types && typeof config.types === "object") {
      return { mode: "optional", type: config.types.type || "string" };
    }
    return { mode: "boolean" };
  };

  const fail = (msg) => {
    console.error(`▶ Error: ${msg}`);
    process.exit(1);
  };

  for (let i = 0; i < args.length; i++) {
    const token = args[i];

    if (!token.startsWith("-")) {
      fail(`Unexpected positional argument: ${token}`);
    }

    const key = flagToKey[token];
    if (!key) {
      fail(`Unknown option: ${token}`);
    }

    const config = acceptedArgs[key];
    const typeShape = getTypeShape(config);

    if (typeShape.mode === "boolean") {
      result[key] = true;
    } else if (typeShape.mode === "fixed") {
      const values = [];
      for (const t of typeShape.types) {
        i++;
        if (i >= args.length) {
          fail(`Missing value for ${token}`);
        }
        let val = args[i];
        if (t === "number") {
          const num = Number(val);
          if (Number.isNaN(num)) {
            fail(`Invalid number value for ${token}: ${val}`);
          }
          val = num;
        }
        values.push(val);
      }
      result[key] = values.length > 1 ? values : values[0];
    } else if (typeShape.mode === "optional") {
      const peek = args[i + 1];
      if (peek && !peek.startsWith("-")) {
        i++;
        let val = args[i];
        if (typeShape.type === "number") {
          const num = Number(val);
          if (Number.isNaN(num)) {
            fail(`Invalid number value for ${token}: ${val}`);
          }
          val = num;
        }
        result[key] = val;
      } else {
        result[key] = true;
      }
    }

    if (typeof config.verification === "function") {
      const ok = config.verification(result[key]);
      if (!ok) {
        fail(`Invalid value for ${token}`);
      }
    }
    if (typeof config.callback === "function") {
      config.callback();
      return; // Exit after handling help
    }
  }

  for (const [key, config] of Object.entries(acceptedArgs)) {
    if (config.required) {
      const v = result[key];
      const isUnset = v === null || v === undefined || v === false || v === "";
      if (isUnset) {
        fail(`Missing required option: ${config.flags.join(", ")}`);
      }
    }
  }

  // Ensure only one input source is provided
  const hasJsonPath = !!result.jsonPath;
  const hasJsonStream = !!result.jsonStream;
  if (hasJsonPath && hasJsonStream) {
    fail(
      `Choose exactly one input source: --json/-j or --stream/-s, not both.`
    );
  }
  if (!hasJsonPath && !hasJsonStream) {
    fail(`Must provide an input source: --json <file.json> or --stream.`);
  }

  return result;
}

module.exports = { handleArgs };

/* Helper functions */
function handleHelp() {
  console.log("");
  console.log("Usage:");
  console.log("Options:");
  for (const [key, config] of Object.entries(acceptedArgs)) {
    const flags = config.flags.join(", ");
    const types = config.types.length > 0 ? `<${config.types.join(", ")}>` : "";
    console.log(
      `  ${flags.padEnd(20)} ${types.padEnd(10)} ${config.description}`
    );
  }
  process.exit(0);
}
