const { timecodeToSeconds } = require("../Utils/timecode");

class RenderConfig {
  constructor(jsonData) {
    this.renderConfig = jsonData;
    this.settings = this.renderConfig.settings || {};
    this.plugins = this.renderConfig.plugins || [];
    this.assets = this.renderConfig.assets || [];
    this.timeline = this.renderConfig.timeline || [];
    this.audioTimeline = this.renderConfig["audio-timeline"] || [];

    this.totalDuration = this.timeline.reduce((acc, item) => {
      const start = timecodeToSeconds(item.at, this.settings.fps) || 0;
      const duration = timecodeToSeconds(item.duration, this.settings.fps) || 0;
      return Math.max(acc, start + duration);
    }, 0);

    // Number of workers for parallel processing
    this.numberOfWorkers = global.args.numberOfWorkers;
    this.handleArgs();
  }
  /* Plugin Management */
  removePlugin(pluginName) {
    this.plugins = this.plugins.filter((plugin) => plugin !== pluginName);
    this.renderConfig.plugins = this.plugins;
  }
  addPlugin(pluginName) {
    if (!this.plugins) {
      this.plugins = [];
    }
    if (this.plugins.includes(pluginName)) {
      return;
    }
    this.plugins.push(pluginName);
    this.renderConfig.plugins = this.plugins;
  }
  /* Asset Management */
  removeMediaAsset(assetName) {
    if (!this.assets.media) {
      this.assets.media = [];
    }
    this.assets.media = Object.fromEntries(
      Object.entries(this.assets.media).filter(([name]) => name !== assetName)
    );
    this.renderConfig.assets = this.assets;
  }
  editMediaAsset(assetName, newData) {
    if (!this.assets.media) {
      this.assets.media = [];
    }
    if (!this.assets.media[assetName]) {
      this.assets.media[assetName] = {};
    }
    this.assets.media[assetName] = {
      ...this.assets.media[assetName],
      ...newData,
    };
    this.renderConfig.assets = this.assets;
  }

  handleArgs() {
    const args = global.args;
    Object.entries(this.settings).forEach(([key, value]) => {
      if (args[key]) {
        this.settings[key] = args[key];
      }
    });
  }
}

module.exports = RenderConfig;
