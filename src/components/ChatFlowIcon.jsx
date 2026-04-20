import { useEffect, useRef, useState } from "react";

// Convert hex to HSL hue value
function hexToHue(hex) {
  if (!hex || hex.length < 7) return 0;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  let h;
  const d = max - min;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return Math.round(h * 360);
}

// The original icon's base hue (blue ~220deg). Adjust if your PNG is different.
const BASE_HUE = 220;

export default function ChatFlowIcon({ className = "h-10 w-10" }) {
  const ref = useRef(null);
  const [hueShift, setHueShift] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const primary = getComputedStyle(el).getPropertyValue("--color-primary").trim();
      if (primary && primary.startsWith("#")) {
        const targetHue = hexToHue(primary);
        setHueShift(targetHue - BASE_HUE);
      }
    };

    update();

    // Observe changes to CSS variables
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={`${className} inline-flex items-center justify-center overflow-hidden rounded-full chatflow-icon-shell`}
      style={{ 
        backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, black 8%)",
        boxShadow: "0 0 20px color-mix(in srgb, var(--color-primary) 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.1)"
      }}
    >
      <img
        src="/chatflow-icon.png"
        alt="ChatFlow"
        className="h-full w-full object-cover chatflow-brand-icon"
        draggable={false}
        loading="eager"
        style={{
          filter: `hue-rotate(${hueShift}deg) drop-shadow(0 0 8px var(--color-primary))`
        }}
      />
    </span>
  );
}