class RedditPostElement extends AnimatableElement {
  #templateLoaded = false;

  createElement() {
    const redditPostEl = document.createElement("div");
    redditPostEl.classList.add("reddit-post-container");

    this.redditPostEl = redditPostEl;

    // Load the style preset
    if (!redditPluginStylePreset || redditPluginStylePreset.length === 0)
      return document.createElement("div");

    if (!window.renderJson?.presets?.["redditUserBadgeStyle"]) {
      window.renderJson.presets["redditUserBadgeStyle"] =
        redditPluginStylePreset;
    } else {
      window.renderJson.presets = window.renderJson.presets || {};
    }

    const customStyle = "presets:redditUserBadgeStyle";
    if (!this.style) {
      this.style = customStyle;
    } else if (Array.isArray(this.style)) {
      this.style.push(customStyle);
    } else {
      this.style = [this.style, customStyle];
    }

    return redditPostEl;
  }

  async _loadTemplate() {
    this.#templateLoaded = true;

    const postTemplatePath = pluginManager.getFilePath(
      "files/post_template.html"
    );
    const verifiedIconSvg = pluginManager.getFilePath(
      "files/media/Verified-icon.svg"
    );
    const svgContent = await fetch(verifiedIconSvg).then((response) =>
      response.text()
    );

    if (!postTemplatePath || postTemplatePath.length === 0) {
      console.error(
        "RedditPost: Post template file path is not defined or empty."
      );
      return;
    }
    // Handle user pfp
    let userPfp = pluginManager.getFilePath("files/media/default_pfp.png");
    const userPfpAsset = AssetManager.media["userPfp"];
    if (!userPfpAsset || userPfpAsset.type !== "image" || !userPfpAsset.src) {
      console.warn(
        `RedditPost: Error while loading user pfp! Falling back to default pfp.`
      );
      await loadImage(userPfp);
    } else {
      userPfp = userPfpAsset.src;
    }

    await fetch(postTemplatePath)
      .then((response) => response.text())
      .then(async (html) => {
        html = html
          .replace(
            "{{subreddit}}",
            this.config.subreddit ? "r/" + this.config.subreddit : ""
          )
          .replace("{{user_pfp}}", userPfp)
          .replace(
            "{{username}}",
            this.config.username ? "u/" + this.config.username : "Anonymous"
          )
          .replace("{{verified-icon-svg}}", svgContent);
        this.redditPostEl.innerHTML += html;
        this.redditPostContent = this.redditPostEl.querySelector(
          "#reddit-post-container"
        );
      })
      .catch((error) => {
        console.error("Error loading HTML:", error);
      });
  }
  async customRender(frame) {
    if (!this.#templateLoaded) {
      await this._loadTemplate();
    }

    let translateY;
    let animationDuration = (8 * settings.fps) / 30; // 8 frames at 30 fps

    // 1) Off-screen above until it’s time to enter
    if (frame < this.startFrame) {
      translateY = -100;

      // 2) Slide in over animationDuration frames
    } else if (frame < this.startFrame + animationDuration) {
      const t = (frame - this.startFrame) / animationDuration; // 0 → 1
      translateY = interpolate(-100, 0, t);

      // 3) Hold in place
    } else if (frame < this.endFrame - animationDuration) {
      translateY = 0;

      // 4) Slide out over the last animationDuration frames
    } else if (frame < this.endFrame) {
      const t =
        (frame - (this.endFrame - animationDuration)) / animationDuration; // 0 → 1
      translateY = interpolate(0, 100, t);

      // 5) Off-screen below after it’s done
    } else {
      translateY = 100;
    }

    this.redditPostContent.style.transform = `translateY(${translateY}%)`;
  }
}
window.EngineElements.RedditPostElement = RedditPostElement;
const redditPluginStylePreset = {
  "&": {
    overflow: "hidden",
    position: "absolute",
    top: "60%",
    left: "50%",
    padding: "5px 0",
    transform: "translateX(-50%)",
    transformOrigin: "left",
  },
  "#reddit-post-container": {
    fontFamily: "Oswald",
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    paddingLeft: "25px",
  },
  "#reddit-post-container .user-pfp-container": {
    width: "80px",
    aspectRatio: "1 / 1",
    borderRadius: "50%",
    overflow: "hidden",
    boxShadow: "-2px 4px 10px rgba(0, 0, 0, 0.3294117647)",
    border: "3px solid white",
    opacity: 0.7,
  },
  "#reddit-post-container .user-pfp-container img": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    "-o-object-fit": "cover",
  },
  "#reddit-post-container .post-details": {
    display: "flex",
    flexDirection: "column",
  },
  "#reddit-post-container .post-details .subreddit-container": {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "-16px",
  },
  "#reddit-post-container .post-details .subreddit-container span.subreddit-name":
    {
      fontSize: "38px",
      color: "white",
      fontWeight: 500,
      textStroke: 2,
      opacity: 0.7,
    },
  "#reddit-post-container .post-details span.username": {
    fontSize: "36px",
    fontWeight: "400",
    color: "white",
    textStroke: 2,
    opacity: 0.7,
  },
  "#reddit-post-container .post-details .subreddit-container svg": {
    width: "30px",
    height: "30px",
    marginTop: "5px",
    opacity: 0.6,
    filter: "drop-shadow(2px 0px 2px #0005)",
  },
  "#reddit-post-container .post-details .subreddit-container svg path:first-child":
    {
      fill: "var(--accent-color, #ff4500)",
    },
};
