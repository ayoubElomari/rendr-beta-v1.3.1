/* 🔹 Interpolation and easing functions.

Responsibilities:

Prebuilt easing functions (easeIn, easeOut, etc.)

Optional cubic-bezier parser

lerp(from, to, progress)

Used inside AnimatableElement */

const Easing = {
  linear: (t) => t,

  easeIn: (t) => t * t,

  easeOut: (t) => t * (2 - t),

  easeInOut: (t) => {
    if (t < 0.5) return 2 * t * t;
    return -1 + (4 - 2 * t) * t;
  },

  easeOutCubic: (t) => --t * t * t + 1,

  easeInCubic: (t) => t * t * t,

  easeInOutCubic: (t) => {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  },
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },

  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  easeInQuad: (t) => t * t,

  easeOutQuad: (t) => t * (2 - t),

  easeInOutQuad: (t) => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  },

  easeOutCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),

  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),

  easeInOutCirc: (t) => {
    return t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
  },
};

// Utility for easing-based interpolation
function getEasedProgress(frame, duration, easingName = "linear") {
  const progress = Math.max(0, Math.min(frame / duration, 1));
  return Easing[easingName] ? Easing[easingName](progress) : progress;
}
