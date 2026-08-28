class BackgroundElement extends AnimatableElement {
    createElement() {
        const el = document.createElement("div");
        el.id = "background-element";
        el.style.position = "absolute";
        el.style.top = "0px";
        el.style.left = "0px";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.zIndex = 0
        el.style.background = this.config.background || "#000000";
        return el;
    }
}