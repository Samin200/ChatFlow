export default function ChatFlowIcon({ className = "h-10 w-10" }) {
  return (
    <span
      className={`${className} inline-flex items-center justify-center overflow-hidden rounded-full chatflow-icon-shell`}
      style={{ 
        backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, black 8%)",
        boxShadow: "0 0 20px color-mix(in srgb, var(--color-primary) 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.1)"
      }}
    >
      {/* SVG Icon that uses currentColor to adapt to theme */}
      <svg 
        viewBox="0 0 100 100" 
        className="h-full w-full"
        style={{ color: "var(--color-primary)" }}
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "currentColor", stopOpacity: 0.9 }} />
            <stop offset="100%" style={{ stopColor: "currentColor", stopOpacity: 0.7 }} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main circle background */}
        <circle 
          cx="50" 
          cy="50" 
          r="45" 
          fill="url(#iconGradient)"
          filter="url(#glow)"
        />
        
        {/* Chat bubble shape */}
        <path 
          d="M30 35 Q30 25 40 25 L65 25 Q75 25 75 35 L75 55 Q75 65 65 65 L45 65 L35 75 L35 65 L30 65 Q30 65 30 55 Z"
          fill="var(--color-surface)"
          opacity="0.95"
        />
        
        {/* Message lines inside bubble */}
        <rect x="40" y="38" width="25" height="4" rx="2" fill="currentColor" opacity="0.6" />
        <rect x="40" y="46" width="18" height="4" rx="2" fill="currentColor" opacity="0.4" />
      </svg>
    </span>
  );
}