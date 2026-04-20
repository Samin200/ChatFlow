import { useMemo } from "react";

export default function ChatFlowIcon({ className = "h-10 w-10" }) {
  // Generate dynamic filter based on CSS variable --color-primary
  // Uses mix-blend-mode and filters to tint the PNG with the theme color
  const iconStyle = useMemo(() => ({
    filter: `
      drop-shadow(0 0 12px color-mix(in srgb, var(--color-primary) 60%, transparent))
      brightness(1.1)
      saturate(1.2)
    `,
    // Use mix-blend-mode to blend the image with a color overlay
    mixBlendMode: "normal",
  }), []);

  return (
    <span
      className={`${className} inline-flex items-center justify-center overflow-hidden rounded-full chatflow-icon-shell relative`}
      style={{ 
        backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, black 8%)",
        boxShadow: "0 0 24px color-mix(in srgb, var(--color-primary) 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)"
      }}
    >
      {/* Base image */}
      <img
        src="/chatflow-icon.png"
        alt="ChatFlow"
        className="h-full w-full object-cover chatflow-brand-icon relative z-10"
        draggable={false}
        loading="eager"
        style={iconStyle}
      />
      {/* Color overlay layer that tints with primary color */}
      <span 
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          backgroundColor: "var(--color-primary)",
          opacity: 0.15,
          mixBlendMode: "color",
        }}
      />
    </span>
  );
}