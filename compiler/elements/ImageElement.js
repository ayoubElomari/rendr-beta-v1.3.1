class ImageElement extends AnimatableElement {
  createElement() {
    const imageData = AssetManager.media[this.config.src];
    if (!imageData) {
      console.warn(`Image asset not found: ${this.config.src}`);
      return null;
    }
    if (imageData && imageData.type !== "image") {
      console.warn(
        `ImageElement requires an image asset, but got ${imageData.type}`
      );
    }
    const el = document.createElement("img");
    el.src = imageData.src || this.config.src || "";

    el.style.position = "absolute";
    return el;
  }
}
