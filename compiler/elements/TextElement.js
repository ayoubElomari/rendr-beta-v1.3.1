class TextElement extends AnimatableElement {
  createElement() {
    const el = document.createElement("span");
    el.textContent = this.config.content || "";
    el.style.position = "absolute";
    return el;
  }
}
