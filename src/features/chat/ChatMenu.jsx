import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export default function ChatMenu({ items = [], menuClassName = "", buttonClassName = "" }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState("bottom");
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const button = buttonRef.current;
    const buttonRect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const menuHeight = items.length * 40 + 16;
    const spaceAbove = buttonRect.top;

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      setMenuPosition("top");
    } else {
      setMenuPosition("bottom");
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

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative z-[100]" ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className={`p-2 rounded-xl transition-all ${buttonClassName}`}
        style={{
          color: "var(--color-text-muted)",
          backgroundColor: open ? "color-mix(in srgb, var(--color-surface) 86%, transparent)" : "transparent",
        }}
        aria-label="Open menu"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open && (
        <div
          className={`absolute ${menuPosition === "top" ? "bottom-full mb-2" : "top-full mt-2"} right-0 z-[9999] min-w-44 rounded-xl border p-1 shadow-xl animate-reaction-pop ${menuClassName}`}
          style={{
            borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--color-surface) 94%, black 6%)",
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                color: item.danger ? "#fb7185" : "var(--color-text)",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = item.danger
                  ? "color-mix(in srgb, #fb7185 14%, transparent)"
                  : "color-mix(in srgb, var(--color-surface) 86%, var(--color-accent) 14%)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}