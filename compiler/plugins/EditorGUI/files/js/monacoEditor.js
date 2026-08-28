class MonacoEditor {
  constructor(containerSelector) {
    // Ensure the container exists
    if (!containerSelector) {
      throw new Error(
        "Container selector is required to initialize MonacoEditor."
      );
    }
    this.container = document.querySelector(containerSelector);
    this.editor = null;

    if (!this.container) {
      throw new Error(
        `Container with selector "${containerSelector}" not found.`
      );
    }

    // Setting up content
    const renderJson = window.renderJson;
    const editorContent = {
      timeline: renderJson.timeline,
      presets: renderJson.presets || {},
    };
    this.defaultContent = JSON.stringify(editorContent, null, 2);
  }

  async init() {
    await this._loadMonaco();

    // Define a custom theme
    monaco.editor.defineTheme("cleanDarkTheme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "CCCCCC" }, // default text
        { token: "string", foreground: "A3E635" }, // soft lime
        { token: "number", foreground: "FFB86C" }, // orange
        { token: "keyword", foreground: "8BE9FD" }, // light blue
        { token: "operator", foreground: "F8F8F2" },
        { token: "delimiter", foreground: "5AF78E" }, // teal
        { token: "comment", foreground: "555555", fontStyle: "italic" },
        { token: "attribute.name.json", foreground: "50FA7B" }, // keys in JSON
        { token: "invalid", foreground: "FF5555", fontStyle: "underline" },
      ],
      colors: {
        "editor.background": "#020202",
        "editor.foreground": "#CCCCCC",
        "editorCursor.foreground": "#FFCC00",
        "editorLineNumber.foreground": "#3A3A3A",
        "editorLineNumber.activeForeground": "#AAAAAA",
        "editor.lineHighlightBackground": "#111111",
        "editor.selectionBackground": "#264f78",
        "editor.inactiveSelectionBackground": "#33333366",
        "editorIndentGuide.background": "#2A2A2A",
        "editorIndentGuide.activeBackground": "#444444",
        "editorWidget.background": "#1C1C1C",
        "editorWidget.border": "#333333",
        "editor.findMatchBackground": "#FFE79244",
        "editor.findMatchHighlightBackground": "#FFE79233",
        "editor.rangeHighlightBackground": "#ffffff08",
        "editorBracketMatch.background": "#3A3A3A",
        "editorBracketMatch.border": "#AAAAAA33",
        "editorWhitespace.foreground": "#3A3A3A",
      },
    });

    // Create the editor with custom options
    this.editor = monaco.editor.create(this.container, {
      value: this.defaultContent,
      language: "json",
      theme: "cleanDarkTheme",
      fontSize: 14,
      fontFamily: "Fira Code, monospace",
      cursorStyle: "line",
      lineNumbers: "on",
      renderLineHighlight: "line",
      minimap: { enabled: true },
      wordWrap: "on",
      stickyScroll: { enabled: false },
    });
  }
  onChange(callback) {
    if (this.editor) {
      this.editor.onDidChangeModelContent(callback);
    }
  }

  isValidJson() {
    try {
      const model = this.editor.getModel();
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });

      const hasErrors = markers.some(
        (marker) => marker.severity === monaco.MarkerSeverity.Error
      );

      return !hasErrors;
    } catch {
      return false;
    }
  }

  getValue() {
    return this.editor ? this.editor.getValue() : "";
  }

  setValue(jsonString) {
    if (this.editor) this.editor.setValue(jsonString);
  }

  async _loadMonaco() {
    return new Promise((resolve) => {
      if (window.monaco) return resolve();

      const loaderScript = document.createElement("script");
      loaderScript.src =
        "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs/loader.js";
      loaderScript.onload = () => {
        window.require.config({
          paths: {
            vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs",
          },
        });
        window.require(["vs/editor/editor.main"], resolve);
      };
      document.body.appendChild(loaderScript);
    });
  }
}
