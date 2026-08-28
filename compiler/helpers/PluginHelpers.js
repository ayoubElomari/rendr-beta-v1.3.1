async function loadLibrary(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(script);
  });
}

async function loadStyle(url) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(link);
  });
}

async function loadLibraries(urls, callback) {
  const promises = urls.map((url) => {
    if (url.endsWith(".js")) {
      return loadLibrary(url);
    } else if (url.endsWith(".css")) {
      return loadStyle(url);
    } else {
      return Promise.reject(new Error(`Unsupported asset type: ${url}`));
    }
  });
  await Promise.all(promises);
  if (typeof callback === "function") {
    callback();
  }
}

async function loadPluginAsset(relativePath, ignoreWarnings = false) {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error("Invalid asset path");
  }

  const fullPath = `plugins/${relativePath}`;
  if (fullPath.endsWith(".js")) {
    await loadLibrary(fullPath);
  } else if (fullPath.endsWith(".css")) {
    await loadStyle(fullPath);
  } else {
    if (!ignoreWarnings) {
      console.warn(`Unsupported asset type: ${fullPath}`);
    }
  }
}