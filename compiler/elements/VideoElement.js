class VideoElement extends AnimatableElement {
  #isCanvasInitialized = false;
  createElement() {
    this.imageCache = new Map();
    const canvas = document.createElement("canvas");
    return canvas;
  }

  initCanvas() {
    this.el.width = this.style.width || settings.resolution[0];
    this.el.height = this.style.height || settings.resolution[1];
    this.ctx = this.el.getContext("2d");

    this.#isCanvasInitialized = true;
  }

  async customRender(frame) {
    if (!this.#isCanvasInitialized) {
      this.initCanvas();
    }

    // Handle debugging
    if (this.config.debugFrames) {
      _debugFrames();
    }

    const frameData = await AssetManager.media[
      this.config.src
    ]?.chunkHandler?.getFrame(frame, this.config.loop);

    if (!frameData) {
      console.warn(`No frame data found for video: ${this.config.src}`);
      return;
    }

    // Draw it to canvas
    const img = await this.loadImage(frameData.src);
    const canvasW = this.el.width;
    const canvasH = this.el.height;

    const { drawWidth, drawHeight, offsetX, offsetY } =
      this.getObjectFitDrawParams(
        canvasW,
        canvasH,
        img.width,
        img.height,
        "cover"
      );
    this.ctx.clearRect(0, 0, canvasW, canvasH);
    this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }

  loadImage(src) {
    if (this.imageCache.has(src)) return this.imageCache.get(src);

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    this.imageCache.set(src, promise);
    return promise;
  }
  getObjectFitDrawParams(canvasW, canvasH, imgW, imgH, objectFit = "cover") {
    const imgRatio = imgW / imgH;
    const canvasRatio = canvasW / canvasH;

    if (objectFit === "cover") {
      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > canvasRatio) {
        drawHeight = canvasH;
        drawWidth = canvasH * imgRatio;
        offsetX = (canvasW - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvasW;
        drawHeight = canvasW / imgRatio;
        offsetX = 0;
        offsetY = (canvasH - drawHeight) / 2;
      }

      return { drawWidth, drawHeight, offsetX, offsetY };
    }

    // Add other modes like 'contain' or 'fill' here if needed
    throw new Error(`Unsupported objectFit: ${objectFit}`);
  }
  _debugFrames() {
    const previousDebugElement =
      this.el.parentElement.querySelector("#debug-video-frame") || null;
    if (!previousDebugElement) {
      const debugElement = document.createElement("h4");
      debugElement.id = "debug-video-frame";
      debugElement.style.position = "fixed";
      debugElement.style.top = "50%";
      debugElement.style.left = "50%";
      debugElement.style.transform = "translate(-50%, -50%)";
      debugElement.style.zIndex = "1000";
      debugElement.textContent = `Rendering video frame ${frame}`;
      debugElement.style.color = "white";
      debugElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      debugElement.style.padding = "10px";
      this.el.parentElement.appendChild(debugElement);
    } else {
      previousDebugElement.textContent = `Rendering video frame ${frame}`;
    }
  }
  calcu;
}
