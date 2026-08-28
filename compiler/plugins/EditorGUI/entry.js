console.log("Editor GUI Plugin Loaded");

class EditorGUI {
  constructor() {
    this.editor = null;
    this.updateTimeout = null;
  }
  async init() {
    // Init plugin
    await initPlugin();

    // Layout
    initResizableLayout();
    observePlaybackContainerResize();
    // Editor
    this.editor = new MonacoEditor("#editor-area");
    await this.editor.init();

    // Load from localStorage or default
    this.loadFromLocalStorage();

    // Controls
    initControls();
    // Init playback notification
    handlePlaybackNotification();

    // Refresh renderer based functions
    this.handleRendererChanges();

    // Handle Editor changes
    this.handleEditorChange();

    // Enable rendering in realtime
    renderer.options.realtime = true;
  }
  handleRendererChanges() {
    // Handle Frame Change
    handleFrameChange();
    // Button state updates
    updateButtonsState();
  }

  handleEditorChange() {
    this.editor.editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        // Your custom save logic here
        this.handleSaving();
      }
    );
    this.editor.editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => {
        this.handleUpdating();
      }
    );
    this.editor.editor.addCommand(
      monaco.KeyMod.Alt | monaco.KeyCode.KeyS,
      () => {
        this.handleUpdating();
      }
    );
  }
  async handleUpdating() {
    try {
      if (!this.editor.isValidJson()) return;

      const updatedValue = this.editor.getValue();
      const newJson = JSON.parse(updatedValue);
      renderer.pause();
      await updateEngine(newJson, renderer.currentFrame);
      this.handleRendererChanges();

      // Save to localStorage
      this.saveToLocalStorage();
    } catch (error) {}
  }
  async handleSaving() {
    try {
      if (!this.editor.isValidJson()) return;

      const fullJson = { ...renderJson, ...JSON.parse(this.editor.getValue()) };
      const prettyJson = JSON.stringify(fullJson, null, 2);
      const blob = new Blob([prettyJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "rendr_file.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      // Update the editor with the saved content
      this.handleUpdating();
    } catch (err) {
      console.error("Invalid JSON, cannot save:", err);
      alert("Invalid JSON, cannot save.");
    }
  }

  // Load and Save to localStorage
  loadFromLocalStorage() {
    if (window?.editorOptions?.useLocalStorage) {
      const storedJson = localStorage.getItem("rendrJson");
      if (storedJson) {
        this.editor.setValue(storedJson);
        this.handleUpdating();
      }
    }
  }
  saveToLocalStorage() {
    if (!window?.editorOptions?.useLocalStorage) {
      const currentJson = this.editor.getValue();
      localStorage.setItem("rendrJson", currentJson);
    }
  }
}

(async () => {
  try {
    // Initialize the Editor GUI
    window.editorGUI = new EditorGUI();
    await editorGUI.init();
  } catch (error) {
    console.error("Error initializing Editor GUI:", error);
  }
})();
