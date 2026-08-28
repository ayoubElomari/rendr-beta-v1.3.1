class TimelineManager {
  constructor(timeline) {
    // timeline = list of elements
    this.timeline = timeline;
    this.frameMap = {};
    this.elements = [];
    this.totalFrames = 0;
    this.videoDuration = 0;

    this._initTimeline();
    this._buildFrameMap();
  }
  _initTimeline() {
    this.timeline.forEach((elem) => {
      const ElemClass = resolveElementType(elem.type);
      const renderableElement = new ElemClass(elem);
      this.elements.push(renderableElement);
    });
  }
  _buildFrameMap() {
    let lastFrame = 0;
    this.elements.forEach((el) => {
      for (let frame = el.startFrame; frame <= el.endFrame; frame++) {
        if (!this.frameMap[frame]) {
          this.frameMap[frame] = [];
        }
        this.frameMap[frame].push(el);
      }

      // Track total duration
      if (el.endFrame > lastFrame) {
        lastFrame = el.endFrame;
      }
    });
    this.totalFrames = lastFrame + 1; // +1 to include the last frame
    this.videoDuration = this.totalFrames / settings.fps;
  }
}
