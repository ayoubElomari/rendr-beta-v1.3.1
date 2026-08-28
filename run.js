const { handleArgs } = require("./src/Utils/args");
const Renderer = require("./src/Renderer/renderer");
const { handleJson, showVersion } = require("./src/Utils/helpers");
const { closeCallbackStack } = require("./src/Utils/callbackStack");

(async () => {
  // Print the version of Rendr
  showVersion();

  // Handle command line arguments
  const args = handleArgs();
  global.args = args;

  const jsonData = await handleJson();

  const r = new Renderer(jsonData);

  // Handle User Interface mode
  if (args.useUI) {
    await r.initUserInterface();
    return 0;
  }

  // Handle rendering
  await r.parallelRender();
  return 0;
})();

process.on("beforeExit", async () => {
  await closeCallbackStack.close();
});
