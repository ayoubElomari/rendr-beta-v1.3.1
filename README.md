# Rendr (v1.3.1)

A rendering engine that compiles a JSON composition into video: a timeline of
text, image, video and caption elements, each with its own animation, resolved
frame by frame and encoded to output.

**This is a legacy version.** It's the engine that was actually in production
for a long stretch, rendering a large share of the videos published through
[Shorts Engine](https://github.com/ayoubElomari/shorts-engine), an automated
video pipeline that ran multiple content channels unattended. A newer rewrite
(v2) has since replaced it and is closed source for now, this repo exists so
the earlier, real, working version is visible rather than just described.

## How it works

The `compiler/` renders a composition by launching a headless browser
(Puppeteer) and driving it frame by frame: each element type (`TextElement`,
`ImageElement`, `VideoElement`, `CaptionElement`, `BackgroundElement`) resolves
its own styling and animation state for a given frame, the DOM is updated to
match, and the frame is captured and handed off for encoding. `bin/` holds the
CLI entry point; `src/` holds the plugin system that extended it (video
support, etc.).

```
bin/            CLI entry point (rendr.py, rendr.exe)
compiler/
  core/         composition parsing, timeline, asset and plugin management
  elements/     per-element rendering logic
  helpers/      animation, easing, CSS value resolution
  plugins/      compiler-side plugin hooks
  renderer/     the render pipeline itself
src/
  Plugins/      the plugin system used at runtime (e.g. video support)
  Renderer/
  Utils/
run.js          entry point
```

## Status

Not maintained. Published as-is for reference, not as a starting point for new
work, if you want the current version of Rendr, it isn't public yet.

## License

MIT, see [LICENSE](LICENSE).
