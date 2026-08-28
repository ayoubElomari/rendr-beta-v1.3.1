// Linear interpolation
function interpolate(from, to, progress) {
  return from + (to - from) * progress;
}

function parseColor(str) {
  str = str.trim();
  // HEX: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  let hexMatch = /^#([0-9a-f]{3,8})$/i.exec(str);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map(ch => ch + ch).join('');
    }
    const hasAlpha = hex.length === 8;
    const intVal = parseInt(hex, 16);
    const shift = hasAlpha ? 8 : 0;
    const r = (intVal >> (shift + 16)) & 0xff;
    const g = (intVal >> (shift + 8)) & 0xff;
    const b = intVal & 0xff;
    const a = hasAlpha ? ((intVal >> 0) & 0xff) / 255 : 1;
    return [r, g, b, a];
  }
  // rgb(...) or rgba(...)
  let rgbMatch = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(str);
  if (rgbMatch) {
    return [
      Number(rgbMatch[1]),
      Number(rgbMatch[2]),
      Number(rgbMatch[3]),
      rgbMatch[4] != null ? Number(rgbMatch[4]) : 1,
    ];
  }
  // hsl(...) or hsla(...) -> convert to RGB
  let hslMatch = /^hsla?\(\s*([\d.]+)(deg|rad|turn)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(str);
  if (hslMatch) {
    let h = Number(hslMatch[1]);
    if (hslMatch[2] === 'rad') h = (h * 180) / Math.PI;
    else if (hslMatch[2] === 'turn') h = h * 360;
    h = ((h % 360) + 360) % 360 / 360;
    const s = Number(hslMatch[3]) / 100;
    const l = Number(hslMatch[4]) / 100;
    const a = hslMatch[5] != null ? Number(hslMatch[5]) : 1;
    // HSL to RGB algorithm
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [r * 255, g * 255, b * 255, a];
  }
  return null;
}

// Turn [r,g,b,a] back into the same format as original string (hex vs. rgb/a).
function formatColor(channels, original) {
  const [r, g, b, a] = channels.map((v,i) => i < 3 ? Math.round(v) : v);
  if (original.startsWith('#')) {
    // output 8-digit hex if alpha <1, else 6-digit
    const toHex = n => n.toString(16).padStart(2, '0');
    if (a < 1) {
      return (
        '#' +
        toHex(r) +
        toHex(g) +
        toHex(b) +
        toHex(Math.round(a * 255))
      );
    } else {
      return '#' + toHex(r) + toHex(g) + toHex(b);
    }
  } else if (original.startsWith('rgb')) {
    return a < 1
      ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`
      : `rgb(${r}, ${g}, ${b})`;
  } else {
    // default to rgba()
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }
}

// Interpolate any a→b value at t∈[0,1], returning a CSS string or number.
function interpolateValue(a, b, t) {
  // pure numbers
  if (typeof a === 'number' && typeof b === 'number') {
    return interpolate(a, b, t);
  }
  // colors
  const ca = typeof a === 'string' ? parseColor(a) : null;
  const cb = typeof b === 'string' ? parseColor(b) : null;
  if (ca && cb) {
    // interpolate each channel
    const cc = ca.map((_,i) =>
      interpolate(ca[i], cb[i], t)
    );
    return formatColor(cc, b);
  }
  // strings with numbers
  if (typeof a === 'string' && typeof b === 'string') {
    const numRE = /-?[\d.]+/g;
    const aNums = a.match(numRE)?.map(Number);
    const bNums = b.match(numRE)?.map(Number);
    
    if (aNums && bNums && aNums.length === bNums.length) {
      let i = 0;
      return b.replace(numRE, () => {
        const val = interpolate(aNums[i], bNums[i], t);
        i++;
        return val.toFixed(3);
      });
    }
  }
  // unsupported: return null to trigger fallback
  return null;
}

