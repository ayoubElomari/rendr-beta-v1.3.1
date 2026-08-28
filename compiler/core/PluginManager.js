const pluginManager = {
  plugins: [],
  getFilePath(filename) {
    return this.plugins.filter((plugin) => plugin.files && plugin.files.includes(filename)).map(plugin => `plugins/${plugin.name}/${plugin.files[plugin.files.indexOf(filename)]}`);
  },
  hasPlugin(pluginName) {
    return this.plugins.some((plugin) => plugin.name === pluginName);
  },
};

// Loading plugins
async function loadPluginByName(pluginName) {
  const pluginPath = `plugins/${pluginName}/`;
  
  // Fetch the list of files in the plugin folder
  const response = await fetch(`${pluginPath}config.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch the config file for plugin: ${pluginName}`);
  }
  const pluginConfig = await response.json();

  const pluginEntryPath = `${pluginPath}${pluginConfig.entry || "main.js"}`;

  // Pushing plugin to the pluginManager
  const requirements = pluginConfig.requirements || {};
  const fileList = requirements.files || [];
  const externalLibraries = requirements.externalLibraries || [];
  const ignoreWarnings = requirements.ignoreWarnings || false;

  // Add the plugin to the pluginManager object
  pluginManager.plugins.push({
    name: pluginName,
    files: fileList,
    externalLibraries: externalLibraries,
  });

  // Load plugin files and external libraries
  const assetPromises = pluginManager.plugins.flatMap(async (plugin) => {
    await loadLibraries(plugin.externalLibraries, () => Promise.resolve());
    return plugin.files.map(async (file) =>
      await loadPluginAsset(`${plugin.name}/${file}`, ignoreWarnings)
    );
  });

  await Promise.all(assetPromises);

  // Load the main script
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = pluginEntryPath;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error(`Failed to load plugin script: ${pluginEntryPath}`));
    document.head.appendChild(script);
  });

}
async function loadPlugins(plugins) {
  if (!plugins || !Array.isArray(plugins)) return;

  const loadPromises = plugins.map((pluginName) => {
    return loadPluginByName(pluginName);
  });

  await Promise.all(loadPromises);
}
