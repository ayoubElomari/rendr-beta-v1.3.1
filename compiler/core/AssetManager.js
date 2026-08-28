const AssetManager = {
  media: {},
};

// Loading assets
async function loadAssets(assets) {
  if (!assets) return;

  // Load fonts
  if (assets.fonts) {
    for (let i = 0; i < assets.fonts.length; i++) {
      let url = assets.fonts[i];
      if (url.src) {
        url = url.src; // Use src if available
      }
      const status = await loadGoogleFontBlocking(url, 500);
      if (!status) {
        console.warn(`Failed to load font from URL: ${url}`);
        // Remove the font from the assets if it fails to load
        assets.fonts.splice(i, 1);
        i--; // Adjust index after removal
      }
    }
  }

  // Load media (images, video, audio)
  if (assets.media) {
    const loadPromises = Object.entries(assets.media).map(
      async ([id, { type, src, frames, chunks, chunkSize }]) => {
        if (!type || (!src && !frames && !chunks)) {
          console.warn(`Asset ${id} is missing type or src.`);
          return Promise.resolve(); // Skip invalid assets
        }
        if (type == "image") {
          await loadImage(src);
          AssetManager.media[id] = { src, type };
        } else if (type == "video") {
          if (frames && frames.length > 0) {
            // Load video frames directly
            frames.forEach(({ time }, i) => {
              frames[i].frame = secondsToFrames(time);
            });
            AssetManager.media[id] = { frames, type };
          }
          if (typeof src === "string" && src.endsWith(".json")) {
            chunks = [src]; // Use src as a single chunk if it's a JSON file
          }
          if (chunks && chunks.length > 0) {
            // Load video chunks
            const chunkHandler = new VideoChunkHandler(chunks, chunkSize);
            AssetManager.media[id] = {
              type,
              chunkHandler,
            };
          }
        } else {
          return Promise.resolve(); // Skip unsupported types
        }
      }
    );

    await Promise.all(loadPromises);
  }
}

async function loadImage(src) {
  let el;
  el = new Image();
  el.src = src;
  el.style.display = "none"; // invisible
  el.preload = "auto";
  document.body.appendChild(el);
  await new Promise((resolve, reject) => {
    el.onload = el.oncanplaythrough = () => resolve();
    el.remove();
    el.onerror = () => reject(`Failed to load asset: ${src}`);
  });
}
async function loadGoogleFontBlocking(
  cssUrl,
  timeout = 5000,
  fontFamily = null
) {
  // Step 1: Fetch and inject the Google CSS
  const cssResponse = await fetch(cssUrl, { mode: "cors" });

  if (!cssResponse.ok)
    throw new Error("Failed to fetch font CSS for: " + cssUrl);

  const css = await cssResponse.text();

  if (!fontFamily) {
    // Extract font-family from the CSS if not provided
    const fontFamilyMatch = css.match(/font-family:\s*['"]?([^'";]+)['"]?/);
    if (fontFamilyMatch) {
      fontFamily = fontFamilyMatch[1];
    } else {
      throw new Error("Font family not specified and could not be extracted");
    }
  }

  // Create a style element and append the CSS
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // Step 2: Wait until font is loaded and usable
  const fontFaceCheck = `1em "${fontFamily}"`;

  try {
    const loadResult = await Promise.race([
      document.fonts.load(fontFaceCheck),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Font load timeout")), timeout)
      ),
    ]);
    await document.fonts.ready;

    if (loadResult.length > 0) {
      console.log(`Font: "${fontFamily}" loaded and ready.`);
      return true;
    } else {
      throw new Error(`Font: "${fontFamily}" not available.`);
    }
  } catch (err) {
    console.warn(`Font: "${fontFamily}" failed to load in time:`, err.message);
    style.remove(); // Clean up the style element
    return false;
  }
}
