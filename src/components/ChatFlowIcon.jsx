export default function ChatFlowIcon({ className = "h-10 w-10" }) {
  return (
    <span
      className={`${className} inline-flex items-center justify-center overflow-hidden rounded-full transition-all duration-500 chatflow-icon-shell shadow-lg`}
    >
      <img
        src="/chatflow-icon.png"
        alt="ChatFlow"
        className="h-full w-full object-cover transition-all duration-500 chatflow-brand-icon"
        style={{ 
          filter: "drop-shadow(0 0 2px rgba(0,0,0,0.1)) brightness(var(--logo-brightness, 1))" 
        }}
        draggable={false}
        loading="eager"
      />
    </span>
  );
}
