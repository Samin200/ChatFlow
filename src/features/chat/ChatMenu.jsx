import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export default function ChatMenu({ items = [], menuClassName = "", buttonClassName = "" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: "100%", left: "auto" });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const menuHeight = items.length * 40 + 20;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;

    if (spaceBelow < menuHeight && rect.top > spaceBelow) {
      setPosition({ top: "auto", bottom: "100%" });
    } else {
      setPosition({ top: "100%", bottom: "auto" });
    }
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="inline-block relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`p-2 rounded-full transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 ${buttonClassName}`}
        style={{
          color: "var(--color-text-muted)",
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
        }}
        aria-label="Open menu"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open && (
        <ul
          tabIndex={-1}
          className={`absolute w-56 rounded-2xl border border-white/10 shadow-2xl overflow-hidden pointer-events-auto right-0 ${menuClassName}`}
          style={{
            zIndex: 9999,
            backgroundColor: "color-mix(in srgb, var(--color-surface) 96%, black 4%)",
            ...position,
          }}
        >
          {items.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors cursor-pointer pointer-events-auto ${
                  item.danger
                    ? "text-rose-400 hover:bg-rose-500/10"
                    : "text-[var(--color-text)] hover:bg-white/7"
                }`}
              >
                {item.icon && <item.icon className="w-4 h-4" style={{ color: item.danger ? undefined : "var(--color-text-muted)" }} />}
                <span className="text-[1.05rem] leading-none">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}