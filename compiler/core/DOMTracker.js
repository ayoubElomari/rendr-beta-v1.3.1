class ElementTracker {
  constructor(containerElement) {
    this.container = containerElement;
    this.trackedElements = new Map(); // Use Map for better structure
  }

  addElement(element, start, end, removeFunc) {
    if (!this.trackedElements.has(element)) {
      this.container.appendChild(element); // Add to the DOM if not already present
    }
    this.trackedElements.set(element, { start, end, removeFunc }); // Update or add the element
  }

  removeElement(element) {
    if (this.trackedElements.has(element)) {
      this.container.removeChild(element); // Remove from the DOM
      this.trackedElements.delete(element); // Remove from the Map
    }
  }

  strictClear() {
    this.trackedElements.forEach((_, element) => {
      this.container.removeChild(element);
    });
    this.trackedElements.clear();
  }

  clear(frame) {
    this.trackedElements.forEach((value, el) => {
      if (frame < value.start || frame > value.end) {
        value.removeFunc();
      }
    });
  }

  getElements() {
    return Array.from(this.trackedElements.keys()); // Return elements as an array
  }
}
