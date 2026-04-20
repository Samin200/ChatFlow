export default function ChatFlowIcon({ className = "h-10 w-10" }) {
  return (
    <span
      className={`${className} inline-flex items-center justify-center overflow-hidden rounded-full chatflow-icon-shell`}
      style={{ 
        backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, black 8%)",
        boxShadow: "0 0 20px color-mix(in srgb, var(--color-primary) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.1)"
      }}
    >
      <img
        src="/chatflow-icon.png"
        alt="ChatFlow"
        className="h-full w-full object-cover chatflow-brand-icon"
        draggable={false}
        loading="eager"
        style={{
          filter: "drop-shadow(0 0 8px color-mix(in srgb, var(--color-primary) 50%, transparent))"
        }}
      />
    </span>
  );
}