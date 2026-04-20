export default function ChatFlowIcon({ className = "h-10 w-10" }) {
  return (
    <span
      className={`${className} inline-flex items-center justify-center overflow-hidden rounded-full chatflow-icon-shell relative`}
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
          filter: "drop-shadow(0 0 12px var(--color-primary)) hue-rotate(var(--icon-hue, 0deg)) saturate(var(--icon-sat, 1))"
        }}
      />
      {/* Theme color overlay - tints the PNG toward primary color */}
      <span 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: "var(--color-primary)",
          opacity: 0.3,
          mixBlendMode: "overlay",
        }}
      />
    </span>
  );
}