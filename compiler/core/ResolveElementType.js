function resolveElementType(type) {
  const builtIn = {
    Text: TextElement,
    Image: ImageElement,
    Video: VideoElement,
    Background: BackgroundElement,
    Caption: CaptionElement,
    // ... any core types
  };

  if (builtIn[type]) return builtIn[type];

  // Plugin fallback (assumes window[type + 'Element'] or window[type])
  if (window.EngineElements[type]) return window.EngineElements[type];
  if (window.EngineElements[type + "Element"])
    return window.EngineElements[type + "Element"];

  throw new Error(`Unknown element type: ${type}`);
}
