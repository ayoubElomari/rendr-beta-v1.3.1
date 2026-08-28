class CaptionElement extends AnimatableElement {
  #isMapped = false;

  createElement() {
    this.timestampFrameMap = new Map();

    const captionEl = document.createElement("div");
    captionEl.classList.add("caption-element-container");
    captionEl.id = this.config.id || "";

    // Caption element

    const captionTextEl = document.createElement("span");
    captionTextEl.id = "caption-text";
    captionEl.appendChild(captionTextEl);

    this.captionTextEl = captionTextEl;
    return captionEl;
  }

  async mapTimestamps() {
    if (!this.config)
      throw new Error("Config is not defined for CaptionElement");

    // Convert timestamps to frames
    if (this.config.timestamps) {
      // Handle different timestamp formats
      this.timestamps = this.config.timestamps;
      if (!Array.isArray(this.config.timestamps)) {
        const words = this.config.timestamps.words.split(" ");
        const timeSeconds = this.config.timestamps.timeSeconds
          .split(" ")
          .map((ts) => ts.split(":")[0]);
        this.timestamps = words.map((ts, i) => ({
          word: ts,
          timeSeconds: parseFloat(timeSeconds[i]),
        }));
      }

      const wordGroup = [];
      if (this.config.wordsAtOnce === -1) {
        this.config.wordsAtOnce = this.timestamps.length;
      }
      this.timestamps.forEach((timestamp, i) => {
        if (timestamp.timeSeconds !== undefined) {
          if (timestamp.frame === undefined) {
            const timeFrames = secondsToFrames(timestamp.timeSeconds);
            timestamp.frame = timeFrames;
          }

          const currentWord = timestamp.word;
          if (currentWord === "<unk>") return; // Skip unknown words
          // Start a new group if needed
          if (
            i % this.config.wordsAtOnce === 0 || // standard group break
            wordGroup.length === 0 || // start of first group
            /[.?!]$/.test(wordGroup[wordGroup.length - 1][1]) // last word ended a sentence
          ) {
            wordGroup.push([[timestamp.frame], currentWord]);
          } else {
            wordGroup[wordGroup.length - 1][0].push(timestamp.frame);
            wordGroup[wordGroup.length - 1][1] += " " + currentWord;
          }
        }
      });

      for (let i = 0; i < wordGroup.length; i++) {
        const group = wordGroup[i];
        if (group[0].length === 1 && this.config.wordsAtOnce > 1) {
          const prevGroup = wordGroup[i - 1];
          const nextGroup = wordGroup[i + 1];
          if (prevGroup && !/[.?!]$/.test(prevGroup[1])) {
            // Merge with previous group if it has only one word
            prevGroup[0].push(group[0][0]);
            prevGroup[1] += " " + group[1];
            wordGroup.splice(i, 1); // Remove the current group
            i--; // Adjust index after removal
          } else if (!/[.?!]$/.test(group[1]) && nextGroup) {
            // Merge with next group if it has only one word
            nextGroup[0].unshift(group[0][0]);
            nextGroup[1] = group[1] + " " + nextGroup[1];
            wordGroup.splice(i, 1); // Remove the current group
            i--; // Adjust index after removal
          }
        }
      }

      // Map the frame to the word
      wordGroup.forEach((group) => {
        this.timestampFrameMap.set(group[0], group[1]);
      });
    }

    this.#isMapped = true;
  }
  async customRender(frame) {
    if (!this.#isMapped) {
      await this.mapTimestamps();
    }
    // Showing each word based on the frame
    const { value, index, tsFrame } = this._getValueAtIndex(frame);
    if (value) {
      this.captionTextEl.innerHTML = value
        .split(" ")
        .map((w, i) => {
          if (index < i) return `<span>${w}</span>`;
          if (index > i) return `<span>${w}</span>`;

          const interpolatedValue = Math.min(
            0.7,
            interpolate(0.2, 0.7, (frame - tsFrame) / 3)
          );
          // Edit the --highlighted-word-bg-opacity CSS variable
          this.captionTextEl.style.setProperty(
            "--highlighted-word-bg-opacity",
            `${interpolatedValue}`
          );

          return `<span class="highlighted-word">${w}</span>`;
        })
        .join(" ");

      // Handle words overflowing
      if (this.config.forceWrap) {
        try {
          const parentWidth = this.captionTextEl.clientWidth;
          const children = Array.from(this.captionTextEl.children);
          let totalWidth = parseFloat(
            window
              .getComputedStyle(
                document
                  .querySelector("#video-preview")
                  .shadowRoot.querySelector("#caption-text")
              )
              .columnGap.replace("px", "")
          );
          for (const child of children) {
            totalWidth += child.clientWidth;
          }
          if (totalWidth > parentWidth) {
            for (const child of children) {
              const childFontSize = parseFloat(
                window.getComputedStyle(child).fontSize.replace("px", "")
              );
              child.style.fontSize = `${
                (childFontSize * parentWidth) / (totalWidth * 1.5)
              }px`;
            }
          }
        } catch (e) {}
      }
    }
  }
  _getValueAtIndex(frame) {
    let result = { value: null, index: null };
    let latestTimestamp = -Infinity;

    for (const [key, value] of this.timestampFrameMap.entries()) {
      const timestamps = key;
      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        if (ts <= frame && ts > latestTimestamp) {
          latestTimestamp = ts;
          result = { value, index: i, tsFrame: ts };
        }
      }
    }
    return result;
  }
}
