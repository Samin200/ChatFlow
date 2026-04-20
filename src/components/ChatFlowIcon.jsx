export default function ChatFlowIcon({ className = "h-10 w-10" }) {
  return (
    <span
      className={`${className} inline-flex items-center justify-center overflow-hidden rounded-full chatflow-icon-shell`}
      style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, black 8%)" }}
    >
      <img
        src="/chatflow-icon.png"
        alt="NovaLink"
        className="h-full w-full object-cover chatflow-brand-icon"
        draggable={false}
        loading="eager"
      />
    </span>
  );
}
