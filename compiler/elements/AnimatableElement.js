class AnimatableElement {
  constructor(elemObject) {
    this.elemObject = elemObject;

    // Frame calculations
    this.startFrame = timeToFrame(this.elemObject.at);
    this.durationFrames = timeToFrame(this.elemObject.duration) - 1; // -1 because we start counting from 0
    this.endFrame = this.startFrame + this.durationFrames;

    // Element properties
    this.config = this.elemObject.config || null;
    this.style = this.elemObject.style || {};

    // Generate a unique ID for the element
    this.id = `element-${Math.random().toString(36).slice(2, 11)}`;

    // DOM Element creation
    this.el = this.createElement();
    this.el.id = !this.el.id ? this.id : this.el.id;
    this.styleElement();

    // Rendering state
    this.isMounted = false;

    this.extraInitialization();
  }

  createElement() {
    return document.createElement("div");
  }

  styleElement() {
    if (this.style && Object.keys(this.style).length) {
      this.styleManager = new StyleManager(this.el, this.style);
      this.style = this.styleManager.mainElementStyle || {};
    }
  }

  handleAnimation(frame) {
    // Resetting the element's transform
    this.el.style.transform = "";

    // ── MOTION (x, y) ──
    if (this.motion && this.motion.length) {
      // 1) accumulate all active motion deltas
      let x = 0,
        y = 0;
      for (const m of this.normalizedMotion) {
        const start = m.absAt;
        const end = start + m.duration;
        if (frame < start || frame >= end) continue;

        const localFrame = frame - start;
        const t = m.easing(localFrame / (m.duration - 1));
        const fromX = m.from.position?.[0] ?? m.from.x ?? 0;
        const fromY = m.from.position?.[1] ?? m.from.y ?? 0;
        const toX = m.to.position?.[0] ?? m.to.x ?? 0;
        const toY = m.to.position?.[1] ?? m.to.y ?? 0;

        x += interpolateValue(fromX, toX, t);
        y += interpolateValue(fromY, toY, t);
      }
      // If we don’t have a blur helper or a lastPosition, just translate
      if (!this._motionBlur || !this.lastPosition) {
        this.el.style.transform = `translate(${cssValue(x)}, ${cssValue(y)})`;
        // record for next frame so future frames can blur
        this.lastPosition = { x, y };
      } else {
        // 2) compute velocity since last frame
        const dx = x - this.lastPosition.x;
        const dy = y - this.lastPosition.y;

        // 3) threshold & cap the blur
        const rawX = Math.abs(dx) * this.blurMultiplier;
        const rawY = Math.abs(dy) * this.blurMultiplier;
        const blurX =
          rawX > this.blurThreshold
            ? Math.min(rawX - this.blurThreshold, this.maxBlur)
            : 0;
        const blurY =
          rawY > this.blurThreshold
            ? Math.min(rawY - this.blurThreshold, this.maxBlur)
            : 0;

        // detect new motion start
        const justStarted = this.normalizedMotion.some(
          (m) => frame === m.absAt
        );

        // 4) apply blur (zero on first frame of each motion)
        if (justStarted) {
          this._motionBlur.setStdDeviation({ x: 0, y: 0 });
        } else {
          this._motionBlur.setStdDeviation({ x: blurX, y: blurY });
        }

        // 5) compute perpendicular “squish”
        let squishX =
          1 - Math.min(Math.abs(dy) * this.squishFactor, this.maxSquish);
        let squishY =
          1 - Math.min(Math.abs(dx) * this.squishFactor, this.maxSquish);

        // reset squish on motion boundary
        if (justStarted) {
          squishX = 1;
          squishY = 1;
        }

        // 6) apply translate + scale
        this.el.style.transform = [
          `translate(${cssValue(x)}, ${cssValue(y)})`,
          `scale(${squishX.toFixed(3)}, ${squishY.toFixed(3)})`,
        ].join(" ");

        // 7) remember for next frame
        this.lastPosition = { x, y };
      }
    } else {
      // —— no more motion ⇒ fully reset blur & transform ——
      if (this._motionBlur) {
        this._motionBlur.setStdDeviation({ x: 0, y: 0 });
      }
      this.el.style.transform = "";
    }

    // ── ANIMATION (any CSS prop) ──
    if (this.animation && this.animation.length) {
      this.animation.forEach((anim) => {
        if (frame < anim.at || frame >= anim.at + anim.duration) {
          if (anim.forward === false) {
            for (const prop in anim.from) {
              const fromValue = anim.from[prop];
              if (fromValue !== undefined) {
                this.el.style[prop] = cssValue(fromValue, prop);
              }
            }
          }
          return;
        }

        const localFrame = frame - anim.at;
        const progress = anim.easing(localFrame / (anim.duration - 1)); // -1 for inclusive end

        // Apply each property animation
        for (const prop in anim.from) {
          if (anim.to.hasOwnProperty(prop)) {
            const fromValue = anim.from[prop];
            const toValue = anim.to[prop];
            if (fromValue !== undefined && toValue !== undefined) {
              const interpolatedValue = interpolateValue(
                fromValue,
                toValue,
                progress
              );

              if (prop === "transform") {
                // Handle transform separately
                this.el.style.transform += cssValue(interpolatedValue, prop);
                continue;
              }
              this.el.style[prop] = cssValue(interpolatedValue, prop);
            }
          }
        }
      });
    }
  }

  async renderAt(frame) {
    return await new Promise(async (resolve) => {
      const visible = this.isVisibleAt(frame);
      if (!visible) return resolve();
      this.mount();
      // Custom rendering logic
      await this.customRender(frame);

      // Apply motion transform
      this.handleAnimation(frame);
      resolve();
    });
  }

  _normalizeMotions() {
    if (!this.motion || !this.motion.length) return;
    let cursor = this.startFrame;
    // build a new array with an `absAt` on each motion
    this.normalizedMotion = this.motion.map((m) => {
      const absAt = cursor + m.at;
      cursor = absAt + m.duration;
      return Object.assign({}, m, { absAt });
    });
  }
  mount() {
    if (!this.isMounted) {
      DOMTracker.addElement(
        this.el,
        this.startFrame,
        this.endFrame,
        this.remove.bind(this)
      );
      this.isMounted = true;
    }
  }
  remove() {
    DOMTracker.removeElement(this.el);

    if (this.isMounted) {
      this.isMounted = false;
    }
  }
  async customRender(frame) {
    return 0;
  }
  isVisibleAt(frame) {
    return frame >= this.startFrame && frame <= this.endFrame;
  }
  extraInitialization() {
    // Animation and motion properties
    ["motion", "animation"].forEach((prop) => {
      if (this.elemObject[prop] && Array.isArray(this.elemObject[prop])) {
        this.elemObject[prop].map((obj) =>
          Object.assign(obj, {
            at: obj.at ? timeToFrame(obj.at) : 0,
            duration: timeToFrame(obj.duration),
            easing: Easing[obj.easing] || Easing.linear,
            forward:
              obj.forward !== undefined
                ? obj.forward
                : this.elemObject.animationForward !== undefined
                ? this.elemObject.animationForward
                : true,
          })
        );
        this[prop] = this.elemObject[prop] || null;
      }
    });
    this._normalizeMotions();

    // Motion blur setup
    if (pluginManager.hasPlugin("MotionBlur")) {
      this.lastPosition = { x: null, y: null }; // For motion blur
      this._motionBlur = createMotionBlurFilter();
      // apply it to the DOM node
      this.el.style.filter = `url(#${this._motionBlur.id})`;
      this.el.style.willChange = "filter, transform";

      // Tweakables:
      this.blurMultiplier = 0.5; // px of blur per px of movement
      this.blurThreshold = 2; // px/sec below which we remove blur
      this.maxBlur = 20; // cap so text stays legible

      this.squishFactor = 0.003; // amount of scale‐change per px
      this.maxSquish = 0.15; // never squash more than 15%
    }
  }
}
