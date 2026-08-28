async function handlePlugins(rendererConfig, numberOfWorkers) {
  const plugins = rendererConfig.plugins || [];
  if (!Array.isArray(plugins) || plugins.length === 0) {
    return;
  }
  // List of server-side plugins
  const serverPlugins = ["VideoSupport"];

  // Handling server-side plugins
  for (const plugin of plugins) {
    if (serverPlugins.includes(plugin)) {
      const pluginName = plugin;
      // removing the plugin from the list to avoid loading it on the client side
      rendererConfig.removePlugin(pluginName);
      try {
        const pluginModule = require(`./${pluginName}/${pluginName}.js`);
        if (typeof pluginModule.init === "function") {
          rendererConfig = await pluginModule.init(
            rendererConfig,
            numberOfWorkers
          );
        }
      } catch (error) {
        console.error(
          `Failed to load server-side plugin ${pluginName}/${pluginName}.js:`,
          error
        );
      }
    }
  }
}

module.exports = { handlePlugins };
