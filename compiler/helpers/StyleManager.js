class StyleManager {
  constructor(element, elementStyleProperty = {}) {
    this.el = element;
    this.globalStyle = elementStyleProperty;
    this.applyStyles();
  }

  applyStyles() {
    // Avoid duplicate style injection
    try {
      if (this.globalStyle == null) return;
      if (this.el.querySelector("style[data-style-manager]")) return;
      const styleEl = this.generateScopedStyle(this.globalStyle);
      styleEl.dataset.styleManager = true;
      this.el.appendChild(styleEl);
    } catch (error) {
      console.error("Error applying styles:", error);
    }
  }

  handleStyleValue(style, selector = "&") {
    // Handle special layout rules when selector is root
    if (this.mapSelector(selector) === "") {
      style.width =
        style.width === "100%" ? settings.resolution[0] : style.width || "100%";
      style.height =
        style.height === "100%"
          ? settings.resolution[1]
          : style.height || "100%";
      style.position = style.position || "absolute";
    }
    // Handle text-stroke
    if (style.textStroke) {
      let newTextShadow = textStroke(style.textStroke);
      delete style.textStroke;
      style.textShadow = newTextShadow;
    }
    return style;
  }

  mapSelector(selector) {
    const selectorMap = {
      "&": "&",
      "": "&",
    };
    return Object.keys(selectorMap).includes(selector)
      ? selectorMap[selector]
      : selector;
  }

  generateScopedStyle(elementStyleProperty) {
    const parentSelector = `#${this.el.id}`;

    // ---- Helpers ----

    // Converts camelCase to kebab-case
    function toKebabCase(str) {
      return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    }

    // Converts a JS style object to a CSS string
    function styleObjectToCss(styleObj) {
      return Object.entries(styleObj)
        .map(([prop, val]) => {
          if (prop === "content" && typeof val === "string") {
            val = `"${val}"`; // wrap content in quotes
          }
          return `${toKebabCase(prop)}: ${val};`;
        })
        .join(" ");
    }

    // Replace '&' with parentSelector, otherwise prefix with it
    function scopeSelector(selector, parent) {
      return selector
        .split(",")
        .map((s) => {
          s = s.trim();
          if (s.includes("&")) {
            return s.replace(/&/g, parent);
          }
          if (s.startsWith(":root")) {
            return "#record-area" + s.slice(5);
          }

          return s.startsWith(parent) ? s : `${parent} ${s}`;
        })
        .join(", ");
    }

    // Deep merge helper for nested style objects
    function deepMerge(target, source) {
      for (const key in source) {
        if (
          source[key] &&
          typeof source[key] === "object" &&
          !Array.isArray(source[key])
        ) {
          target[key] = deepMerge(target[key] || {}, source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    }

    // Resolves string paths from presets and merges everything
    function resolveStyleProperties(styleDefs) {
      return styleDefs.reduce((finalMap, entry) => {
        let resolved = {};
        if (typeof entry === "string") {
          const split = entry.split(":");
          if (split[0] === "presets" && renderJson?.presets?.[split[1]]) {
            resolved = renderJson.presets[split[1]];
          } else {
            console.warn(
              `Style path "${entry}" not found in renderJson.presets`
            );
          }
        } else if (typeof entry === "object" && entry !== null) {
          resolved = entry;
        }

        return deepMerge(finalMap, resolved);
      }, {});
    }

    // ---- Main Logic ----

    // Allow either a single object or an array of style definitions
    let cssMap = !Array.isArray(elementStyleProperty)
      ? [elementStyleProperty]
      : elementStyleProperty;
    cssMap = resolveStyleProperties(cssMap);

    // Build CSS string
    let cssString = "";
    for (const [selector, styleObj] of Object.entries(cssMap)) {
      const handledStyle = this.handleStyleValue({ ...styleObj }, selector);
      if (Object.keys(handledStyle).length === 0) continue;

      const scopedSelector = scopeSelector(selector, parentSelector);
      const cssRules = styleObjectToCss(handledStyle);
      cssString += `${scopedSelector} { ${cssRules} }\n`;
    }

    // Create and return style element
    const styleEl = document.createElement("style");
    styleEl.textContent = cssString;

    return styleEl;
  }
}

function textStroke(radius = 40) {
  const color = "#000";
  const n = Math.ceil(2 * Math.PI * radius);
  var str = "";
  for (var i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / n;
    str +=
      radius * Math.cos(theta) +
      "px " +
      radius * Math.sin(theta) +
      "px 0 " +
      color +
      (i == n - 1 ? "" : ",");
  }
  return str;
}
