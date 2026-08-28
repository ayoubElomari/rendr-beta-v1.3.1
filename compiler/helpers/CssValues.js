// Converts a value into a CSS-compatible value
function cssValue(value, property) {
    const nonPixelProperties = ["opacity", "zIndex", "lineHeight", "flexGrow", "flexShrink", "order"];

    if (typeof value === "number" && !nonPixelProperties.includes(property)) {
        return `${value}px`;
    }
    if (typeof value === "string") {
        return value;
    }
    if (value === null || value === undefined) {
        return "";
    }
    return value
}
// Converts an object into a CSS-compatible string
function cssObject(obj) {
    if (!obj) return {}

    const styles = {};
    for (const [key, value] of Object.entries(obj)) {
        styles[key] = cssValue(value, key);
    }

    return styles;
}
// Checks if value is a valid css value like "10px", "100%", "1em", "url('image.png')", linear-gradient, and colors, etc.
function isCssValue(str) {
    if (typeof str !== "string") return false;

    // Check for common CSS value patterns
    const cssPatterns = [
        /^-?\d+(\.\d+)?(px|em|rem|%|vw|vh|vmin|vmax|pt|cm|mm|in)?$/, // Length values
        /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*[\d\.]+)?\s*\)$/, // RGB/RGBA colors
        /^hsl(a)?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(\s*,\s*[\d\.]+)?\s*\)$/, // HSL/HSLA colors
        /^#[0-9a-fA-F]{3,6}$/, // Hex colors
        /^url\(['"][^'"]+['"]\)$/, // URL values
        /^(linear-gradient|radial-gradient)\(/ // Gradient functions
    ];

    return cssPatterns.some(pattern => pattern.test(str));
}

// Checks if value is a valid hex color
function isHexColor(str) {
    if (typeof str !== "string") return false;
    return /^#[0-9a-fA-F]{3,6}$/.test(str);
}